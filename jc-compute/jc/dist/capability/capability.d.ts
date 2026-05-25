/**
 * Capability System - Authority and Permission Management
 */
import { CapabilityContext, CapabilityGrant, Event } from '../types';
/**
 * CapabilityManager - Manage capabilities and authority
 */
export declare class CapabilityManager {
    private grants;
    private revoked;
    /**
     * Create a capability grant
     */
    createGrant(grant: CapabilityGrant): void;
    /**
     * Revoke a capability grant
     */
    revokeGrant(grantId: string): void;
    /**
     * Check if a principal has a capability
     */
    hasCapability(principal: string, capability: string, context?: Record<string, any>): boolean;
    /**
     * Validate that an event has necessary capabilities
     */
    validateEvent<T>(event: Event<T>): boolean;
    /**
     * Get all grants for a principal
     */
    getGrantsForPrincipal(principal: string): CapabilityGrant[];
    /**
     * Get all active capabilities for a principal
     */
    getCapabilitiesForPrincipal(principal: string): string[];
    /**
     * Check if constraints match context
     */
    private matchesConstraints;
    /**
     * Create a capability context
     */
    static createContext(capabilities: string[], principal: string, options?: {
        scope?: string[];
        constraints?: Record<string, any>;
    }): CapabilityContext;
    /**
     * Clear all grants
     */
    clear(): void;
}
/**
 * Standard capability definitions
 */
export declare const StandardCapabilities: {
    readonly READ: "state:read";
    readonly WRITE: "state:write";
    readonly DELETE: "state:delete";
    readonly EMIT_EVENT: "event:emit";
    readonly READ_HISTORY: "event:read";
    readonly REPLAY: "event:replay";
    readonly GRANT_CAPABILITY: "admin:grant";
    readonly REVOKE_CAPABILITY: "admin:revoke";
    readonly MANAGE_PRINCIPALS: "admin:principals";
    readonly SYNC: "network:sync";
    readonly BROADCAST: "network:broadcast";
    readonly RECEIVE: "network:receive";
};
/**
 * Capability builder for fluent API
 */
export declare class CapabilityBuilder {
    private capabilities;
    private principal;
    private scope?;
    private constraints?;
    /**
     * Add a capability
     */
    addCapability(capability: string): this;
    /**
     * Set principal
     */
    setPrincipal(principal: string): this;
    /**
     * Set scope
     */
    setScope(scope: string[]): this;
    /**
     * Set constraints
     */
    setConstraints(constraints: Record<string, any>): this;
    /**
     * Build the capability context
     */
    build(): CapabilityContext;
}
//# sourceMappingURL=capability.d.ts.map