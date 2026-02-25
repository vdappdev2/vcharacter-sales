/**
 * Sales Game Engine
 *
 * Manages game state, phase transitions, money calculations,
 * and element/spirit bonuses.
 */

import type { StoredCharacter, Element, SpiritAnimal } from '../types';
import type {
  SalesGameState,
  Phase,
  Territory,
  TravelChoice,
  CrossroadsChoice,
  VPChoice,
  WhaleInvestment,
  ActiveModifier,
  GameRoll,
  SalesAchievementProofData,
  SalesAchievementTier,
  Client,
} from './types';
import { SALES_CONFIG } from '../config';
import { createFirstClient, createWhaleClient } from './clients';

// ============================================================================
// Starting Money Calculation
// ============================================================================

/**
 * Calculate starting money for a character
 *
 * Formula: $10,000 + (CHA mod × $2,000) + (INT mod × $1,000) + (WIS mod × $500)
 * Minimum: $3,000
 */
export function calculateStartingMoney(character: StoredCharacter): number {
  const { cha, int, wis } = character.stats;

  const baseMoney = SALES_CONFIG.baseMoney;
  const chaBonus = cha.modifier * SALES_CONFIG.chaMultiplier;
  const intBonus = int.modifier * SALES_CONFIG.intMultiplier;
  const wisBonus = wis.modifier * SALES_CONFIG.wisMultiplier;

  const total = baseMoney + chaBonus + intBonus + wisBonus;

  return Math.max(total, SALES_CONFIG.minimumMoney);
}

// ============================================================================
// CON Resilience Helper
// ============================================================================

/**
 * Get CON-based setback adjustment
 * CON "Resilience": CON mod * $100 reduces losses (negative CON increases losses)
 */
export function getConAdjustment(character: StoredCharacter): number {
  return character.stats.con.modifier * 100;
}

// ============================================================================
// Game Initialization
// ============================================================================

/**
 * Create a new sales game state for a character
 */
export function createSalesGameState(character: StoredCharacter): SalesGameState {
  const startingMoney = calculateStartingMoney(character);
  const budgetScale = Math.max(
    SALES_CONFIG.budgetScaleFloor,
    startingMoney / SALES_CONFIG.baseMoney
  );

  return {
    character,
    currentPhase: 'assignment',
    startingMoney,
    budgetScale,
    money: startingMoney,
    legendaryUnlocked: false,
    spiritAbilityUsed: false,
    modifiers: [],
    choices: [],
    rolls: [],
    startedAt: Date.now(),
  };
}

// ============================================================================
// Phase Transitions
// ============================================================================

/**
 * Valid phase transitions
 */
const PHASE_FLOW: Record<Phase, Phase | null> = {
  assignment: 'first_trip',
  first_trip: 'first_client',
  first_client: 'crossroads',
  crossroads: 'quarter_event',
  quarter_event: 'vp_meeting',
  vp_meeting: 'whale_prep',
  whale_prep: 'whale',
  whale: 'quarter_end',
  quarter_end: null, // End of game
};

/**
 * Advance to the next phase
 */
export function advancePhase(state: SalesGameState): SalesGameState {
  const nextPhase = PHASE_FLOW[state.currentPhase];

  if (!nextPhase) {
    // Game is over
    return {
      ...state,
      endedAt: Date.now(),
    };
  }

  // Tick down modifier durations
  const newModifiers = tickModifiers(state.modifiers);

  // Apply Wood element passive income
  let newMoney = state.money;
  if (state.character.traits.element === 'Wood') {
    newMoney += 100; // +$100 per phase
  }

  return {
    ...state,
    currentPhase: nextPhase,
    modifiers: newModifiers,
    money: newMoney,
  };
}

/**
 * Tick down modifier durations
 */
function tickModifiers(modifiers: ActiveModifier[]): ActiveModifier[] {
  return modifiers
    .map(m => ({ ...m, phasesRemaining: m.phasesRemaining - 1 }))
    .filter(m => m.phasesRemaining > 0);
}

