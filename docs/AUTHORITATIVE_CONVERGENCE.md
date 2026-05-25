
# Authoritative Convergence

JC Compute uses quorum-based replay convergence.

Example:
- 10 nodes participate
- if 7 or more produce identical lineage hashes
- state becomes authoritative

Validation Inputs:
- replay hash
- snapshot hash
- lineage state
- deterministic event ordering

Supports:
- adversarial replay detection
- crash recovery
- distributed replay attestation
