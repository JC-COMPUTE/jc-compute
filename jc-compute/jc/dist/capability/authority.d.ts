import { Event } from '../types';
import { CapabilityManager } from './capability';
export declare class AuthorityGuard {
    private readonly capabilities;
    constructor(capabilities: CapabilityManager);
    assertEventAuthorized<E>(event: Event<E>): void;
    filterAuthorized<E>(events: Event<E>[]): Event<E>[];
}
//# sourceMappingURL=authority.d.ts.map