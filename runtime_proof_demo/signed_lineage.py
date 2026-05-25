
import hashlib
import json

lineage = {
    "node": "alpha",
    "snapshot": "state_snapshot_v1",
    "events": list(range(100))
}

canonical = json.dumps(lineage, sort_keys=True)
lineage_hash = hashlib.sha256(canonical.encode()).hexdigest()

print("Signed Lineage Hash:", lineage_hash)
