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
