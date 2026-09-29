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

    def __init__(self, *args, **kwargs):
        super(CornerstoneController, self).__init__(*args, **kwargs)

        # MAC address table
        self.mac_to_port = {}

        # Store connected switches
        self.datapaths = {}

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

            print(
                f"Priority: {stat.priority} | "
                f"Packets: {stat.packet_count} | "
                f"Bytes: {stat.byte_count} | "
                f"Duration: {stat.duration_sec}s"
            )