from mininet.topo import Topo


class BasicTopology(Topo):

    def build(self):

        # Create hosts
        h1 = self.addHost('h1')
        h2 = self.addHost('h2')
        h3 = self.addHost('h3')
        h4 = self.addHost('h4')

        # Create switches
        s1 = self.addSwitch('s1')
        s2 = self.addSwitch('s2')

        # Connect hosts to switches
        self.addLink(h1, s1)
        self.addLink(h2, s1)

        self.addLink(h3, s2)
        self.addLink(h4, s2)

        # Connect the switches
        self.addLink(s1, s2)


topos = {
    'basic': lambda: BasicTopology()
}