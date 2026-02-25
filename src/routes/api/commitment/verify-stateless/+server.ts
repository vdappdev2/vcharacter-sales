/**
 * POST /api/commitment/verify-stateless
 *
 * Stateless verification of wallet commitment response.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { VerusIdInterface } from 'verusid-ts-client';
import { LoginConsentResponse } from 'verus-typescript-primitives';
import { createHash } from 'crypto';
import { VERUS_RPC, CHAIN_IDS, COMMITMENT_CONFIG } from '$lib/config';
import { getIdentity, getBlockCount, getBlockByHeight } from '$lib/server/verus';
import { rollCharacter } from '$lib/dice';

function getVerusIdInterface(): VerusIdInterface {
	const chainId = CHAIN_IDS[VERUS_RPC.chainId === 'vrsctest' ? 'testnet' : 'mainnet'];
	return new VerusIdInterface(chainId, VERUS_RPC.endpoint);
}

function sha256(data: string): string {
	return createHash('sha256').update(data).digest('hex');
}

export const POST: RequestHandler = async ({ request }) => {
	try {
		const body = await request.json();
		const { responseData, clientSeed, characterName } = body as {
			responseData: string;
			clientSeed: string;
			characterName?: string;
		};

		if (!responseData) {
			return json({ error: 'responseData is required' }, { status: 400 });
		}

		if (!clientSeed) {
			return json({ error: 'clientSeed is required' }, { status: 400 });
		}

		let response: LoginConsentResponse;
		try {
			const buffer = Buffer.from(responseData, 'base64');
			response = new LoginConsentResponse();
			response.fromBuffer(buffer);
		} catch (err) {
			return json({ error: 'Invalid response data format' }, { status: 400 });
		}

		const verusId = getVerusIdInterface();
		const isValid = await verusId.verifyLoginConsentResponse(response);
		if (!isValid) {
			return json({ error: 'Invalid signature' }, { status: 400 });
		}

		const redirectUris = response.decision?.request?.challenge?.redirect_uris;
		let committedSeedHash: string | null = null;

		if (redirectUris && redirectUris.length > 0) {
			const redirectUri = redirectUris[0];
			const uri = redirectUri?.uri || redirectUri;
			if (typeof uri === 'string' && uri.includes('commitment=')) {
				const urlParams = new URLSearchParams(uri.split('?')[1] || '');
				committedSeedHash = urlParams.get('commitment');
			}
		}

		if (!committedSeedHash) {
			return json({ error: 'No commitment hash found in signed challenge' }, { status: 400 });
		}

		const computedHash = sha256(clientSeed);
		if (computedHash !== committedSeedHash) {
			return json({ error: 'Client seed does not match committed hash' }, { status: 400 });
		}

		const signingId = response.signing_id || '';
		const signature = response.signature?.signature || '';

		if (!signingId || !signature) {
			return json({ error: 'Missing signing identity or signature' }, { status: 400 });
		}

		const sigInfo = await verusId.getSignatureInfo(signingId, signature);
		const commitmentBlockHeight = sigInfo.height;
		const rollBlockHeight = commitmentBlockHeight + COMMITMENT_CONFIG.rollBlockDelay;

		const currentHeight = await getBlockCount();
		if (currentHeight < rollBlockHeight) {
			return json({
				status: 'waiting_block',
				currentHeight,
				rollBlockHeight,
				blocksToWait: rollBlockHeight - currentHeight,
				commitmentBlockHeight,
				userIdentity: signingId,
			});
		}

		const rollBlock = await getBlockByHeight(rollBlockHeight);
		const rollBlockHash = rollBlock.hash;

		let userFriendlyName = signingId;
		try {
			const identityInfo = await getIdentity(signingId);
			userFriendlyName = identityInfo.friendlyname;
		} catch (err) {
			console.error('Failed to look up identity friendly name:', err);
		}

		const diceResult = await rollCharacter(rollBlockHash, clientSeed);

		const storedCharacter = {
			name: characterName || 'Unnamed Hero',
			stats: diceResult.stats,
			traits: diceResult.traits,
			verification: {
				block_height: rollBlockHeight,
				block_hash: rollBlockHash,
				client_seed: clientSeed,
				timestamp: Date.now(),
			},
			userIdentity: signingId,
			userFriendlyName,
			commitment: {
				challenge: JSON.stringify(response.decision?.request?.challenge?.toJson?.() || response.decision?.request?.challenge),
				response: responseData,
				signedBlockHeight: commitmentBlockHeight,
				clientSeedHash: committedSeedHash,
			},
			rollBlockHeight,
			rollBlockHash,
		};

		return json({
			status: 'complete',
			character: storedCharacter,
			verification: {
				commitmentBlockHeight,
				rollBlockHeight,
				rollBlockHash,
				userIdentity: signingId,
				userFriendlyName,
			},
		});
	} catch (error) {
		console.error('Error in stateless verification:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Verification failed' },
			{ status: 500 }
		);
	}
};
