from collections import deque


class PathManager:
    """Calculate routes using currently available switch links."""

    def __init__(self):
        self.links = {
            (1, 2),
            (2, 4),
            (1, 3),
            (3, 4),
        }

    def add_link(self, a, b):
        """Mark a link as available."""
        self.links.add(tuple(sorted((a, b))))

    def remove_link(self, a, b):
        """Mark a link as failed."""
        self.links.discard(tuple(sorted((a, b))))

    def shortest_path(self, source, destination):
        """Return a shortest path, or None if no route exists."""

        graph = {}

        for a, b in self.links:
            graph.setdefault(a, []).append(b)
            graph.setdefault(b, []).append(a)

        queue = deque([(source, [source])])
        visited = {source}

        while queue:
            current, path = queue.popleft()

            if current == destination:
                return path

            for neighbour in sorted(graph.get(current, [])):
                if neighbour not in visited:
                    visited.add(neighbour)
                    queue.append(
                        (neighbour, path + [neighbour])
                    )

        return None

    def has_link(self, a, b):
        """Return whether both endpoints currently have the link available."""
        return tuple(sorted((a, b))) in self.links
