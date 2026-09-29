import time
from os_ken.base import app_manager
from os_ken.controller import ofp_event
from os_ken.controller.handler import (
    CONFIG_DISPATCHER,
    MAIN_DISPATCHER,
    DEAD_DISPATCHER,
    set_ev_cls
)
from os_ken.ofproto import ofproto_v1_3
from os_ken.lib.packet import packet
from os_ken.lib.packet import ethernet
from os_ken.lib import hub

class CornerstoneController(app_manager.OSKenApp):

    OFP_VERSIONS = [ofproto_v1_3.OFP_VERSION]
    TRAFFIC_THRESHOLD = 1000


    def __init__(self, *args, **kwargs):
        super(CornerstoneController, self).__init__(*args, **kwargs)

        # MAC address table
        self.mac_to_port = {}

        # Store connected switches
        self.datapaths = {}

        # Store previous flow statistics
        self.previous_stats = {}

        # Store flows that have already been mitigated
        self.mitigated_flows = set()

        # Start monitoring thread
        self.monitor_thread = hub.spawn(self._monitor)

    @set_ev_cls(
        ofp_event.EventOFPSwitchFeatures,
        CONFIG_DISPATCHER
    )
    def switch_features_handler(self, ev):

        datapath = ev.msg.datapath
        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        print(
            f"Switch connected! "
            f"Datapath ID: {datapath.id}"
        )

        # Table-miss flow
        match = parser.OFPMatch()

        actions = [
            parser.OFPActionOutput(
                ofproto.OFPP_CONTROLLER,
                ofproto.OFPCML_NO_BUFFER
            )
        ]

        instructions = [
            parser.OFPInstructionActions(
                ofproto.OFPIT_APPLY_ACTIONS,
                actions
            )
        ]

        flow_mod = parser.OFPFlowMod(
            datapath=datapath,
            priority=0,
            match=match,
            instructions=instructions
        )

        datapath.send_msg(flow_mod)

        print(
            f"Table-miss flow installed on switch {datapath.id}"
        )

    @set_ev_cls(
        ofp_event.EventOFPPacketIn,
        MAIN_DISPATCHER
    )
    def packet_in_handler(self, ev):

        msg = ev.msg
        datapath = msg.datapath

        ofproto = datapath.ofproto
        parser = datapath.ofproto_parser

        dpid = datapath.id

        # Get the switch port where packet arrived
        in_port = msg.match['in_port']

        # Parse packet
        pkt = packet.Packet(msg.data)
        eth = pkt.get_protocol(ethernet.ethernet)

        if eth is None:
            return

        src = eth.src
        dst = eth.dst

        print(
            f"Packet received: "
            f"{src} -> {dst} "
            f"on switch {dpid}, port {in_port}"
        )

        # Create MAC table for this switch
        if dpid not in self.mac_to_port:
            self.mac_to_port[dpid] = {}

        # Learn source MAC address
        self.mac_to_port[dpid][src] = in_port

        # Check whether destination is known
        if dst in self.mac_to_port[dpid]:

            out_port = self.mac_to_port[dpid][dst]

        else:

            # Destination unknown
            # Flood packet
            out_port = ofproto.OFPP_FLOOD

        actions = [
            parser.OFPActionOutput(out_port)
        ]

        # Install flow when destination is known
        if out_port != ofproto.OFPP_FLOOD:

            match = parser.OFPMatch(
                in_port=in_port,
                eth_dst=dst
            )

            instructions = [
                parser.OFPInstructionActions(
                    ofproto.OFPIT_APPLY_ACTIONS,
                    actions
                )
            ]

            flow_mod = parser.OFPFlowMod(
                datapath=datapath,
                priority=10,
                match=match,
                instructions=instructions
            )

            datapath.send_msg(flow_mod)

        # Send packet out
        out = parser.OFPPacketOut(
            datapath=datapath,
            buffer_id=msg.buffer_id,
            in_port=in_port,
            actions=actions,
            data=msg.data
        )

        datapath.send_msg(out)

    @set_ev_cls(
        ofp_event.EventOFPStateChange,
        [MAIN_DISPATCHER, DEAD_DISPATCHER]
    )
    def state_change_handler(self, ev):

        datapath = ev.datapath

        if ev.state == MAIN_DISPATCHER:

            if datapath.id not in self.datapaths:

                self.datapaths[datapath.id] = datapath

                print(
                    f"Switch registered for monitoring: "
                    f"{datapath.id}"
                )

        elif ev.state == DEAD_DISPATCHER:

            if datapath.id in self.datapaths:

                del self.datapaths[datapath.id]

                print(
                    f"Switch removed from monitoring: "
                    f"{datapath.id}"
                )

    def _monitor(self):

        while True:

            # Check all connected switches
            for datapath in self.datapaths.values():

                self._request_flow_stats(datapath)

            hub.sleep(5)
        
    def _request_flow_stats(self, datapath):

        parser = datapath.ofproto_parser

        # Create a request for flow statistics
        request = parser.OFPFlowStatsRequest(datapath)

        # Send request to the switch
        datapath.send_msg(request)

        print(
            f"Flow statistics requested from switch "
            f"{datapath.id}"
        )

    @set_ev_cls(
        ofp_event.EventOFPFlowStatsReply,
        MAIN_DISPATCHER
    )
    def flow_stats_reply_handler(self, ev):

        datapath = ev.msg.datapath
        stats = ev.msg.body

        print(
            f"\n===== FLOW STATISTICS - SWITCH {datapath.id} ====="
        )

        for stat in stats:

            current_bytes = stat.byte_count
            current_packets = stat.packet_count

            # Create a unique key for this flow
            # Create a unique key for this flow
            flow_key = (
                datapath.id,
                stat.priority,
                str(stat.match)
            )

            current_time = time.time()

            # Check whether we have seen this flow before
            if flow_key in self.previous_stats:

                previous_bytes, previous_time = self.previous_stats[flow_key]

                byte_difference = current_bytes - previous_bytes
                time_difference = current_time - previous_time

                # Avoid division by zero
                if time_difference > 0:
                    traffic_rate = byte_difference / time_difference
                else:
                    traffic_rate = 0

                print(
                    f"DEBUG | Previous Bytes: {previous_bytes} | "
                    f"Current Bytes: {current_bytes} | "
                    f"Difference: {byte_difference} | "
                    f"Time: {time_difference:.2f}s"
                )

                if byte_difference > 0:

                    print(
                        f"Priority: {stat.priority} | "
                        f"Packets: {current_packets} | "
                        f"Bytes: {current_bytes} | "
                        f"New Bytes: {byte_difference} | "
                        f"Traffic Rate: {traffic_rate:.2f} bytes/sec"
                    )

                    if traffic_rate > self.TRAFFIC_THRESHOLD:
                        print(
                            f"⚠ HIGH TRAFFIC DETECTED! "
                            f"Switch {datapath.id} | "
                            f"Rate: {traffic_rate:.2f} bytes/sec"
                        )

                        # Check whether this flow was already mitigated
                        if flow_key not in self.mitigated_flows:

                            print(
                                f"🚫 MITIGATION ACTION: Blocking high-traffic flow "
                                f"on switch {datapath.id}"
                            )

                            self._block_flow(datapath, stat.match, stat.priority)

                            self.mitigated_flows.add(flow_key)
                    else:
                        print(
                            f"✓ Normal traffic | "
                            f"Rate: {traffic_rate:.2f} bytes/sec"
                        )

            else:

                print(
                    f"Priority: {stat.priority} | "
                    f"Packets: {current_packets} | "
                    f"Bytes: {current_bytes} | "
                    f"New Bytes: First measurement"
                )

            # Store bytes AND timestamp for next measurement
            self.previous_stats[flow_key] = (
                current_bytes,
                current_time
            )
     
    
    def _block_flow(self, datapath, match, priority):

        parser = datapath.ofproto_parser
        ofproto = datapath.ofproto

        # Create a flow rule with NO actions.
        # No action means the matching packets are dropped.
        drop_rule = parser.OFPFlowMod(
            datapath=datapath,
            priority=priority + 100,
            match=match,
            instructions=[]
        )

        datapath.send_msg(drop_rule)

        print(
            f"🚫 Flow blocked on switch {datapath.id}"
        )
