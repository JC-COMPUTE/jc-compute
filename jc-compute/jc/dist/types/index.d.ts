export interface CausalRef {
    eventId: string;
    relation?: 'parent' | 'dependency' | 'merge' | 'fork';
    reason?: string;
    metadata?: Record<string, unknown>;
}
export interface CapabilityContext {
    capabilities: string[];
    principal: string;
    scope?: string[];
    constraints?: Record<string, unknown>;
}
export interface CapabilityGrant {
    grantId: string;
    capabilities: string[];
    grantedBy: string;
    grantedTo: string;
    expiresAt?: number;
    constraints?: Record<string, unknown>;
}
export interface Event<T = unknown> {
    id: string;
    type: string;
    payload: T;
    timestamp?: number;
    hash?: string;
    signature?: string;
    parentEventId?: string;
    parentEventIds?: string[];
    causality?: CausalRef[];
    capability?: CapabilityContext;
    principal?: string;
    reducerTarget?: string;
    metadata?: Record<string, unknown>;
}
export interface ExecutionContext<S = unknown> {
    previousState: S;
    currentEventId: string;
    capability?: CapabilityContext;
    principal?: string;
}
export type Reducer<S, E = unknown> = (state: S, event: Event<E>, context?: ExecutionContext<S>) => S;
export interface Snapshot<S = unknown> {
    stateAtEventId: string;
    state: S;
    timestamp: number;
    hash: string;
}
export interface ReplayConfig {
    fromEventId?: string;
    toEventId?: string;
    fromIndex?: number;
    toIndex?: number;
    validateCapabilities?: boolean;
}
export interface ReplayVerification {
    valid: boolean;
    mismatchedAt?: string;
    expectedHash?: string;
    actualHash?: string;
    errors?: string[];
}
export interface ReplayResult<S = unknown> {
    state: S;
    eventsApplied: number;
    lastEventId?: string;
    verification: ReplayVerification;
}
export interface SyncMessage<E = unknown> {
    type: 'sync' | 'request' | 'response';
    events: Event<E>[];
    fromEventId?: string;
    toEventId?: string;
    nodeId: string;
    timestamp: number;
}
export interface SyncState {
    nodeId: string;
    lastSyncEventId: string;
    lastSyncTimestamp: number;
    pendingEvents: string[];
}
export interface SyncResult<S = unknown> {
    eventsSent: number;
    eventsReceived: number;
    converged: boolean;
    finalState: S;
}
export interface MergeResult<S = unknown> {
    success: boolean;
    eventsApplied: number;
    conflicts: string[];
    finalState: S;
}
export interface VerificationResult {
    verified: boolean;
    statesMatch: boolean;
    mismatchAt?: string;
    errors?: string[];
}
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export interface StateSnapshot<S = unknown> {
    state: S;
    eventId: string;
    timestamp: number;
    hash?: string;
}
export interface GraphNode<T = unknown> {
    id: string;
    event: Event<T>;
    parents: string[];
    children: string[];
    depth: number;
}
export interface SemanticRelationship {
    fromEventId: string;
    toEventId: string;
    relationType: string;
    metadata?: Record<string, unknown>;
}
//# sourceMappingURL=index.d.ts.map