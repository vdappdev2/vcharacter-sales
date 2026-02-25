/**
 * GET /api/character/list
 *
 * Lists all characters stored on an identity.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIdentityContent } from '$lib/server/verus';
import { parseAllCharacters } from '$lib/vdxf';
import { VDXF_KEYS } from '$lib/config';

export const GET: RequestHandler = async ({ url }) => {
  const identity = url.searchParams.get('identity');

  if (!identity) {
    return json({ error: 'identity is required' }, { status: 400 });
  }

  try {
    const characterProofKey = VDXF_KEYS.characterProof;
    const identityContent = await getIdentityContent(
      identity,
      0,
      0,
      false,
      0,
      characterProofKey
    );

    if (!identityContent) {
      return json(
        { error: 'Identity not found' },
        { status: 404 }
      );
    }

    const contentMultiMap = identityContent.identity?.contentmultimap;

    if (!contentMultiMap || !contentMultiMap[characterProofKey]) {
      return json({
        identity: identity,
        identityAddress: identityContent.identity?.identityaddress,
        characters: [],
        error: 'No characters found on this identity',
      });
    }

    const allCharacters = parseAllCharacters(contentMultiMap as Record<string, unknown>);

    if (allCharacters.length === 0) {
      return json({
        identity: identity,
        identityAddress: identityContent.identity?.identityaddress,
        characters: [],
        error: 'No valid characters found on this identity',
      });
    }

    // Map parsed characters to StoredCharacter format
    const characters = allCharacters.map(char => {
      // Map stats from parsed format (strength/dexterity/etc) to expected format (str/dex/etc)
      const stats = char.stats ? {
        str: char.stats.strength || { total: 10, dice: [1,1,1,1], modifier: -2 },
        dex: char.stats.dexterity || { total: 10, dice: [1,1,1,1], modifier: -2 },
        con: char.stats.constitution || { total: 10, dice: [1,1,1,1], modifier: -2 },
        int: char.stats.intelligence || { total: 10, dice: [1,1,1,1], modifier: -2 },
        wis: char.stats.wisdom || { total: 10, dice: [1,1,1,1], modifier: -2 },
        cha: char.stats.charisma || { total: 10, dice: [1,1,1,1], modifier: -2 },
      } : {
        str: { total: 10, dice: [1,1,1,1], modifier: -2 },
        dex: { total: 10, dice: [1,1,1,1], modifier: -2 },
        con: { total: 10, dice: [1,1,1,1], modifier: -2 },
        int: { total: 10, dice: [1,1,1,1], modifier: -2 },
        wis: { total: 10, dice: [1,1,1,1], modifier: -2 },
        cha: { total: 10, dice: [1,1,1,1], modifier: -2 },
      };

      return {
        name: char.name || 'Unknown',
        rollBlockHeight: char.proof?.rollBlockHeight || 0,
        rollBlockHash: char.proof?.rollBlockHash || '',
        userIdentity: identityContent.identity?.identityaddress || identity,
        userFriendlyName: identity,
        stats,
        traits: {
          element: char.traits?.element || 'Fire',
          spiritAnimal: char.traits?.spirit || 'Wolf',
          sex: char.traits?.sex || 'Male',
        },
        verification: {
          block_height: char.proof?.rollBlockHeight || 0,
          block_hash: char.proof?.rollBlockHash || '',
          client_seed: char.proof?.clientSeed || '',
          timestamp: Date.now(),
        },
        commitment: {
          challenge: '',
          response: '',
          signedBlockHeight: char.proof?.commitmentBlockHeight || 0,
          clientSeedHash: char.proof?.clientSeedHash || '',
        },
      };
    });

    return json({
      identity: identity,
      identityAddress: identityContent.identity?.identityaddress,
      characters,
    });
  } catch (error) {
    console.error('Error listing characters:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to list characters',
      },
      { status: 500 }
    );
  }
};
