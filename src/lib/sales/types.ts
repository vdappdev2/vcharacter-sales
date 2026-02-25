/**
 * Sales Game Types
 *
 * Type definitions for the sales proof-of-concept game.
 */

import type { StoredCharacter, Element, SpiritAnimal } from '../types';

// ============================================================================
// Core Game Types
// ============================================================================

/**
 * Game phases (9 total)
 */
export type Phase =
  | 'assignment'      // Phase 1: Territory assignment
  | 'first_trip'      // Phase 2: Travel choice
  | 'first_client'    // Phase 3: First negotiation
  | 'crossroads'      // Phase 4: Career choice
  | 'quarter_event'   // Phase 5: Market event
  | 'vp_meeting'      // Phase 6: VP commitment
  | 'whale_prep'      // Phase 7: Whale investment
  | 'whale'           // Phase 8: Big client negotiation
  | 'quarter_end';    // Phase 9: Final tally

/**
 * Sales territories (determines favored stat)
 */
export type Territory = 'tech' | 'retail' | 'finance';

/**
 * Travel choices for Phase 2
 */
export type TravelChoice = 'fly' | 'train' | 'drive';

/**
 * Crossroads choices for Phase 4
 */
export type CrossroadsChoice = 'grind' | 'climb' | 'hunt';

/**
 * VP commitment choices for Phase 6
 */
export type VPChoice = 'safe' | 'stretch' | 'allin';

/**
 * Whale prep investment choices for Phase 7
 */
export type WhaleInvestment = 'research' | 'gift' | 'dinner' | 'wingit';

/**
 * Negotiation actions
 */
export type NegotiationAction = 'pitch' | 'listen' | 'concede' | 'ability';

// ============================================================================
// Client Types (replaces Enemy)
// ============================================================================

/**
 * Client definition for negotiations
 */
export interface Client {
  /** Client name */
  name: string;
  /** Territory this client is from */
  territory: Territory;
  /** Rounds before client leaves (patience) */
  patience: number;
  /** Maximum patience (starting value) */
  maxPatience: number;
  /** Potential deal budget */
  budget: number;
  /** DC for pitch checks */
  resistance: number;
  /** Accumulated deal value from successful pitches */
  dealValue: number;
  /** Whether client is still active */
  active: boolean;
}

/**
 * Body language roll result (d6)
 */
export type BodyLanguage =
  | 'arms_crossed'  // 1: Patience -2, Resistance +1
  | 'skeptical'     // 2: Resistance +2
  | 'neutral'       // 3-4: No change
  | 'interested'    // 5: Resistance -1
  | 'engaged';      // 6: Resistance -2, deal +10%

// ============================================================================
// Dice Roll Types
// ============================================================================

/**
 * A single provably fair dice roll during gameplay
 */
export interface GameRoll {
  /** Unique label for this roll (e.g., "territory", "client1_r1_pitch") */
  label: string;
  /** Action that triggered this roll */
  action: string;
  /** Client seed used for this roll (hex) */
  rollSeed: string;
  /** Hash of rollSeed (committed before block) */
  rollSeedHash: string;
  /** Block height used for randomness */
  blockHeight: number;
  /** Block hash used for randomness */
  blockHash: string;
  /** Die size (e.g., 20 for d20, 6 for d6) */
  dieSize: number;
  /** Raw roll result (1 to dieSize) */
  result: number;
  /** Stat modifier applied */
  modifier: number;
  /** Final total (result + modifier) */
  total: number;
  /** Target DC or resistance */
  target?: number;
  /** Outcome description */
  outcome: 'success' | 'fail' | 'critical';
  /** Timestamp of roll */
  timestamp: number;
}

/**
 * Pending roll awaiting block confirmation
 */
export interface PendingRoll {
  /** Unique label for this roll */
  label: string;
  /** Action description */
  action: string;
  /** Client seed (hex) */
  rollSeed: string;
  /** Hash of rollSeed */
  rollSeedHash: string;
  /** Block height when committed */
  commitBlockHeight: number;
  /** Die size */
  dieSize: number;
  /** Modifier to apply */
  modifier: number;
  /** Target DC (optional) */
  target?: number;
  /** When this was created */
  createdAt: number;
}

// ============================================================================
// Negotiation Types
// ============================================================================

/**
 * Result of a negotiation round
 */
export interface NegotiationRoundResult {
  /** Round number */
  round: number;
  /** Player's action */
  playerAction: NegotiationAction;
  /** Player's pitch roll (if pitch action) */
  pitchRoll?: GameRoll;
  /** Body language roll */
  bodyLanguageRoll?: GameRoll;
  /** Body language interpretation */
  bodyLanguage?: BodyLanguage;
  /** Money gained this round */
  moneyGained: number;
  /** Narrative description */
  narrative: string;
  /** Client patience after round */
  patienceAfter: number;
  /** Client resistance after round */
  resistanceAfter: number;
  /** Accumulated deal value */
  dealValueAfter: number;
}

// ============================================================================
// Active Modifier Types
// ============================================================================