/**
 * Check if game is over
 */
export function isGameOver(state: SalesGameState): boolean {
  return state.tier !== undefined || state.endedAt !== undefined;
}

// ============================================================================
// Phase 1: Territory Assignment
// ============================================================================

/**
 * Assign territory based on d6 roll
 * 1-2: Tech, 3-4: Retail, 5-6: Finance
 */
export function assignTerritory(state: SalesGameState, roll: number): SalesGameState {
  let territory: Territory;
  if (roll <= 2) {
    territory = 'tech';
  } else if (roll <= 4) {
    territory = 'retail';
  } else {
    territory = 'finance';
  }

  return {
    ...state,
    territory,
    choices: [...state.choices, `territory:${territory}`],
  };
}

// ============================================================================
// Phase 2: First Trip
// ============================================================================

/**
 * Travel choice costs and bonuses
 */
const TRAVEL_OPTIONS = {
  fly: { cost: 800, pitchBonus: 2 },
  train: { cost: 200, pitchBonus: 0 },
  drive: { cost: 50, pitchBonus: 0 }, // Risk/reward handled separately
};

/**
 * Apply travel choice
 */
export function applyTravelChoice(
  state: SalesGameState,
  choice: TravelChoice
): SalesGameState {
  const option = TRAVEL_OPTIONS[choice];
  const newMoney = state.money - option.cost;

  const modifiers = [...state.modifiers];
  if (choice === 'fly') {
    modifiers.push({
      description: 'Well Rested: +2 to first negotiation',
      type: 'buff',
      value: 2,
      source: 'travel',
      phasesRemaining: 2, // Lasts through first client phase
    });
  }

  return {
    ...state,
    money: newMoney,
    travelChoice: choice,
    travelBonus: option.pitchBonus,
    modifiers,
    choices: [...state.choices, `travel:${choice}`],
  };
}

/**
 * Journey events (d6)
 */
const JOURNEY_EVENTS = [
  { roll: 1, name: 'delays', effect: 'Minor delays, no impact.', moneyChange: 0 },
  { roll: 2, name: 'contacts', effect: 'Made good contacts! +$300', moneyChange: 300 },
  { roll: 3, name: 'intel', effect: 'Picked up market intel. +1 to next pitch.', moneyChange: 0, buff: true },
  { roll: 4, name: 'luggage', effect: 'Lost luggage hassle. -$100', moneyChange: -100 },
  { roll: 5, name: 'leads', effect: 'Got some leads! +$500', moneyChange: 500 },
  { roll: 6, name: 'smooth', effect: 'Smooth journey, arrived refreshed.', moneyChange: 0 },
];

/**
 * Apply journey event
 */
export function applyJourneyEvent(state: SalesGameState, roll: number): SalesGameState {
  const event = JOURNEY_EVENTS.find(e => e.roll === roll) || JOURNEY_EVENTS[0];

  // Apply Earth element setback reduction
  let moneyChange = event.moneyChange;
  if (moneyChange < 0 && state.character.traits.element === 'Earth') {
    moneyChange = Math.max(moneyChange + 200, 0); // -$200 from setbacks
  }

  // Apply CON resilience (loss never becomes gain)
  if (moneyChange < 0) {
    moneyChange = Math.min(0, moneyChange + getConAdjustment(state.character));
  }

  const modifiers = [...state.modifiers];
  if (event.buff) {
    modifiers.push({
      description: 'Market Intel: +1 to next pitch',
      type: 'buff',
      value: 1,
      source: 'journey',
      phasesRemaining: 2,
    });
  }

  return {
    ...state,
    money: state.money + moneyChange,
    journeyEvent: event.name,
    modifiers,
  };
}

/**
 * Drive trouble events (d6)
 */
