import { Event } from '../types';
import { CapabilityManager } from './capability';

export class AuthorityGuard {
  constructor(private readonly capabilities: CapabilityManager) {}

  assertEventAuthorized<E>(event: Event<E>): void {
    if (!this.capabilities.validateEvent(event)) {
      throw new Error(`Event ${event.id} is not authorized`);
    }
  }

  filterAuthorized<E>(events: Event<E>[]): Event<E>[] {
    return events.filter(event => this.capabilities.validateEvent(event));
  }
}
