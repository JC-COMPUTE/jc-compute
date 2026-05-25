# JC Compute Whitepaper

## Unified Causal Compute Stack

JC Compute is a deterministic causal computing system. It treats execution,
storage, synchronization, authority, replay, and distributed state as one
causally ordered process.

## Core Thesis

All computation can be modeled as deterministic state transformation over
immutable, causally ordered event history under explicit authority constraints.

In human terms: the system changes by remembering what happened, following
rules, and sharing the same trusted story across machines.

## Principles

1. History is append-only.
2. Same inputs produce same outputs.
3. Events carry causal references.
4. State is derived from history.
5. Replay is foundational.
6. Authority is explicit.
7. Distributed systems converge by sharing history.

## Architecture

Events enter an append-only store, pass causal validation, and are applied to
state through deterministic reducers. The replay engine can reconstruct state
from any valid history. Synchronization exchanges event history between nodes,
and convergence follows from deterministic replay.

## Why It Matters

JC Compute gives application code an auditable source of truth. Instead of
debugging only final state, operators can inspect the sequence of causes that
created it, replay it, verify it, and synchronize it across machines.