const DRIVE_TROUBLE_EVENTS = [
  { roll: 1, name: 'breakdown', effect: 'Breakdown! -$400 in repairs.', moneyChange: -400 },
  { roll: 2, name: 'traffic', effect: 'Heavy traffic, arrived late.', moneyChange: 0 },
  { roll: 3, name: 'fine', effect: 'Got a speeding ticket. -$150', moneyChange: -150 },
  { roll: 4, name: 'shortcut', effect: 'Found a shortcut! +$100 saved.', moneyChange: 100 },
  { roll: 5, name: 'scenic', effect: 'Nice drive, clear head. +1 to first pitch.', moneyChange: 0, buff: true },
  { roll: 6, name: 'podcasts', effect: 'Great podcasts learned. +2 to first pitch.', moneyChange: 0, buff: 2 },
];

/**
 * Apply drive trouble event
 */
export function applyDriveTrouble(state: SalesGameState, roll: number): SalesGameState {
  const event = DRIVE_TROUBLE_EVENTS.find(e => e.roll === roll) || DRIVE_TROUBLE_EVENTS[0];

  // Apply Earth element setback reduction
  let moneyChange = event.moneyChange;
  if (moneyChange < 0 && state.character.traits.element === 'Earth') {
    moneyChange = Math.max(moneyChange + 200, 0);
  }

  // Apply CON resilience (loss never becomes gain)
  if (moneyChange < 0) {
    moneyChange = Math.min(0, moneyChange + getConAdjustment(state.character));
  }

  const modifiers = [...state.modifiers];
  if (event.buff) {
    const buffValue = typeof event.buff === 'number' ? event.buff : 1;
    modifiers.push({
      description: `Drive Bonus: +${buffValue} to first pitch`,
      type: 'buff',
      value: buffValue,
      source: 'drive',
      phasesRemaining: 2,
    });
  }

  return {
    ...state,
    money: state.money + moneyChange,
    driveTrouble: event.name,
    modifiers,
  };
}

// ============================================================================
// Phase 3: First Client
// ============================================================================

/**
 * Initialize first client negotiation
 */
export function initFirstClient(state: SalesGameState, clientRoll: number): SalesGameState {
  if (!state.territory) {
    throw new Error('Territory must be assigned before first client');
  }

  const client = createFirstClient(state.territory, clientRoll);

  // Scale client budget with starting money so achievement thresholds stay achievable
  client.budget = Math.floor(client.budget * state.budgetScale);

  return {
    ...state,
    firstClient: client,
    firstClientRounds: [],
  };
}

/**
 * Complete first client and add money
 */
export function completeFirstClient(state: SalesGameState): SalesGameState {
  if (!state.firstClient) {
    throw new Error('No first client to complete');
  }

  // Apply element bonuses
  let bonus = 0;

  // Fire: +$500 on closed deals
  if (state.character.traits.element === 'Fire' && state.firstClient.dealValue > 0) {
    bonus += 500;
  }

  // Metal: +$200 on every deal
  if (state.character.traits.element === 'Metal' && state.firstClient.dealValue > 0) {
    bonus += 200;
  }

  // Air: +$300 on first deal
  if (state.character.traits.element === 'Air' && state.firstClient.dealValue > 0) {
    bonus += 300;
  }

  const totalEarned = state.firstClient.dealValue + bonus;

  return {
    ...state,
    money: state.money + totalEarned,
  };
}

// ============================================================================
// Phase 4: Crossroads
// ============================================================================

/**
 * Crossroads choices
 */
const CROSSROADS_OPTIONS = {
  grind: { dc: 10, successMoney: 1500, failMoney: 800, stat: 'cha' as const },
  climb: { dc: 14, successMoney: 2500, failMoney: 200, stat: 'int' as const },
  hunt: { dc: 16, successMoney: 0, failMoney: 0, stat: 'wis' as const, whaleBonus: 4, whalePenalty: -2 },
};

/**
 * Apply crossroads choice and result
 */
