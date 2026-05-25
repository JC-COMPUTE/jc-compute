import { EventHasher, EventValidator } from '../core/event';
import { Event, ReplayVerification } from '../types';

export class ReplayVerifier {
  static verifyEvents<E>(events: Event<E>[]): ReplayVerification {
    const errors: string[] = [];
    const seen = new Set<string>();

    for (const event of events) {
      if (!EventValidator.validateStructure(event)) {
        errors.push(`Invalid event structure: ${event.id}`);
      }

      const expectedHash = EventHasher.hash(event);
      if (event.hash && event.hash !== expectedHash) {
        return {
          valid: false,
          mismatchedAt: event.id,
          expectedHash,
          actualHash: event.hash,
          errors: [`Hash mismatch for event ${event.id}`]
        };
      }

      for (const parentId of EventValidator.getParentIds(event)) {
        if (!seen.has(parentId)) {
          errors.push(`Missing or future causal parent ${parentId} for event ${event.id}`);
        }
      }

      seen.add(event.id);
    }

    return { valid: errors.length === 0, errors };
  }
}
