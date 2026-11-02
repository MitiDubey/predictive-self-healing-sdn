from mininet.topo import Topo


class RedundantTopology(Topo):
    """
    Two alternative paths between s1 and s4.

    Primary: s1 -> s2 -> s4
    Backup:  s1 -> s3 -> s4
    """

    def build(self):
        # Hosts
        h1 = self.addHost("h1", ip="10.0.0.1/24")
        h2 = self.addHost("h2", ip="10.0.0.2/24")
        h3 = self.addHost("h3", ip="10.0.0.3/24")
        h4 = self.addHost("h4", ip="10.0.0.4/24")

        # Switches
        s1 = self.addSwitch("s1")
        s2 = self.addSwitch("s2")
        s3 = self.addSwitch("s3")
        s4 = self.addSwitch("s4")

        # Host connections
        self.addLink(h1, s1)
        self.addLink(h2, s1)
        self.addLink(h3, s4)
        self.addLink(h4, s4)

        # Primary route
        self.addLink(s1, s2)
        self.addLink(s2, s4)

        # Backup route
        self.addLink(s1, s3)
        self.addLink(s3, s4)


topos = {
    "redundant": lambda: RedundantTopology()
}


if __name__ == "__main__":
    from mininet.net import Mininet
    from mininet.node import RemoteController, OVSSwitch
    from mininet.cli import CLI
    from mininet.log import setLogLevel, info

    setLogLevel("info")
    info("\n*** Initializing Cornerstone Redundant Topology (s1-s4, h1-h4)\n")
    topo = RedundantTopology()
    net = Mininet(
        topo=topo,
        controller=lambda name: RemoteController(name, ip="127.0.0.1", port=6653),
        switch=lambda name: OVSSwitch(name, protocols="OpenFlow13"),
        autoSetMacs=True,
        autoStaticArp=True,
    )
    info("*** Connecting switches to Cornerstone SDN Controller (127.0.0.1:6653, OpenFlow 1.3)...\n")
    net.start()
    info("*** Mininet is ready!\n")
    info("*** To generate live traffic and see dashboard update in real-time:\n")
    info("      mininet> pingall\n")
    info("      mininet> h1 ping -c 10 h4\n")
    info("      mininet> iperf h1 h4\n")
    info("*** To trigger self-healing failover event:\n")
    info("      mininet> link s1 s2 down\n")
    info("      mininet> h1 ping -c 5 h4\n\n")
    CLI(net)
    net.stop()