export function applyCrossroadsChoice(
  state: SalesGameState,
  choice: CrossroadsChoice,
  roll: number
): SalesGameState {
  const option = CROSSROADS_OPTIONS[choice];
  const modifier = state.character.stats[option.stat].modifier;
  const total = roll + modifier;
  const success = total >= option.dc;

  let moneyChange = success ? option.successMoney : option.failMoney;
  const modifiers = [...state.modifiers];

  // Hunt affects whale bonus/penalty
  if (choice === 'hunt') {
    if (success) {
      modifiers.push({
        description: 'Hunt Success: +4 to Whale negotiations',
        type: 'buff',
        value: 4,
        source: 'hunt',
        phasesRemaining: 99,
      });
    } else {
      modifiers.push({
        description: 'Hunt Failure: -2 to Whale negotiations',
        type: 'debuff',
        value: -2,
        source: 'hunt',
        phasesRemaining: 99,
      });
    }
  }

  return {
    ...state,
    money: state.money + moneyChange,
    crossroadsChoice: choice,
    crossroadsResult: success ? 'success' : 'fail',
    modifiers,
    choices: [...state.choices, `crossroads:${choice}:${success ? 'success' : 'fail'}`],
  };
}

// ============================================================================
// Phase 5: Quarter Event
// ============================================================================

/**
 * Quarter events (d6)
 */
const QUARTER_EVENTS = [
  { roll: 1, name: 'crash', effect: 'Market crash! -$1,500', moneyChange: -1500 },
  { roll: 2, name: 'competitor', effect: 'Competitor undercut! -$1,000', moneyChange: -1000 },
  { roll: 3, name: 'recall', effect: 'Product recall affects sales. -$500', moneyChange: -500 },
  { roll: 4, name: 'quiet', effect: 'Quiet quarter, business as usual.', moneyChange: 0 },
  { roll: 5, name: 'press', effect: 'Good press coverage! +$800', moneyChange: 800 },
  { roll: 6, name: 'referral', effect: 'Got a great referral! +$500', moneyChange: 500 },
];

/**
 * Apply quarter event
 */
export function applyQuarterEvent(state: SalesGameState, roll: number): SalesGameState {
  const event = QUARTER_EVENTS.find(e => e.roll === roll) || QUARTER_EVENTS[3];

  // Apply Earth element setback reduction
  let moneyChange = event.moneyChange;
  if (moneyChange < 0 && state.character.traits.element === 'Earth') {
    moneyChange = Math.max(moneyChange + 200, 0);
  }

  // Apply CON resilience (loss never becomes gain)
  if (moneyChange < 0) {
    moneyChange = Math.min(0, moneyChange + getConAdjustment(state.character));
  }

  return {
    ...state,
    money: state.money + moneyChange,
    quarterEvent: event.name,
  };
}

// ============================================================================
// Phase 6: VP Meeting
// ============================================================================

/**
 * Apply VP choice
 */
export function applyVPChoice(state: SalesGameState, choice: VPChoice): SalesGameState {
  const vpConfig = SALES_CONFIG.vpChoices[choice];

  return {
    ...state,
    vpChoice: choice,
    legendaryUnlocked: !vpConfig.legendaryGated,
    choices: [...state.choices, `vp:${choice}`],
  };
}

// ============================================================================
// Phase 7: Whale Prep
// ============================================================================

/**
 * Whale investment options
 */
const WHALE_INVESTMENTS = {
  research: { cost: 400, effect: '+2 to Listen actions', listenBonus: 2 },
  gift: { cost: 600, effect: '+1 all checks, +2 patience', allBonus: 1, patienceBonus: 2 },
  dinner: { cost: 800, effect: '-2 resistance', resistanceReduction: 2 },
  wingit: { cost: 0, effect: 'No bonus, but kept the cash.', allBonus: 0 },
};

/**
 * Apply whale investment
 */
