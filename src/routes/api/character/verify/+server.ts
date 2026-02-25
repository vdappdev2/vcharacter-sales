/**
 * GET /api/character/verify
 *
 * Public verification endpoint for characters.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIdentityContent, getBlockByHeight } from '$lib/server/verus';
import { rollCharacter } from '$lib/dice';
import { parseAllCharacters, findCharacterByRollBlockHeight } from '$lib/vdxf';
import { sha256String } from '$lib/crypto';
import { VDXF_KEYS } from '$lib/config';

export const GET: RequestHandler = async ({ url }) => {
  const identity = url.searchParams.get('identity');
  const rollBlockHeightParam = url.searchParams.get('rollBlockHeight');

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
        { error: 'Identity not found', valid: false },
        { status: 404 }
      );
    }

    const contentMultiMap = identityContent.identity?.contentmultimap;

    if (!contentMultiMap || !contentMultiMap[characterProofKey]) {
      return json({
        valid: false,
        error: 'No character proof found on this identity',
      });
    }

    const allCharacters = parseAllCharacters(contentMultiMap as Record<string, unknown>);

    if (allCharacters.length === 0) {
      return json({
        valid: false,
        error: 'Failed to parse character data from identity',
      });
    }

    let characterData;
    if (rollBlockHeightParam) {
      const targetHeight = parseInt(rollBlockHeightParam, 10);
      characterData = findCharacterByRollBlockHeight(contentMultiMap as Record<string, unknown>, targetHeight);
      if (!characterData) {
        return json({
          valid: false,
          error: `No character found with rollBlockHeight ${targetHeight}`,
        });
      }
    } else if (allCharacters.length === 1) {
      characterData = allCharacters[0];
    } else {
      return json({
        valid: false,
        error: 'Multiple characters found. Please specify rollBlockHeight parameter.',
        characters: allCharacters.map(c => ({
          name: c.name,
          rollBlockHeight: c.proof?.rollBlockHeight,
        })),
      });
    }

    const { name, stats, traits, proof } = characterData;

    if (!proof?.clientSeed || !proof?.rollBlockHeight || !proof?.rollBlockHash) {
      return json({
        valid: false,
        error: 'Incomplete character verification data',
      });
    }

    const { clientSeed, clientSeedHash, rollBlockHeight, rollBlockHash, commitmentBlockHeight } = proof;

    let seedHashValid = false;
    if (clientSeedHash) {
      const computedHash = await sha256String(clientSeed);
      seedHashValid = computedHash === clientSeedHash;
    }

    let blockHashValid = false;
    try {
      const blockData = await getBlockByHeight(rollBlockHeight);
      blockHashValid = blockData.hash === rollBlockHash;
    } catch (err) {
      console.error('Error fetching block for verification:', err);
    }

    let statsValid = false;
    let traitsValid = false;

    if (blockHashValid) {
      try {
        const derivedCharacter = await rollCharacter(rollBlockHash, clientSeed);

        if (stats) {
          const storedStats = stats as Record<string, { total: number }>;
          statsValid =
            derivedCharacter.stats.str.total === storedStats.strength?.total &&
            derivedCharacter.stats.dex.total === storedStats.dexterity?.total &&
            derivedCharacter.stats.con.total === storedStats.constitution?.total &&
            derivedCharacter.stats.int.total === storedStats.intelligence?.total &&
            derivedCharacter.stats.wis.total === storedStats.wisdom?.total &&
            derivedCharacter.stats.cha.total === storedStats.charisma?.total;
        }

        if (traits) {
          const storedTraits = traits as Record<string, string>;
          traitsValid =
            derivedCharacter.traits.element === storedTraits.element &&
            derivedCharacter.traits.spiritAnimal === storedTraits.spirit &&
            derivedCharacter.traits.sex === storedTraits.sex;
        }
      } catch (err) {
        console.error('Error re-deriving character:', err);
      }
    }

    const allValid = seedHashValid && blockHashValid && statsValid && traitsValid;

    return json({
      valid: allValid,
      character: {
        name: name || 'Unknown',
        identity: identity,
        identityAddress: identityContent.identity?.identityaddress,
        stats,
        traits,
        verification: {
          clientSeed,
          clientSeedHash,
          rollBlockHeight,
          rollBlockHash,
          commitmentBlockHeight,
        },
      },
      verification: {
        seedHashValid,
        blockHashValid,
        statsValid,
        traitsValid,
        allValid,
      },
    });
  } catch (error) {
    console.error('Error verifying character:', error);
    return json(
      {
        valid: false,
        error: error instanceof Error ? error.message : 'Failed to verify character',
      },
      { status: 500 }
    );
  }
};
