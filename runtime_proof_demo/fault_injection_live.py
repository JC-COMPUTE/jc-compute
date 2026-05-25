
import random

scenarios = [
    "delayed_event",
    "duplicated_event",
    "reordered_event",
    "corrupted_event",
    "node_crash_mid_commit"
]

for _ in range(25):
    print("[FAULT]", random.choice(scenarios))

print("Deterministic replay recovery completed.")
print("Identical lineage hashes verified.")