export function applyWhaleInvestment(
  state: SalesGameState,
  investment: WhaleInvestment
): SalesGameState {
  const option = WHALE_INVESTMENTS[investment];
  const modifiers = [...state.modifiers];

  if (investment === 'research') {
    modifiers.push({
      description: 'Research: +2 to Listen actions',
      type: 'buff',
      value: 2,
      source: 'research',
      phasesRemaining: 99,
    });
  } else if (investment === 'gift') {
    modifiers.push({
      description: 'Gift: +1 to all checks',
      type: 'buff',
      value: 1,
      source: 'gift',
      phasesRemaining: 99,
    });
  } else if (investment === 'dinner') {
    modifiers.push({
      description: 'Dinner: -2 whale resistance',
      type: 'buff',
      value: 2,
      source: 'dinner',
      phasesRemaining: 99,
    });
  }

  return {
    ...state,
    money: state.money - option.cost,
    whaleInvestment: investment,
    modifiers,
    choices: [...state.choices, `whaleinvest:${investment}`],
  };
}

/**
 * Lucky item events (d6)
 */
const LUCKY_ITEMS = [
  { roll: 1, name: 'watch', effect: 'Found your lucky watch! +$200 confidence.', moneyChange: 200 },
  { roll: 2, name: 'spill', effect: 'Coffee spill! Dry cleaning -$50.', moneyChange: -50 },
  { roll: 3, name: 'clover', effect: 'Found a four-leaf clover. Good omen!', moneyChange: 0, buff: true },
  { roll: 4, name: 'usb', effect: 'USB with competitor intel! +1 to pitches.', moneyChange: 0, buff: true },
  { roll: 5, name: 'parking', effect: 'Got front-row parking. Arrived fresh!', moneyChange: 0 },
  { roll: 6, name: 'bird', effect: 'Bird on shoulder. Is that good luck? +$100', moneyChange: 100 },
];

/**
 * Apply lucky item
 */
export function applyLuckyItem(state: SalesGameState, roll: number): SalesGameState {
  const item = LUCKY_ITEMS.find(i => i.roll === roll) || LUCKY_ITEMS[4];

  // Apply Earth element setback reduction
  let moneyChange = item.moneyChange;
  if (moneyChange < 0 && state.character.traits.element === 'Earth') {
    moneyChange = Math.max(moneyChange + 200, 0);
  }

  // Apply CON resilience (loss never becomes gain)
  if (moneyChange < 0) {
    moneyChange = Math.min(0, moneyChange + getConAdjustment(state.character));
  }

  const modifiers = [...state.modifiers];
  if (item.buff) {
    modifiers.push({
      description: `Lucky Item (${item.name}): +1 to pitches`,
      type: 'buff',
      value: 1,
      source: 'lucky',
      phasesRemaining: 99,
    });
  }

  return {
    ...state,
    money: state.money + moneyChange,
    luckyItem: item.name,
    modifiers,
  };
}

// ============================================================================
// Phase 8: The Whale
// ============================================================================

/**
 * Initialize whale client negotiation
 */
export function initWhaleClient(state: SalesGameState, clientRoll: number): SalesGameState {
  if (!state.territory) {
    throw new Error('Territory must be assigned before whale client');
  }

  let client = createWhaleClient(state.territory, clientRoll);

  // Scale client budget with starting money so achievement thresholds stay achievable
  client.budget = Math.floor(client.budget * state.budgetScale);

  // Apply dinner investment effect
  if (state.whaleInvestment === 'dinner') {
    client = {
      ...client,
      resistance: Math.max(8, client.resistance - 2),
    };
  }

  // Apply gift investment effect
  if (state.whaleInvestment === 'gift') {
    client = {
      ...client,
      patience: client.patience + 2,
      maxPatience: client.maxPatience + 2,
    };
  }

  return {
    ...state,
    whaleClient: client,
    whaleRounds: [],
  };
}

/**
 * Complete whale and apply VP multiplier
 */
