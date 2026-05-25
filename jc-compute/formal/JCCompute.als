
module jccompute

sig Event {
  parent: lone Event
}

fact Acyclic {
  no e: Event | e in e.^parent
}

assert AppendOnly {
  all e: Event | no e.parent or one e.parent
}

check AppendOnly for 10
