/**
 * Client Definitions for Sales Game
 *
 * Clients are organized by territory with varying difficulty.
 */

import type { Client, Territory } from './types';

// ============================================================================
// First Client Templates (Phase 3)
// ============================================================================

/**
 * First client templates by territory
 * These are easier clients to learn the negotiation system
 */
export const FIRST_CLIENTS: Record<Territory, Omit<Client, 'dealValue' | 'active'>[]> = {
  tech: [
    {
      name: 'StartupBot Inc.',
      territory: 'tech',
      patience: 5,
      maxPatience: 5,
      budget: 3000,
      resistance: 12,
    },
    {
      name: 'CodeCraft Solutions',
      territory: 'tech',
      patience: 6,
      maxPatience: 6,
      budget: 2500,
      resistance: 11,
    },
    {
      name: 'DataFlow Systems',
      territory: 'tech',
      patience: 4,
      maxPatience: 4,
      budget: 3500,
      resistance: 13,
    },
  ],
  retail: [
    {
      name: 'Main Street Goods',
      territory: 'retail',
      patience: 6,
      maxPatience: 6,
      budget: 2500,
      resistance: 11,
    },
    {
      name: 'Corner Shop Network',
      territory: 'retail',
      patience: 5,
      maxPatience: 5,
      budget: 2800,
      resistance: 12,
    },
    {
      name: 'Family Mart Chain',
      territory: 'retail',
      patience: 7,
      maxPatience: 7,
      budget: 2200,
      resistance: 10,
    },
  ],
  finance: [
    {
      name: 'Regional Credit Union',
      territory: 'finance',
      patience: 4,
      maxPatience: 4,
      budget: 3200,
      resistance: 13,
    },
    {
      name: 'Prudent Advisors LLC',
      territory: 'finance',
      patience: 5,
      maxPatience: 5,
      budget: 3000,
      resistance: 12,
    },
    {
      name: 'Capital Partners Group',
      territory: 'finance',
      patience: 5,
      maxPatience: 5,
      budget: 3500,
      resistance: 14,
    },
  ],
};

// ============================================================================
// Whale Client Templates (Phase 8)
// ============================================================================

/**
 * Whale client templates by territory
 * These are high-stakes clients with bigger budgets
 */
export const WHALE_CLIENTS: Record<Territory, Omit<Client, 'dealValue' | 'active'>[]> = {
  tech: [
    {
      name: 'MegaCorp Technologies',
      territory: 'tech',
      patience: 7,
      maxPatience: 7,
      budget: 6000,
      resistance: 14,
    },
    {
      name: 'Quantum Systems International',
      territory: 'tech',
      patience: 6,
      maxPatience: 6,
      budget: 7000,
      resistance: 15,
    },
    {
      name: 'CloudNine Enterprises',
      territory: 'tech',
      patience: 8,
      maxPatience: 8,
      budget: 5500,
      resistance: 13,
    },
  ],
  retail: [
    {
      name: 'National Retail Holdings',
      territory: 'retail',
      patience: 8,
      maxPatience: 8,
      budget: 5500,
      resistance: 13,
    },
    {
      name: 'BigBox Superstores',
      territory: 'retail',
      patience: 7,
      maxPatience: 7,
      budget: 6500,
      resistance: 14,
    },
    {
      name: 'Premium Brands Collective',
      territory: 'retail',
      patience: 6,
      maxPatience: 6,
      budget: 7500,
      resistance: 15,
    },
  ],
  finance: [
    {
      name: 'First National Bank',
      territory: 'finance',
      patience: 6,
      maxPatience: 6,
      budget: 7000,
      resistance: 15,
    },
    {
      name: 'Apex Investment Group',
      territory: 'finance',
      patience: 7,
      maxPatience: 7,
      budget: 8000,
      resistance: 16,
    },
    {
      name: 'Sterling Financial Services',
      territory: 'finance',
      patience: 5,
      maxPatience: 5,
      budget: 6500,
      resistance: 14,
    },
  ],
};

// ============================================================================
// Client Creation Functions
// ============================================================================

/**
 * Create a first client based on territory
 * Uses block 2 roll to select from templates
 */
export function createFirstClient(territory: Territory, rollResult: number): Client {
  const templates = FIRST_CLIENTS[territory];
  const index = (rollResult - 1) % templates.length;
  const template = templates[index];

  return {
    ...template,
    dealValue: 0,
    active: true,
  };
}

/**
 * Create a whale client based on territory
 * Uses block 4 roll to select from templates
 */
export function createWhaleClient(territory: Territory, rollResult: number): Client {
  const templates = WHALE_CLIENTS[territory];
  const index = (rollResult - 1) % templates.length;
  const template = templates[index];

  return {
    ...template,
    dealValue: 0,
    active: true,
  };
}

/**
 * Get territory favored stat
 * Tech = INT, Retail = CHA, Finance = WIS
 */
export function getTerritoryFavoredStat(territory: Territory): 'int' | 'cha' | 'wis' {
  switch (territory) {
    case 'tech':
      return 'int';
    case 'retail':
      return 'cha';
    case 'finance':
      return 'wis';
  }
}

/**
 * Get territory display name
 */
export function getTerritoryDisplayName(territory: Territory): string {
  switch (territory) {
    case 'tech':
      return 'Technology';
    case 'retail':
      return 'Retail';
    case 'finance':
      return 'Finance';
  }
}

/**
 * Get territory description
 */
export function getTerritoryDescription(territory: Territory): string {
  switch (territory) {
    case 'tech':
      return 'Fast-moving tech companies. INT modifier helps with pitch checks.';
    case 'retail':
      return 'Traditional retail chains. CHA modifier helps with pitch checks.';
    case 'finance':
      return 'Financial institutions. WIS modifier helps with pitch checks.';
  }
}