export function completeWhale(state: SalesGameState): SalesGameState {
  if (!state.whaleClient || !state.vpChoice) {
    throw new Error('Whale client and VP choice required');
  }

  const vpConfig = SALES_CONFIG.vpChoices[state.vpChoice];
  let whaleValue = state.whaleClient.dealValue;

  // Apply VP multiplier
  whaleValue = Math.floor(whaleValue * vpConfig.whaleMultiplier);

  // Apply element bonuses
  let bonus = 0;

  // Fire: +$500 on closed deals
  if (state.character.traits.element === 'Fire' && whaleValue > 0) {
    bonus += 500;
  }

  // Metal: +$200 on every deal
  if (state.character.traits.element === 'Metal' && whaleValue > 0) {
    bonus += 200;
  }

  const totalEarned = whaleValue + bonus;

  // Check for all-in failure
  let penalty = 0;
  if (state.vpChoice === 'allin' && whaleValue === 0) {
    penalty = vpConfig.failurePenalty || 0;
    // Apply CON resilience to penalty (loss never becomes gain)
    if (penalty > 0) {
      penalty = Math.max(0, penalty - getConAdjustment(state.character));
    }
  }

  return {
    ...state,
    money: state.money + totalEarned - penalty,
  };
}

// ============================================================================
// Phase 9: Quarter End - Tier Calculation
// ============================================================================

/**
 * Calculate final tier
 */
export function calculateTier(state: SalesGameState): SalesGameState {
  const ratio = state.money / state.startingMoney;

  let tier: SalesGameState['tier'];

  if (state.money <= 0) {
    tier = 'fired';
  } else if (ratio < 1.0) {
    tier = 'under_review';
  } else if (ratio < SALES_CONFIG.promotionThreshold) {
    tier = 'employed';
  } else if (ratio < SALES_CONFIG.legendaryThreshold || !state.legendaryUnlocked) {
    tier = 'promotion';
  } else {
    tier = 'legendary';
  }

  return {
    ...state,
    tier,
    endedAt: Date.now(),
  };
}

/**
 * Check if tier qualifies for on-chain storage
 */
export function isStorableTier(tier: SalesGameState['tier']): tier is 'promotion' | 'legendary' {
  return tier === 'promotion' || tier === 'legendary';
}

// ============================================================================
// Spirit Abilities
// ============================================================================

/**
 * Use spirit ability
 */
