# Cornerstone Viva Preparation

1. **Why use SDN?**  
   The control plane is centralized, so forwarding behavior can be observed
   and updated consistently.
2. **What does OpenFlow provide?**  
   A protocol for the controller to inspect switch state and install flow
   matches, instructions, and actions.
3. **Why OpenFlow 1.3?**  
   It supports the match fields and flow-statistics messages used by the
   controller.
4. **What does OS-Ken do?**  
   It provides the event-driven controller application framework and OpenFlow
   protocol support.
5. **What are the ML features?**  
   Packet count, byte count, traffic rate, and switch identifier.
6. **Why is confidence checked?**  
   A prediction below the configured confidence threshold is observed but does
   not trigger mitigation.
7. **How are false positives limited?**  
   Mitigation requires three consecutive high-confidence observations and is
   restricted to the approved h1-h4 TCP iperf flow.
8. **How is a link failure detected?**  
   The controller handles OpenFlow port-status events and logs the endpoint,
   port, status, and reason.
9. **How is the alternate route selected?**  
   The failed switch edge is removed from the graph and a deterministic BFS
   selects the shortest available route.
10. **How is recovery verified?**  
    Bidirectional flow rules are sent to connected switches and the expected
    rule count is recorded, followed by a Mininet ping/iperf check.
11. **What is recovery time?**  
    The elapsed time between port-failure event handling and completion of
    alternate-rule installation.
12. **What evidence should be shown?**  
    Port-status log, alternate path, before/after flow tables, ping/iperf
    output, recovery CSV, and generated plots.
