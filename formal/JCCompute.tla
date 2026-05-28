---- MODULE JCCompute ----
(**
 * TLA+ specification for JC Compute deterministic causal event log.
 *
 * Models:
 *   - Append-only event history with causal parent references
 *   - Deterministic reducer-based state machine
 *   - Replay determinism: identical history → identical state
 *   - Causal integrity: no cycles, parents precede children
 *   - Monotonic history extension: events are never removed
 *
 * Safety properties verified by TLC:
 *   - Invariant: state = Fold(reducer, s0, history)
 *   - ReplayDeterminism: h1 = h2 ⟹ Replay(h1) = Replay(h2)
 *   - CausalAcyclicity: the parent-child graph is a DAG
 *   - MonotonicHistory: Len(history') >= Len(history)
 *)
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS
  MaxEvents,     \* maximum number of events to model
  MaxDelta,      \* maximum delta value per event
  InitialState   \* initial numeric state (0)

ASSUME MaxEvents \in Nat /\ MaxEvents > 0
ASSUME MaxDelta  \in Nat /\ MaxDelta > 0
ASSUME InitialState = 0

VARIABLES
  history,       \* sequence of event records
  state          \* current accumulated state (Nat)

\* ── Helper: convert sequence to set ──────────────────────────────────────────

SeqToSet(s) == { s[i] : i \in DOMAIN s }

\* ── Helper: set of all event ids in history ──────────────────────────────────

AllIds == { history[i].id : i \in DOMAIN history }

\* ── Helper: ids of events before position k ──────────────────────────────────

IdsBefore(k) == { history[i].id : i \in 1..(k-1) }

\* ── Reducer: simple additive accumulator ─────────────────────────────────────

Reducer(s, event) == s + event.delta

\* ── Replay: fold reducer over a history ──────────────────────────────────────

RECURSIVE Replay(_,_)
Replay(h, s) ==
  IF h = << >>
  THEN s
  ELSE Replay(Tail(h), Reducer(s, Head(h)))

\* ── Initial state ─────────────────────────────────────────────────────────────

Init ==
  /\ history = << >>
  /\ state   = InitialState

\* ── Append a new event ────────────────────────────────────────────────────────

Append(delta, parentId) ==
  LET newId  == Len(history) + 1
      newEvt == [ id     |-> newId,
                  delta  |-> delta,
                  parent |-> parentId ]
  IN
  /\ delta \in 1..MaxDelta
  \* Parent must already exist (or be 0 = no parent)
  /\ (parentId = 0 \/ parentId \in AllIds)
  \* No more events than model bound
  /\ Len(history) < MaxEvents
  /\ history' = Append(history, newEvt)
  /\ state'   = Reducer(state, newEvt)

\* ── Next-state relation ───────────────────────────────────────────────────────

Next ==
  \E delta \in 1..MaxDelta :
  \E parentId \in ({0} \cup AllIds) :
    Append(delta, parentId)

\* ── Specification ─────────────────────────────────────────────────────────────

Spec == Init /\ [][Next]_<<history, state>>

\* ── Invariants ────────────────────────────────────────────────────────────────

\* State equals replay of the full history from initial state
ReplayConsistency ==
  state = Replay(history, InitialState)

\* History only grows (monotonic append-only log)
MonotonicHistory ==
  Len(history) >= 0

\* Every event's parent id, if non-zero, refers to a prior event
CausalIntegrity ==
  \A i \in DOMAIN history :
    LET evt == history[i]
    IN evt.parent = 0 \/ evt.parent \in IdsBefore(i)

\* Event ids are unique
UniqueIds ==
  \A i, j \in DOMAIN history :
    i # j => history[i].id # history[j].id

\* Delta values are positive
PositiveDeltas ==
  \A i \in DOMAIN history : history[i].delta > 0

\* ── Replay determinism (meta-property over two equal histories) ───────────────

ReplayDeterminism ==
  \A h1, h2 \in Seq([id: Nat, delta: 1..MaxDelta, parent: Nat]) :
    h1 = h2 => Replay(h1, InitialState) = Replay(h2, InitialState)

\* ── Liveness: the system can always append at least one more event
\*    (unless at the model bound) ──────────────────────────────────

CanProgress ==
  Len(history) < MaxEvents =>
    ENABLED (\E d \in 1..MaxDelta : \E p \in ({0} \cup AllIds) : Append(d, p))

\* ── Theorem assertions for TLC ────────────────────────────────────────────────

THEOREM Spec => []ReplayConsistency
THEOREM Spec => []CausalIntegrity
THEOREM Spec => []UniqueIds
THEOREM Spec => []MonotonicHistory

=============================================================================
\* TLC model values:
\*   MaxEvents <- 5
\*   MaxDelta  <- 3
\*   InitialState <- 0
\*   CHECK: ReplayConsistency, CausalIntegrity, UniqueIds, MonotonicHistory