export function useSpiritAbility(state: SalesGameState): {
  state: SalesGameState;
  narrative: string;
  moneyGained?: number;
} {
  if (state.spiritAbilityUsed) {
    throw new Error('Spirit ability already used');
  }

  const spirit = state.character.traits.spiritAnimal;
  const wisMod = state.character.stats.wis.modifier;
  let narrative = '';
  let moneyGained = 0;
  let newState = { ...state, spiritAbilityUsed: true };

  switch (spirit) {
    case 'Wolf': {
      // +$2,000 team bonus + WIS Spirit Bond
      const wolfBase = 2000;
      const wolfEnhanced = Math.max(0, wolfBase + wisMod * 500);
      moneyGained = wolfEnhanced;
      narrative = `Wolf Pack: Your team rallies around you! +$${wolfEnhanced.toLocaleString()} team bonus.`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 500})`;
      break;
    }

    case 'Bear':
      // Client can\'t counter this round (boolean — no WIS enhancement)
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: 'Bear Presence: Client cannot object this round',
          type: 'buff',
          value: 99,
          source: 'spirit',
          phasesRemaining: 1,
        },
      ];
      narrative = 'Bear Presence: Your commanding presence silences objections.';
      break;

    case 'Eagle':
      // Auto-succeed next check (boolean — no WIS enhancement)
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: 'Eagle Eye: Auto-succeed next check',
          type: 'buff',
          value: 99,
          source: 'spirit',
          phasesRemaining: 1,
        },
      ];
      narrative = 'Eagle Eye: Perfect clarity. Your next pitch will definitely land.';
      break;

    case 'Dragon': {
      // +$5,000 instant + WIS Spirit Bond
      const dragonBase = 5000;
      const dragonEnhanced = Math.max(0, dragonBase + wisMod * 500);
      moneyGained = dragonEnhanced;
      narrative = `Dragon Fire: Your legendary pitch brings in a $${dragonEnhanced.toLocaleString()} instant bonus!`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 500})`;
      break;
    }

    case 'Octopus':
      // Escape bad deal, no loss (boolean — no WIS enhancement)
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: 'Octopus Escape: Exit any negotiation without loss',
          type: 'buff',
          value: 0,
          source: 'spirit',
          phasesRemaining: 99,
        },
      ];
      narrative = 'Octopus Escape: You can gracefully exit any bad situation.';
      break;

    case 'Owl': {
      // +$1,500 hidden need + WIS Spirit Bond
      const owlBase = 1500;
      const owlEnhanced = Math.max(0, owlBase + wisMod * 500);
      moneyGained = owlEnhanced;
      narrative = `Owl Wisdom: You spot a hidden need and secure $${owlEnhanced.toLocaleString()} extra.`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 500})`;
      break;
    }

    case 'Tiger': {
      // +$3,000 on next deal + WIS Spirit Bond
      const tigerBase = 3000;
      const tigerEnhanced = Math.max(0, tigerBase + wisMod * 500);
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: `Tiger Strike: +$${tigerEnhanced.toLocaleString()} on next deal`,
          type: 'buff',
          value: tigerEnhanced,
          source: 'spirit',
          phasesRemaining: 99,
        },
      ];
      narrative = `Tiger Strike: Your next deal will be fierce! +$${tigerEnhanced.toLocaleString()}.`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 500})`;
      break;
    }

    case 'Deer':
      // Exit with 50% commission (boolean — no WIS enhancement)
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: 'Deer Grace: Close current deal at 50%',
          type: 'buff',
          value: 50,
          source: 'spirit',
          phasesRemaining: 1,
        },
      ];
      narrative = 'Deer Grace: You can gracefully close at half value.';
      break;

    case 'Spider':
      // Client can\'t damage (reduce) deal this round (boolean — no WIS enhancement)
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: 'Spider Web: Deal value protected this round',
          type: 'buff',
          value: 0,
          source: 'spirit',
          phasesRemaining: 1,
        },
      ];
      narrative = 'Spider Web: Your deal is protected from setbacks.';
      break;

    case 'Whale': {
      // Recover $4,000 + WIS Spirit Bond
      const whaleBase = 4000;
      const whaleEnhanced = Math.max(0, whaleBase + wisMod * 500);
      moneyGained = whaleEnhanced;
      narrative = `Whale Recovery: A big recovery brings in $${whaleEnhanced.toLocaleString()}!`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 500})`;
      break;
    }

    case 'Elephant': {
      // +$1,000 per previous success + WIS Spirit Bond
      const successfulRounds = [
        ...(state.firstClientRounds || []),
        ...(state.whaleRounds || []),
      ].filter(r => r.moneyGained > 0).length;
      const elephantPerSuccess = Math.max(0, 1000 + wisMod * 200);
      moneyGained = successfulRounds * elephantPerSuccess;
      narrative = `Elephant Memory: Your track record earns $${moneyGained.toLocaleString()} (${successfulRounds} × $${elephantPerSuccess.toLocaleString()})!`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 200}/success)`;
      break;
    }

    case 'Frog': {
      // +$800/round for 3 rounds + WIS Spirit Bond
      const frogBase = 800;
      const frogEnhanced = Math.max(0, frogBase + wisMod * 100);
      newState.modifiers = [
        ...newState.modifiers,
        {
          description: `Frog Fortune: +$${frogEnhanced.toLocaleString()} per round for 3 rounds`,
          type: 'buff',
          value: frogEnhanced,
          source: 'spirit',
          phasesRemaining: 3,
        },
      ];
      narrative = `Frog Fortune: Good luck flows! +$${frogEnhanced.toLocaleString()} per round for 3 rounds.`;
      if (wisMod !== 0) narrative += ` (Spirit Bond: ${wisMod > 0 ? '+' : ''}${wisMod * 100}/round)`;
      break;
    }
  }

  newState.money += moneyGained;
  newState.choices = [...newState.choices, `spirit:${spirit}`];

  return {
    state: newState,
    narrative,
    moneyGained: moneyGained > 0 ? moneyGained : undefined,
  };
}

