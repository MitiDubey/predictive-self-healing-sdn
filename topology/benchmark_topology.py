from mininet.topo import Topo
from mininet.link import TCLink


class BenchmarkTopology(Topo):

    def build(self):

        # Hosts
        h1 = self.addHost('h1')
        h4 = self.addHost('h4')

        # Switches
        s1 = self.addSwitch('s1')
        s2 = self.addSwitch('s2')

        # Links with controlled bandwidth
        self.addLink(
            h1, s1,
            cls=TCLink,
            bw=10
        )

        self.addLink(
            s1, s2,
            cls=TCLink,
            bw=10
        )

        self.addLink(
            s2, h4,
            cls=TCLink,
            bw=10
        )


topos = {
    'benchmark': lambda: BenchmarkTopology()
}

