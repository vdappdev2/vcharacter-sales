/**
 * Negotiation Mechanics for Sales Game
 *
 * Handles pitch/listen/concede/ability resolution and body language.
 */

import type { StoredCharacter } from '../types';
import type {
  Client,
  Territory,
  NegotiationAction,
  NegotiationRoundResult,
  BodyLanguage,
  GameRoll,
  ActiveModifier,
  SalesGameState,
} from './types';
import { getTerritoryFavoredStat } from './clients';

// ============================================================================
// Body Language Resolution
// ============================================================================

/**
 * Interpret body language roll (d6)
 */
export function interpretBodyLanguage(roll: number): BodyLanguage {
  if (roll === 1) return 'arms_crossed';
  if (roll === 2) return 'skeptical';
  if (roll === 3 || roll === 4) return 'neutral';
  if (roll === 5) return 'interested';
  return 'engaged'; // 6
}

/**
 * Get body language description
 */
export function getBodyLanguageDescription(bodyLanguage: BodyLanguage): string {
  switch (bodyLanguage) {
    case 'arms_crossed':
      return 'Client crosses arms defensively. Patience -2, Resistance +1';
    case 'skeptical':
      return 'Client looks skeptical. Resistance +2';
    case 'neutral':
      return 'Client maintains a neutral expression.';
    case 'interested':
      return 'Client leans in with interest. Resistance -1';
    case 'engaged':
      return 'Client is fully engaged! Resistance -2, deal value +10%';
  }
}

/**
 * Apply body language effects to client
 */
export function applyBodyLanguage(client: Client, bodyLanguage: BodyLanguage): Client {
  let newPatience = client.patience;
  let newResistance = client.resistance;
  let dealBonus = 0;

  switch (bodyLanguage) {
    case 'arms_crossed':
      newPatience = Math.max(0, client.patience - 2);
      newResistance = client.resistance + 1;
      break;
    case 'skeptical':
      newResistance = client.resistance + 2;
      break;
    case 'neutral':
      // No change
      break;
    case 'interested':
      newResistance = Math.max(5, client.resistance - 1);
      break;
    case 'engaged':
      newResistance = Math.max(5, client.resistance - 2);
      dealBonus = Math.floor(client.dealValue * 0.1);
      break;
  }

  return {
    ...client,
    patience: newPatience,
    resistance: newResistance,
    dealValue: client.dealValue + dealBonus,
    active: newPatience > 0,
  };
}

// ============================================================================
// Body Language Shift (DEX + WIS)
// ============================================================================

/**
 * Shift body language roll based on DEX and WIS modifiers
 *
 * DEX "Read the Room": floor(dexMod / 2) shift every round
 * WIS "Intuition": floor(wisMod / 2) shift from round 2+
 * Result clamped to [1, 6]
 */
export function shiftBodyLanguageRoll(
  rawRoll: number,
  dexMod: number,
  wisMod: number,
  negotiationRound: number
): number {
  let shift = Math.floor(dexMod / 2);
  if (negotiationRound >= 2) {
    shift += Math.floor(wisMod / 2);
  }
  return Math.max(1, Math.min(6, rawRoll + shift));
}

// ============================================================================
// Action Resolution
// ============================================================================

/**
 * Calculate pitch modifier
 * Uses territory favored stat + any buffs + INT from round 2+
 */
export function getPitchModifier(
  character: StoredCharacter,
  territory: Territory,
  modifiers: ActiveModifier[],
  negotiationRound: number = 1
): number {
  // Base modifier is CHA
  let mod = character.stats.cha.modifier;

  // Add territory favored stat if it's higher
  const favoredStat = getTerritoryFavoredStat(territory);
  const favoredMod = character.stats[favoredStat].modifier;

  // Use the higher of CHA or territory stat
  if (favoredMod > mod) {
    mod = favoredMod;
  }

  // INT "Pattern Recognition": from round 2+, add INT modifier (full, can be negative = stale pitches)
  if (negotiationRound >= 2) {
    mod += character.stats.int.modifier;
  }

  // Add any pitch-related buffs
  for (const modifier of modifiers) {
    if (modifier.type === 'buff' && (
      modifier.source === 'travel' ||
      modifier.source === 'listen' ||
      modifier.description.toLowerCase().includes('pitch')
    )) {
      mod += modifier.value;
    }
  }

  return mod;
}

/**
 * Calculate money gained from a successful pitch
 * Base amount depends on client budget and roll margin
 * STR "Closing Power": strModifier * $100 added to value
 */