// ============================================================================
// Achievement Generation
// ============================================================================

/**
 * Generate achievement proof data for on-chain storage
 */
export function generateAchievementProof(
  state: SalesGameState,
  blockData: {
    block1Seed: string;
    block1Hash: string;
    block2Seed: string;
    block2Hash: string;
    block3Seed: string;
    block3Hash: string;
    block4Seed: string;
    block4Hash: string;
  }
): SalesAchievementProofData | null {
  if (!state.tier || !isStorableTier(state.tier)) {
    return null;
  }

  const territoryRoll = state.rolls.find(r => r.label === 'territory');
  if (!territoryRoll) {
    return null;
  }

  return {
    characterName: state.character.name,
    characterRollBlockHeight: state.character.rollBlockHeight,
    startingMoney: state.startingMoney,
    finalMoney: state.money,
    tier: state.tier,

    ...blockData,

    territoryRoll,
    firstClientActions: (state.firstClientRounds || []).map(r => r.playerAction),
    whaleActions: (state.whaleRounds || []).map(r => r.playerAction),
    choices: state.choices,

    completedAtBlock: territoryRoll.blockHeight + 4, // Approximate
    timestamp: Date.now(),
  };
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Add a roll to game history
 */
export function recordRoll(state: SalesGameState, roll: GameRoll): SalesGameState {
  return {
    ...state,
    rolls: [...state.rolls, roll],
  };
}

/**
 * Add money (with element bonuses)
 */
export function addMoney(state: SalesGameState, amount: number, isDeal: boolean = false): SalesGameState {
  let bonus = 0;

  if (isDeal) {
    // Fire: +$500 on closed deals
    if (state.character.traits.element === 'Fire') {
      bonus += 500;
    }
    // Metal: +$200 on every deal
    if (state.character.traits.element === 'Metal') {
      bonus += 200;
    }
  }

  return {
    ...state,
    money: state.money + amount + bonus,
  };
}

/**
 * Remove money (with Earth element protection + CON resilience)
 */
export function removeMoney(state: SalesGameState, amount: number): SalesGameState {
  let actualLoss = amount;

  // Earth: -$200 from setbacks
  if (state.character.traits.element === 'Earth') {
    actualLoss = Math.max(0, amount - 200);
  }

  // CON resilience (loss never becomes gain)
  if (actualLoss > 0) {
    actualLoss = Math.max(0, actualLoss - getConAdjustment(state.character));
  }

  return {
    ...state,
    money: state.money - actualLoss,
  };
}

/**
 * Add a modifier
 */
export function addModifier(state: SalesGameState, modifier: ActiveModifier): SalesGameState {
  return {
    ...state,
    modifiers: [...state.modifiers, modifier],
  };
}

/**
 * Get tier display name
 */
export function getTierDisplayName(tier: SalesGameState['tier']): string {
  switch (tier) {
    case 'fired':
      return 'Fired';
    case 'under_review':
      return 'Under Review';
    case 'employed':
      return 'Still Employed';
    case 'promotion':
      return 'Promotion!';
    case 'legendary':
      return 'Legendary Status!';
    default:
      return 'Unknown';
  }
}

/**
 * Get tier description
 */
export function getTierDescription(tier: SalesGameState['tier']): string {
  switch (tier) {
    case 'fired':
      return 'You\'ve been let go. Better luck next quarter.';
    case 'under_review':
      return 'Performance needs improvement. You\'re on probation.';
    case 'employed':
      return 'Solid quarter. You kept your job.';
    case 'promotion':
      return 'Outstanding performance! You\'ve been promoted!';
    case 'legendary':
      return 'Legendary achievement! Your name will be remembered forever!';
    default:
      return '';
  }
}
