/**
 * VDXF Helpers for Character and Achievement Storage
 *
 * Helper functions for building ContentMultiMap structures
 * for storing character data and sales achievements on-chain.
 */

import type { StoredCharacter } from './types';
import type { SalesAchievementProofData } from './sales/types';
import { VDXF_KEYS } from './config';

// ============================================================================
// Types for ContentMultiMap structure
// ============================================================================

/**
 * DataDescriptor structure used in contentmultimap
 */
interface DataDescriptor {
  version: number;
  label: string;
  mimetype: string;
  objectdata: { message: string } | string | null;
  flags?: number;
}

/**
 * DataDescriptor wrapper - keyed by the dataDescriptor VDXF key
 */
type DataDescriptorWrapper = {
  [key: string]: DataDescriptor;
};

/**
 * ContentMultiMap structure for updateidentity
 */
export type ContentMultiMap = {
  [outerKey: string]: DataDescriptorWrapper[];
};

// ============================================================================
// Building Functions
// ============================================================================

/**
 * Build a single DataDescriptor entry
 */
function buildDataDescriptor(
  label: string,
  value: string | object,
  mimetype: string = 'text/plain'
): DataDescriptorWrapper {
  const message = typeof value === 'object' ? JSON.stringify(value) : value;

  return {
    [VDXF_KEYS.dataDescriptor]: {
      version: 1,
      label,
      mimetype,
      objectdata: { message },
    },
  };
}

/**
 * Build a ContentMultiMap for character storage
 * (Reused from vcharacter-prime)
 */
export function buildCharacterContentMap(character: StoredCharacter): ContentMultiMap {
  const entries: DataDescriptorWrapper[] = [];

  // Name entry
  entries.push(buildDataDescriptor(VDXF_KEYS.labels.name, character.name));

  // Stats entry
  const statsData = {
    strength: character.stats.str,
    dexterity: character.stats.dex,
    constitution: character.stats.con,
    intelligence: character.stats.int,
    wisdom: character.stats.wis,
    charisma: character.stats.cha,
  };
  entries.push(buildDataDescriptor(VDXF_KEYS.labels.stats, statsData, 'application/json'));

  // Traits entry
  const traitsData = {
    element: character.traits.element,
    spirit: character.traits.spiritAnimal,
    sex: character.traits.sex,
  };
  entries.push(buildDataDescriptor(VDXF_KEYS.labels.traits, traitsData, 'application/json'));

  // Proof entry
  const proofData = {
    clientSeed: character.verification.client_seed,
    clientSeedHash: character.commitment.clientSeedHash,
    rollBlockHeight: character.rollBlockHeight,
    rollBlockHash: character.rollBlockHash,
    commitmentBlockHeight: character.commitment.signedBlockHeight,
  };
  entries.push(buildDataDescriptor(VDXF_KEYS.labels.proof, proofData, 'application/json'));

  return {
    [VDXF_KEYS.characterProof]: entries,
  };
}

/**
 * Build a ContentMultiMap for sales achievement storage
 *
 * Uses salesAchievement as outer key, with salesAchievementPromotion or salesAchievementLegendary as the label.
 */
export function buildSalesAchievementContentMap(achievement: SalesAchievementProofData): ContentMultiMap {
  const entries: DataDescriptorWrapper[] = [];

  // Select the label based on tier
  const label = achievement.tier === 'legendary'
    ? VDXF_KEYS.salesAchievementLegendary
    : VDXF_KEYS.salesAchievementPromotion;

  if (!label) {
    throw new Error(`VDXF key for ${achievement.tier} not configured. Generate with getvdxfid.`);
  }

  if (!VDXF_KEYS.salesAchievement) {
    throw new Error('Sales outer VDXF key not configured. Generate with getvdxfid.');
  }

  // Entry containing achievement data with tier-specific label
  entries.push(
    buildDataDescriptor(label, achievement, 'application/json')
  );

  return {
    [VDXF_KEYS.salesAchievement]: entries,
  };
}

// ============================================================================
// Parsing Functions
// ============================================================================

/**
 * Check if a DataDescriptor is a deletion marker
 */
function isDeleted(descriptor: DataDescriptor): boolean {
  return descriptor.objectdata === null || descriptor.flags === 32;
}

/**
 * Convert hex string to UTF-8 string
 */