export function calculatePitchValue(
  client: Client,
  rollTotal: number,
  modifiers: ActiveModifier[],
  strModifier: number = 0
): number {
  // Base value: portion of budget based on how much we beat the DC
  const margin = rollTotal - client.resistance;
  const baseValue = Math.floor(client.budget * 0.15); // 15% of budget per successful pitch

  // Margin bonus: +5% per point over DC, up to +25%
  const marginBonus = Math.min(margin * 0.05, 0.25);
  let value = Math.floor(baseValue * (1 + marginBonus));

  // STR "Closing Power": full modifier * $100 (negative STR reduces value)
  value += strModifier * 100;

  // Apply deal bonuses from modifiers
  for (const modifier of modifiers) {
    if (modifier.type === 'buff' && (
      modifier.source === 'element' ||
      modifier.description.toLowerCase().includes('deal')
    )) {
      value += modifier.value;
    }
  }

  return Math.max(value, 100); // Minimum $100 per successful pitch
}

/**
 * Resolve a pitch action
 */
export function resolvePitch(
  state: SalesGameState,
  client: Client,
  pitchRoll: number,
  bodyLanguageRoll: number,
  negotiationRound: number = 1
): {
  client: Client;
  moneyGained: number;
  narrative: string;
  bodyLanguage: BodyLanguage;
} {
  const modifier = getPitchModifier(state.character, client.territory, state.modifiers, negotiationRound);
  const total = pitchRoll + modifier;
  const success = total >= client.resistance;

  const strMod = state.character.stats.str.modifier;
  const dexMod = state.character.stats.dex.modifier;
  const wisMod = state.character.stats.wis.modifier;
  const intMod = state.character.stats.int.modifier;

  // Apply DEX/WIS body language shift
  const shiftedBodyRoll = shiftBodyLanguageRoll(bodyLanguageRoll, dexMod, wisMod, negotiationRound);
  const bodyLanguage = interpretBodyLanguage(shiftedBodyRoll);
  let updatedClient = applyBodyLanguage(client, bodyLanguage);

  let moneyGained = 0;
  let narrative = '';

  if (success) {
    moneyGained = calculatePitchValue(client, total, state.modifiers, strMod);
    updatedClient = {
      ...updatedClient,
      dealValue: updatedClient.dealValue + moneyGained,
      patience: Math.max(0, updatedClient.patience - 1),
    };

    narrative = `Rolled ${pitchRoll}+${modifier}=${total} vs DC ${client.resistance}. `;
    narrative += `Your pitch lands! You secure $${moneyGained.toLocaleString()} toward the deal.`;
    // STR bonus narrative
    if (strMod !== 0) {
      const strBonus = strMod * 100;
      narrative += strMod > 0
        ? ` Closing power adds $${strBonus.toLocaleString()}.`
        : ` Weak close costs $${Math.abs(strBonus).toLocaleString()}.`;
    }
    narrative += ' ';
  } else {
    updatedClient = {
      ...updatedClient,
      patience: Math.max(0, updatedClient.patience - 1),
    };

    narrative = `Rolled ${pitchRoll}+${modifier}=${total} vs DC ${client.resistance}. `;
    narrative += `Your pitch falls flat. The client is unmoved. `;
  }

  // INT R2+ narrative
  if (negotiationRound >= 2 && intMod !== 0) {
    narrative += intMod > 0
      ? `Pattern recognition: +${intMod} from experience. `
      : `Running out of material: ${intMod} to pitch. `;
  }

  // Body language shift narrative
  const bodyShift = shiftedBodyRoll - bodyLanguageRoll;
  if (bodyShift !== 0) {
    const dexShift = Math.floor(dexMod / 2);
    const wisShift = negotiationRound >= 2 ? Math.floor(wisMod / 2) : 0;
    const parts: string[] = [];
    if (dexShift !== 0) parts.push(`DEX ${dexShift > 0 ? '+' : ''}${dexShift}`);
    if (wisShift !== 0) parts.push(`WIS ${wisShift > 0 ? '+' : ''}${wisShift}`);
    if (parts.length > 0) {
      narrative += `Body language shifted by ${parts.join(', ')}. `;
    }
  }

  narrative += getBodyLanguageDescription(bodyLanguage);

  // Check if client leaves
  if (updatedClient.patience <= 0) {
    updatedClient.active = false;
    narrative += ' The client has run out of patience and leaves.';
  }

  return {
    client: updatedClient,
    moneyGained,
    narrative,
    bodyLanguage,
  };
}

/**
 * Resolve a listen action
 * Grants +2 to next pitch, +4 defense (reduces resistance temporarily)
 */
