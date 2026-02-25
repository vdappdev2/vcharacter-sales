/**
 * POST /api/achievement/store
 *
 * Creates a storage request for storing sales achievement proof on-chain.
 * Only stores promotion and legendary tiers.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import type { SalesAchievementProofData } from '$lib/sales/types';
import { buildSalesAchievementContentMap } from '$lib/vdxf';
import {
	createSalesAchievementStorageRequest,
	isStorageConfigured,
} from '$lib/server/identityUpdate';
import { getIdentity } from '$lib/server/verus';

export const POST: RequestHandler = async ({ request, url }) => {
	if (!isStorageConfigured()) {
		return json(
			{
				error: 'Storage service not configured.',
			},
			{ status: 503 }
		);
	}

	try {
		const body = await request.json();
		const { achievement, identity } = body as {
			achievement: SalesAchievementProofData;
			identity: string;
		};

		if (!achievement) {
			return json({ error: 'achievement is required' }, { status: 400 });
		}

		if (!identity) {
			return json({ error: 'identity is required' }, { status: 400 });
		}

		// Validate achievement data
		if (!achievement.characterName) {
			return json({ error: 'achievement.characterName is required' }, { status: 400 });
		}
		if (!achievement.characterRollBlockHeight) {
			return json({ error: 'achievement.characterRollBlockHeight is required' }, { status: 400 });
		}
		if (!achievement.tier) {
			return json({ error: 'achievement.tier is required' }, { status: 400 });
		}

		// Only store promotion and legendary
		if (achievement.tier !== 'promotion' && achievement.tier !== 'legendary') {
			return json({ error: 'Only promotion and legendary tiers are stored on-chain' }, { status: 400 });
		}

		// Build callback URL
		const callbackUrl = `${url.origin}/callback/storage?type=sales-achievement&returnTo=/play`;

		// Create the storage request
		const result = await createSalesAchievementStorageRequest(achievement, identity, callbackUrl);

		// Debug output
		console.log('=== Sales Achievement Storage Request Debug ===');
		console.log('Deeplink length:', result.deeplinkUri.length);
		console.log('QR string length:', result.qrString.length);

		// Output manual command
		const identityInfo = await getIdentity(identity);
		const contentmultimap = buildSalesAchievementContentMap(achievement);
		const updateIdentityCmd = {
			name: identityInfo.identity.name,
			parent: identityInfo.identity.parent,
			contentmultimap,
		};
		console.log('\n=== MANUAL SALES ACHIEVEMENT UPDATEIDENTITY COMMAND ===');
		console.log('Copy and paste this command to manually store the achievement:\n');
		console.log(`./verus -chain=vrsctest updateidentity '${JSON.stringify(updateIdentityCmd)}'`);
		console.log('\n=== END COMMAND ===\n');

		return json({
			requestId: result.requestId,
			qrString: result.qrString,
			deeplinkUri: result.deeplinkUri,
		});
	} catch (error) {
		console.error('Error creating sales achievement storage request:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to create storage request' },
			{ status: 500 }
		);
	}
};
