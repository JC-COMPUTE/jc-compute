
import hashlib
import json
import random
import time

EVENT_COUNT = 10000

events = [{"id": i, "value": random.randint(0, 999999)} for i in range(EVENT_COUNT)]

start = time.time()

canonical = json.dumps(
    sorted(events, key=lambda x: x["id"]),
    separators=(",", ":"),
    sort_keys=True
)

replay_hash = hashlib.sha256(canonical.encode()).hexdigest()

elapsed = time.time() - start
snapshot_size = len(canonical.encode())

print("Replay Hash:", replay_hash)
print("Replay Cost Seconds:", round(elapsed, 6))
print("Snapshot Overhead Bytes:", snapshot_size)
print("Synchronization Latency:", round(elapsed / EVENT_COUNT, 9))
print("Memory Amplification:", round(snapshot_size / EVENT_COUNT, 2))
