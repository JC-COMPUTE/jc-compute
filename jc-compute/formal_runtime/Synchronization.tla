
---- MODULE Synchronization ----
EXTENDS Naturals, Sequences

VARIABLES historyA, historyB

Init ==
  /\ historyA = << >>
  /\ historyB = << >>

Sync ==
  /\ historyA' = historyB
  /\ historyB' = historyA

Convergence ==
  historyA = historyB

=============================================================================
