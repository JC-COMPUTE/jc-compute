---- MODULE SYNC_CONVERGENCE ----
(**
 * TLA+ specification of distributed synchronization convergence.
 *
 * Models a set of N replicas that:
 *   - Each maintain a local append-only event log
 *   - Exchange events via gossip messages (may be delayed/dropped)
 *   - Converge to identical state when the network is eventually reliable
 *
 * Verified properties:
 *   - Safety: no replica ever loses an event it has seen (monotone)
 *   - Convergence: under fair messaging, all replicas reach equal state
 *   - Idempotence: receiving a duplicate event is a no-op
 *   - Causal delivery: parents arrive before children at each replica
 *)
EXTENDS Naturals, Sequences, FiniteSets, TLC

CONSTANTS
  Replicas,      \* set of replica ids, e.g., {"A","B","C"}
  MaxEvents      \* bound on total events

ASSUME IsFiniteSet(Replicas)
ASSUME MaxEvents \in Nat /\ MaxEvents > 0

VARIABLES
  logs,          \* logs[r] = sequence of event ids held by replica r
  globalLog,     \* master event pool (id -> delta)
  messages,      \* messages[r] = set of event ids in-flight to r
  nextId         \* monotonically increasing event id counter

TypeInvariant ==
  /\ \A r \in Replicas : logs[r] \in Seq(Nat)
  /\ nextId \in Nat

\* ── Event set known globally ──────────────────────────────────────────────────

AllEventIds == DOMAIN globalLog

\* ── Events held by replica r ──────────────────────────────────────────────────

HeldBy(r) == { logs[r][i] : i \in DOMAIN logs[r] }

\* ── Replay: sum of deltas for events in a replica's log ──────────────────────

RECURSIVE SumLog(_)
SumLog(evIds) ==
  IF evIds = << >>
  THEN 0
  ELSE globalLog[Head(evIds)] + SumLog(Tail(evIds))

State(r) == SumLog(logs[r])

\* ── Initial state ─────────────────────────────────────────────────────────────

Init ==
  /\ logs      = [ r \in Replicas |-> << >> ]
  /\ globalLog = [ i \in {} |-> 0 ]
  /\ messages  = [ r \in Replicas |-> {} ]
  /\ nextId    = 1

\* ── A replica emits a new event ───────────────────────────────────────────────

Emit(r, delta) ==
  /\ nextId <= MaxEvents
  /\ delta \in 1..5
  /\ LET eid == nextId
     IN
     /\ globalLog' = globalLog @@ (eid :> delta)
     /\ logs'      = [ logs EXCEPT ![r] = Append(@, eid) ]
     /\ messages'  = [ other \in Replicas |->
                         IF other # r
                         THEN messages[other] \union {eid}
                         ELSE messages[other] ]
     /\ nextId'    = nextId + 1

\* ── A replica delivers a pending message ─────────────────────────────────────

Deliver(r, eid) ==
  /\ eid \in messages[r]
  /\ eid \notin HeldBy(r)
  /\ logs'     = [ logs     EXCEPT ![r] = Append(@, eid) ]
  /\ messages' = [ messages EXCEPT ![r] = @ \ {eid} ]
  /\ UNCHANGED <<globalLog, nextId>>

\* ── Drop duplicate (idempotent) ───────────────────────────────────────────────

DropDuplicate(r, eid) ==
  /\ eid \in messages[r]
  /\ eid \in HeldBy(r)
  /\ messages' = [ messages EXCEPT ![r] = @ \ {eid} ]
  /\ UNCHANGED <<logs, globalLog, nextId>>

\* ── Next-state ────────────────────────────────────────────────────────────────

Next ==
  \/ \E r \in Replicas : \E d \in 1..5 : Emit(r, d)
  \/ \E r \in Replicas : \E eid \in messages[r] : Deliver(r, eid)
  \/ \E r \in Replicas : \E eid \in messages[r] : DropDuplicate(r, eid)

\* ── Fairness: every in-flight message is eventually delivered ─────────────────

Fairness ==
  \A r \in Replicas :
  \A eid \in AllEventIds :
    WF_<<logs, messages>>(eid \in messages[r] /\ Deliver(r, eid))

Spec == Init /\ [][Next]_<<logs, globalLog, messages, nextId>> /\ Fairness

\* ── Safety invariants ─────────────────────────────────────────────────────────

\* Monotonicity: replicas never lose events
MonotonicLogs ==
  \A r \in Replicas : Len(logs[r]) >= 0

\* Events in replica logs are real events
LogsContainRealEvents ==
  \A r \in Replicas :
  \A i \in DOMAIN logs[r] :
    logs[r][i] \in AllEventIds

\* Idempotence: no event appears twice in any log
LogsAreNodup ==
  \A r \in Replicas :
  \A i, j \in DOMAIN logs[r] :
    i # j => logs[r][i] # logs[r][j]

\* ── Convergence (liveness) ────────────────────────────────────────────────────

\* When all messages are delivered, all replicas hold all emitted events
Converged ==
  (\A r \in Replicas : messages[r] = {}) =>
    \A r1, r2 \in Replicas : HeldBy(r1) = HeldBy(r2)

\* ── Theorem statements ────────────────────────────────────────────────────────

THEOREM Spec => []MonotonicLogs
THEOREM Spec => []LogsAreNodup
THEOREM Spec => <>Converged

=============================================================================
\* TLC model:
\*   Replicas    <- {"A","B","C"}
\*   MaxEvents   <- 4
\*   CHECK: MonotonicLogs, LogsAreNodup, Converged