export function resolveListen(
  state: SalesGameState,
  client: Client,
  bodyLanguageRoll: number,
  negotiationRound: number = 1
): {
  client: Client;
  modifier: ActiveModifier;
  narrative: string;
  bodyLanguage: BodyLanguage;
} {
  const dexMod = state.character.stats.dex.modifier;
  const wisMod = state.character.stats.wis.modifier;

  // Apply DEX/WIS body language shift
  const shiftedBodyRoll = shiftBodyLanguageRoll(bodyLanguageRoll, dexMod, wisMod, negotiationRound);
  const bodyLanguage = interpretBodyLanguage(shiftedBodyRoll);
  let updatedClient = applyBodyLanguage(client, bodyLanguage);

  // Create listen buff (lasts 1 round)
  const modifier: ActiveModifier = {
    description: 'Listen Bonus: +2 to next pitch',
    type: 'buff',
    value: 2,
    source: 'listen',
    phasesRemaining: 1,
  };

  let narrative = `You listen carefully to the client's needs. +2 to your next pitch. `;

  // Body language shift narrative
  const bodyShift = shiftedBodyRoll - bodyLanguageRoll;
  if (bodyShift !== 0) {
    const dexShift = Math.floor(dexMod / 2);
    const wisShift = negotiationRound >= 2 ? Math.floor(wisMod / 2) : 0;
    const parts: string[] = [];
    if (dexShift !== 0) parts.push(`DEX ${dexShift > 0 ? '+' : ''}${dexShift}`);
    if (wisShift !== 0) parts.push(`WIS ${wisShift > 0 ? '+' : ''}${wisShift}`);
    if (parts.length > 0) {
      narrative += `Body language shifted by ${parts.join(', ')}. `;
    }
  }

  narrative += getBodyLanguageDescription(bodyLanguage);

  return {
    client: updatedClient,
    modifier,
    narrative,
    bodyLanguage,
  };
}

/**
 * Resolve a concede action
 * Close at 80% of accumulated deal value, guaranteed success
 */
export function resolveConcede(
  client: Client
): {
  client: Client;
  moneyGained: number;
  narrative: string;
} {
  const concedeValue = Math.floor(client.dealValue * 0.8);

  const updatedClient: Client = {
    ...client,
    active: false,
  };

  const narrative = `You offer favorable terms to close the deal. The client accepts. You secure $${concedeValue.toLocaleString()} (80% of ${client.dealValue.toLocaleString()}).`;

  return {
    client: updatedClient,
    moneyGained: concedeValue,
    narrative,
  };
}

/**
 * Get negotiation outcome
 */
export function getNegotiationOutcome(client: Client): 'ongoing' | 'closed' | 'lost' {
  if (!client.active) {
    if (client.dealValue > 0) {
      return 'closed';
    }
    return 'lost';
  }
  return 'ongoing';
}

/**
 * Close negotiation with current deal value
 */
export function closeNegotiation(client: Client): number {
  return client.dealValue;
}

// ============================================================================
// Negotiation Round Resolution
// ============================================================================

/**
 * Resolve a complete negotiation round
 */
export function resolveNegotiationRound(
  state: SalesGameState,
  client: Client,
  action: NegotiationAction,
  pitchRoll?: GameRoll,
  bodyLanguageRoll?: GameRoll
): {
  result: NegotiationRoundResult;
  updatedClient: Client;
  modifierToAdd?: ActiveModifier;
} {
  const round = (state.firstClient === client)
    ? (state.firstClientRounds?.length || 0) + 1
    : (state.whaleRounds?.length || 0) + 1;

  let updatedClient = client;
  let moneyGained = 0;
  let narrative = '';
  let bodyLanguage: BodyLanguage | undefined;
  let modifierToAdd: ActiveModifier | undefined;

  switch (action) {
    case 'pitch': {
      if (!pitchRoll || !bodyLanguageRoll) {
        throw new Error('Pitch action requires both pitch and body language rolls');
      }
      const result = resolvePitch(state, client, pitchRoll.result, bodyLanguageRoll.result, round);
      updatedClient = result.client;
      moneyGained = result.moneyGained;
      narrative = result.narrative;
      bodyLanguage = result.bodyLanguage;
      break;
    }
    case 'listen': {
      if (!bodyLanguageRoll) {
        throw new Error('Listen action requires body language roll');
      }
      const result = resolveListen(state, client, bodyLanguageRoll.result, round);
      updatedClient = result.client;
      narrative = result.narrative;
      bodyLanguage = result.bodyLanguage;
      modifierToAdd = result.modifier;
      break;
    }
    case 'concede': {
      const result = resolveConcede(client);
      updatedClient = result.client;
      moneyGained = result.moneyGained;
      narrative = result.narrative;
      break;
    }
    case 'ability': {
      // Spirit ability is handled separately in engine
      narrative = 'Spirit ability activated.';
      break;
    }
  }

  const roundResult: NegotiationRoundResult = {
    round,
    playerAction: action,
    pitchRoll,
    bodyLanguageRoll,
    bodyLanguage,
    moneyGained,
    narrative,
    patienceAfter: updatedClient.patience,
    resistanceAfter: updatedClient.resistance,
    dealValueAfter: updatedClient.dealValue,
  };

  return {
    result: roundResult,
    updatedClient,
    modifierToAdd,
  };
}
