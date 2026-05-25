"use strict";
/**
 * Capability System - Authority and Permission Management
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.CapabilityBuilder = exports.StandardCapabilities = exports.CapabilityManager = void 0;
/**
 * CapabilityManager - Manage capabilities and authority
 */
class CapabilityManager {
    constructor() {
        this.grants = new Map();
        this.revoked = new Set();
    }
    /**
     * Create a capability grant
     */
    createGrant(grant) {
        if (this.grants.has(grant.grantId)) {
            throw new Error(`Grant ${grant.grantId} already exists`);
        }
        this.grants.set(grant.grantId, grant);
    }
    /**
     * Revoke a capability grant
     */
    revokeGrant(grantId) {
        if (!this.grants.has(grantId)) {
            throw new Error(`Grant ${grantId} does not exist`);
        }
        this.revoked.add(grantId);
    }
    /**
     * Check if a principal has a capability
     */
    hasCapability(principal, capability, context) {
        for (const [grantId, grant] of this.grants) {
            // Skip revoked grants
            if (this.revoked.has(grantId))
                continue;
            // Check expiration
            if (grant.expiresAt && grant.expiresAt < Date.now())
                continue;
            // Check if granted to principal
            if (grant.grantedTo !== principal)
                continue;
            // Check if capability is granted
            if (!grant.capabilities.includes(capability))
                continue;
            // Check constraints if provided
            if (grant.constraints && context) {
                if (!this.matchesConstraints(context, grant.constraints))
                    continue;
            }
            return true;
        }
        return false;
    }
    /**
     * Validate that an event has necessary capabilities
     */
    validateEvent(event) {
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
    getGrantsForPrincipal(principal) {
        const grants = [];
        for (const [grantId, grant] of this.grants) {
            if (this.revoked.has(grantId))
                continue;
            if (grant.expiresAt && grant.expiresAt < Date.now())
                continue;
            if (grant.grantedTo === principal) {
                grants.push(grant);
            }
        }
        return grants;
    }
    /**
     * Get all active capabilities for a principal
     */
    getCapabilitiesForPrincipal(principal) {
        const capabilities = new Set();
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
    matchesConstraints(context, constraints) {
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
    static createContext(capabilities, principal, options) {
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
    clear() {
        this.grants.clear();
        this.revoked.clear();
    }
}
exports.CapabilityManager = CapabilityManager;
/**
 * Standard capability definitions
 */
exports.StandardCapabilities = {
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
};
/**
 * Capability builder for fluent API
 */
class CapabilityBuilder {
    constructor() {
        this.capabilities = [];
        this.principal = '';
    }
    /**
     * Add a capability
     */
    addCapability(capability) {
        this.capabilities.push(capability);
        return this;
    }
    /**
     * Set principal
     */
    setPrincipal(principal) {
        this.principal = principal;
        return this;
    }
    /**
     * Set scope
     */
    setScope(scope) {
        this.scope = scope;
        return this;
    }
    /**
     * Set constraints
     */
    setConstraints(constraints) {
        this.constraints = constraints;
        return this;
    }
    /**
     * Build the capability context
     */
    build() {
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
exports.CapabilityBuilder = CapabilityBuilder;
//# sourceMappingURL=capability.js.map