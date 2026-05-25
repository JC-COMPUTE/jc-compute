/**
 * Capability System - Authority and Permission Management
 */

import { CapabilityContext, CapabilityGrant, Event } from '../types';

/**
 * CapabilityManager - Manage capabilities and authority
 */
export class CapabilityManager {
  private grants: Map<string, CapabilityGrant> = new Map();
  private revoked: Set<string> = new Set();

  /**
   * Create a capability grant
   */
  createGrant(grant: CapabilityGrant): void {
    if (this.grants.has(grant.grantId)) {
      throw new Error(`Grant ${grant.grantId} already exists`);
    }
    this.grants.set(grant.grantId, grant);
  }

  /**
   * Revoke a capability grant
   */
  revokeGrant(grantId: string): void {
    if (!this.grants.has(grantId)) {
      throw new Error(`Grant ${grantId} does not exist`);
    }
    this.revoked.add(grantId);
  }

  /**
   * Check if a principal has a capability
   */
  hasCapability(
    principal: string,
    capability: string,
    context?: Record<string, any>
  ): boolean {
    for (const [grantId, grant] of this.grants) {
      // Skip revoked grants
      if (this.revoked.has(grantId)) continue;

      // Check expiration
      if (grant.expiresAt && grant.expiresAt < Date.now()) continue;

      // Check if granted to principal
      if (grant.grantedTo !== principal) continue;

      // Check if capability is granted
      if (!grant.capabilities.includes(capability)) continue;

      // Check constraints if provided
      if (grant.constraints && context) {
        if (!this.matchesConstraints(context, grant.constraints)) continue;
      }

      return true;
    }

    return false;
  }

  /**
   * Validate that an event has necessary capabilities
   */
  validateEvent<T>(event: Event<T>): boolean {
    if (!event.capability || !event.principal) {
      return false;
    }

    for (const capability of event.capability.capabilities) {
      if (!this.hasCapability(event.principal, capability, event.metadata)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get all grants for a principal
   */
  getGrantsForPrincipal(principal: string): CapabilityGrant[] {
    const grants: CapabilityGrant[] = [];

    for (const [grantId, grant] of this.grants) {
      if (this.revoked.has(grantId)) continue;
      if (grant.expiresAt && grant.expiresAt < Date.now()) continue;
      if (grant.grantedTo === principal) {
        grants.push(grant);
      }
    }

    return grants;
  }

  /**
   * Get all active capabilities for a principal
   */
  getCapabilitiesForPrincipal(principal: string): string[] {
    const capabilities = new Set<string>();
    const grants = this.getGrantsForPrincipal(principal);

    for (const grant of grants) {
      for (const cap of grant.capabilities) {
        capabilities.add(cap);
      }
    }

    return Array.from(capabilities);
  }

  /**
   * Check if constraints match context
   */
  private matchesConstraints(
    context: Record<string, any>,
    constraints: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(constraints)) {
      if (context[key] !== value) {
        return false;
      }
    }
    return true;
  }

  /**
   * Create a capability context
   */
  static createContext(
    capabilities: string[],
    principal: string,
    options?: {
      scope?: string[];
      constraints?: Record<string, any>;
    }
  ): CapabilityContext {
    return {
      capabilities,
      principal,
      scope: options?.scope,
      constraints: options?.constraints
    };
  }

  /**
   * Clear all grants
   */
  clear(): void {
    this.grants.clear();
    this.revoked.clear();
  }
}

/**
 * Standard capability definitions
 */
export const StandardCapabilities = {
  // State mutation
  READ: 'state:read',
  WRITE: 'state:write',
  DELETE: 'state:delete',

  // Event operations
  EMIT_EVENT: 'event:emit',
  READ_HISTORY: 'event:read',
  REPLAY: 'event:replay',

  // Administrative
  GRANT_CAPABILITY: 'admin:grant',
  REVOKE_CAPABILITY: 'admin:revoke',
  MANAGE_PRINCIPALS: 'admin:principals',

  // Network operations
  SYNC: 'network:sync',
  BROADCAST: 'network:broadcast',
  RECEIVE: 'network:receive'
} as const;

/**
 * Capability builder for fluent API
 */
export class CapabilityBuilder {
  private capabilities: string[] = [];
  private principal = '';
  private scope?: string[];
  private constraints?: Record<string, any>;

  /**
   * Add a capability
   */
  addCapability(capability: string): this {
    this.capabilities.push(capability);
    return this;
  }

  /**
   * Set principal
   */
  setPrincipal(principal: string): this {
    this.principal = principal;
    return this;
  }

  /**
   * Set scope
   */
  setScope(scope: string[]): this {
    this.scope = scope;
    return this;
  }

  /**
   * Set constraints
   */
  setConstraints(constraints: Record<string, any>): this {
    this.constraints = constraints;
    return this;
  }

  /**
   * Build the capability context
   */
  build(): CapabilityContext {
    if (!this.principal) {
      throw new Error('Principal is required');
    }

    if (this.capabilities.length === 0) {
      throw new Error('At least one capability is required');
    }

    return {
      capabilities: this.capabilities,
      principal: this.principal,
      scope: this.scope,
      constraints: this.constraints
    };
  }
}