function hexToString(hex: string): string {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Extract string value from DataDescriptor objectdata
 */
function extractStringValue(descriptor: DataDescriptor): string | undefined {
  if (descriptor.objectdata === null) return undefined;

  if (typeof descriptor.objectdata === 'object' && 'message' in descriptor.objectdata) {
    return descriptor.objectdata.message;
  }

  if (typeof descriptor.objectdata === 'string') {
    try {
      return hexToString(descriptor.objectdata);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

/**
 * Parsed character data from on-chain storage
 */
export interface ParsedCharacterData {
  name?: string;
  stats?: {
    strength?: { total: number; dice: number[]; modifier: number };
    dexterity?: { total: number; dice: number[]; modifier: number };
    constitution?: { total: number; dice: number[]; modifier: number };
    intelligence?: { total: number; dice: number[]; modifier: number };
    wisdom?: { total: number; dice: number[]; modifier: number };
    charisma?: { total: number; dice: number[]; modifier: number };
  };
  traits?: {
    element?: string;
    spirit?: string;
    sex?: string;
  };
  proof?: {
    clientSeed?: string;
    clientSeedHash?: string;
    rollBlockHeight?: number;
    rollBlockHash?: string;
    commitmentBlockHeight?: number;
  };
}

/**
 * Parse a ContentMultiMap back into character data
 */
export function parseCharacterContentMap(contentMap: Record<string, unknown>): ParsedCharacterData | null {
  const entries = contentMap[VDXF_KEYS.characterProof] as DataDescriptorWrapper[] | undefined;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return null;
  }

  const result: ParsedCharacterData = {};

  for (const wrapper of entries) {
    const descriptor = wrapper[VDXF_KEYS.dataDescriptor];
    if (!descriptor || isDeleted(descriptor)) continue;

    const label = descriptor.label;
    if (!label) continue;

    const value = extractStringValue(descriptor);
    if (!value) continue;

    if (label === VDXF_KEYS.labels.name) {
      result.name = value;
    } else if (label === VDXF_KEYS.labels.stats) {
      try {
        result.stats = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    } else if (label === VDXF_KEYS.labels.traits) {
      try {
        result.traits = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    } else if (label === VDXF_KEYS.labels.proof) {
      try {
        result.proof = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    }
  }

  if (!result.name && !result.stats && !result.traits && !result.proof) {
    return null;
  }

  return result;
}

/**
 * Parse all characters from a ContentMultiMap
 */
export function parseAllCharacters(contentMap: Record<string, unknown>): ParsedCharacterData[] {
  const entries = contentMap[VDXF_KEYS.characterProof] as DataDescriptorWrapper[] | undefined;
  if (!entries || !Array.isArray(entries) || entries.length === 0) {
    return [];
  }

  const characters: ParsedCharacterData[] = [];
  let currentCharacter: ParsedCharacterData = {};

  for (const wrapper of entries) {
    const descriptor = wrapper[VDXF_KEYS.dataDescriptor];
    if (!descriptor || isDeleted(descriptor)) continue;

    const label = descriptor.label;
    if (!label) continue;

    const value = extractStringValue(descriptor);
    if (!value) continue;

    if (label === VDXF_KEYS.labels.name) {
      if (currentCharacter.name || currentCharacter.proof) {
        characters.push(currentCharacter);
      }
      currentCharacter = { name: value };
    } else if (label === VDXF_KEYS.labels.stats) {
      try {
        currentCharacter.stats = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    } else if (label === VDXF_KEYS.labels.traits) {
      try {
        currentCharacter.traits = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    } else if (label === VDXF_KEYS.labels.proof) {
      try {
        currentCharacter.proof = JSON.parse(value);
      } catch { /* Invalid JSON */ }
    }
  }

  if (currentCharacter.name || currentCharacter.proof) {
    characters.push(currentCharacter);
  }

  return characters;
}

/**
 * Find a specific character by rollBlockHeight
 */
export function findCharacterByRollBlockHeight(
  contentMap: Record<string, unknown>,
  rollBlockHeight: number
): ParsedCharacterData | null {
  const characters = parseAllCharacters(contentMap);
  return characters.find(c => c.proof?.rollBlockHeight === rollBlockHeight) || null;
}

// ============================================================================
// Sales Achievement Parsing
// ============================================================================

/**
 * Parse all sales achievements from a ContentMultiMap
 */
export function parseSalesAchievements(contentMap: Record<string, unknown>): SalesAchievementProofData[] {
  const achievements: SalesAchievementProofData[] = [];

  if (!VDXF_KEYS.salesAchievement) return achievements;

  // Get entries from the sales outer key
  const entries = contentMap[VDXF_KEYS.salesAchievement] as DataDescriptorWrapper[] | undefined;
  if (!entries || !Array.isArray(entries)) return achievements;

  // Valid labels for achievements
  const validLabels = [VDXF_KEYS.salesAchievementPromotion, VDXF_KEYS.salesAchievementLegendary].filter(Boolean);

  for (const wrapper of entries) {
    const descriptor = wrapper[VDXF_KEYS.dataDescriptor];
    if (!descriptor || isDeleted(descriptor)) continue;

    // Check if label is a valid achievement type
    if (!validLabels.includes(descriptor.label)) continue;

    const value = extractStringValue(descriptor);
    if (!value) continue;

    try {
      const parsed = JSON.parse(value);
      achievements.push(parsed as SalesAchievementProofData);
    } catch { /* Invalid JSON, skip */ }
  }

  return achievements;
}

/**
 * Find achievements for a specific character
 */
export function findSalesAchievementsByCharacter(
  contentMap: Record<string, unknown>,
  characterRollBlockHeight: number
): SalesAchievementProofData[] {
  const achievements = parseSalesAchievements(contentMap);
  return achievements.filter(a => a.characterRollBlockHeight === characterRollBlockHeight);
}
