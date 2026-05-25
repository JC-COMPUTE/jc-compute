export class LiveSyncEngine {
  synchronize(eventsA: string[], eventsB: string[]) {
    return [...new Set([...eventsA, ...eventsB])];
  }

  deterministicHash(events: string[]) {
    return events.join(':');
  }
}
