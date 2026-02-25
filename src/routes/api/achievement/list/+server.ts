/**
 * GET /api/achievement/list
 *
 * Lists all sales achievements stored on an identity.
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getIdentityContent } from '$lib/server/verus';
import { parseSalesAchievements } from '$lib/vdxf';
import { VDXF_KEYS } from '$lib/config';

export const GET: RequestHandler = async ({ url }) => {
  const identity = url.searchParams.get('identity');

  if (!identity) {
    return json({ error: 'identity is required' }, { status: 400 });
  }

  try {
    // Query using the sales outer key, not the tier label keys
    const salesContent = await getIdentityContent(
      identity,
      0,
      0,
      false,
      0,
      VDXF_KEYS.salesAchievement
    );

    let achievements: any[] = [];

    if (salesContent?.identity?.contentmultimap) {
      achievements = parseSalesAchievements(
        salesContent.identity.contentmultimap as Record<string, unknown>
      );
    }

    return json({
      identity: identity,
      achievements,
    });
  } catch (error) {
    console.error('Error listing sales achievements:', error);
    return json(
      {
        error: error instanceof Error ? error.message : 'Failed to list achievements',
      },
      { status: 500 }
    );
  }
};
