import { Snapshot } from '../types';
export declare class SnapshotStore<S = unknown> {
    private snapshots;
    save(snapshot: Snapshot<S>): void;
    create(stateAtEventId: string, state: S): Snapshot<S>;
    latest(): Snapshot<S> | null;
    at(eventId: string): Snapshot<S> | null;
    all(): Snapshot<S>[];
    clear(): void;
    private hashState;
}
//# sourceMappingURL=snapshot.d.ts.map