/**
 * Active modifier (buff/debuff) during game
 */
export interface ActiveModifier {
  /** Modifier description */
  description: string;
  /** Modifier type */
  type: 'buff' | 'debuff';
  /** Numeric value */
  value: number;
  /** Source of modifier (e.g., "element", "spirit", "travel") */
  source: string;
  /** Phases remaining (99 = permanent) */
  phasesRemaining: number;
}

// ============================================================================
// Game State
// ============================================================================

/**
 * Complete sales game state
 */
export interface SalesGameState {
  /** The character being played */
  character: StoredCharacter;

  /** Current phase */
  currentPhase: Phase;

  /** Starting money (for threshold calculation) */
  startingMoney: number;

  /** Budget scale factor (startingMoney / baseMoney, floored at 0.5) */
  budgetScale: number;

  /** Current money */
  money: number;

  /** Assigned territory */
  territory?: Territory;

  /** VP choice made */
  vpChoice?: VPChoice;

  /** Whether Legendary tier is unlocked (VP must have unlocked) */
  legendaryUnlocked: boolean;

  /** Whether spirit ability has been used */
  spiritAbilityUsed: boolean;

  /** Active modifiers (buffs/debuffs) */
  modifiers: ActiveModifier[];

  /** All choices made (for achievement record) */
  choices: string[];

  /** All rolls made (for verification) */
  rolls: GameRoll[];

  // ========== Phase-specific state ==========

  /** Travel choice made */
  travelChoice?: TravelChoice;

  /** Travel bonus (e.g., +2 first negotiation from flying) */
  travelBonus?: number;

  /** Journey event result */
  journeyEvent?: string;

  /** Drive trouble result */
  driveTrouble?: string;

  /** First client state */
  firstClient?: Client;

  /** First client negotiation rounds */
  firstClientRounds?: NegotiationRoundResult[];

  /** Crossroads choice */
  crossroadsChoice?: CrossroadsChoice;

  /** Crossroads check result */
  crossroadsResult?: 'success' | 'fail';

  /** Quarter event result */
  quarterEvent?: string;

  /** Whale prep investment */
  whaleInvestment?: WhaleInvestment;

  /** Lucky item roll result */
  luckyItem?: string;

  /** Whale client state */
  whaleClient?: Client;

  /** Whale negotiation rounds */
  whaleRounds?: NegotiationRoundResult[];

  /** Game outcome tier */
  tier?: 'fired' | 'under_review' | 'employed' | 'promotion' | 'legendary';

  /** When game started */
  startedAt: number;

  /** When game ended (if finished) */
  endedAt?: number;
}

// ============================================================================
// Achievement Types
// ============================================================================

/**
 * Sales achievement tier
 */
export type SalesAchievementTier = 'promotion' | 'legendary';

/**
 * Sales achievement proof data for on-chain storage
 * Only promotion and legendary tiers are stored on-chain
 */
export interface SalesAchievementProofData {
  /** Character name */
  characterName: string;
  /** Character's creation roll block height (unique ID) */
  characterRollBlockHeight: number;
  /** Starting money */
  startingMoney: number;
  /** Final money */
  finalMoney: number;
  /** Achievement tier */
  tier: SalesAchievementTier;

  // Block verification data (4 blocks)
  block1Seed: string;
  block1Hash: string;
  block2Seed: string;
  block2Hash: string;
  block3Seed: string;
  block3Hash: string;
  block4Seed: string;
  block4Hash: string;

  // Key rolls for verification
  territoryRoll: GameRoll;

  // Key actions
  firstClientActions: NegotiationAction[];
  whaleActions: NegotiationAction[];

  // All choices made
  choices: string[];

  // Meta
  completedAtBlock: number;
  timestamp: number;
}

// ============================================================================
// Element & Spirit Bonus Types
// ============================================================================

/**
 * Element bonus for sales context
 */
export interface ElementSalesBonus {
  element: Element;
  description: string;
  effect: {
    type: 'deal_bonus' | 'check_bonus' | 'setback_reduction' | 'passive_income' | 'per_deal';
    value: number;
    condition?: string;
  };
}

/**
 * Spirit ability for sales context
 */
export interface SpiritSalesAbility {
  spirit: SpiritAnimal;
  name: string;
  description: string;
  effect: {
    type: 'instant_money' | 'deal_bonus' | 'immunity' | 'recovery' | 'per_success' | 'over_time' | 'escape' | 'reveal';
    value: number;
    duration?: number;
  };
}

// ============================================================================
// API Types
// ============================================================================

/**
 * Request to store a sales achievement
 */
export interface StoreSalesAchievementRequest {
  achievement: SalesAchievementProofData;
  identity: string;
}

/**
 * Response from achievement storage
 */
export interface StoreSalesAchievementResponse {
  requestId: string;
  qrString: string;
  deeplinkUri: string;
  error?: string;
}

/**
 * Response from achievement list
 */
export interface ListSalesAchievementsResponse {
  identity: string;
  identityAddress?: string;
  achievements: SalesAchievementProofData[];
  error?: string;
}
