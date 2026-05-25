
import hashlib
import json
import random
import time

class Node:
    def __init__(self, name):
        self.name = name
        self.events = []

    def apply(self, event):
        self.events.append(event)

    def lineage_hash(self):
        canonical = json.dumps(
            sorted(self.events, key=lambda x: x["id"]),
            separators=(",", ":"),
            sort_keys=True
        )
        return hashlib.sha256(canonical.encode()).hexdigest()

nodes = [Node(f"node-{i}") for i in range(10)]

events = [{"id": i, "value": f"event-{i}"} for i in range(100)]

for event in events:
    shuffled = nodes[:]
    random.shuffle(shuffled)

    for node in shuffled:
        time.sleep(random.uniform(0.001, 0.02))
        node.apply(event)

hashes = {}
for node in nodes:
    h = node.lineage_hash()
    hashes[h] = hashes.get(h, 0) + 1

authority = max(hashes.values())

print("Consensus Hashes:", hashes)
print("Authoritative Quorum Reached:", authority >= 7)
