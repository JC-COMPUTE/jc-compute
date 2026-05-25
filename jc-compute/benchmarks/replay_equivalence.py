
import hashlib
import json

history = [
    {"delta": 1},
    {"delta": 2},
    {"delta": 3}
]

def replay(hist):
    state = 0
    for e in hist:
        state += e["delta"]
    return state

result = replay(history)

digest = hashlib.sha256(
    json.dumps(history, sort_keys=True).encode()
).hexdigest()

print("Replay State:", result)
print("History Hash:", digest)
