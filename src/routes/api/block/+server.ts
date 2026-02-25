/**
 * Block API Endpoint
 *
 * Provides block data from Verus blockchain.
 *
 * GET /api/block - Returns the latest block
 * GET /api/block?height=N - Returns a specific block by height
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getBlockCount, getBlockByHeight, VerusRpcError } from '$lib/server/verus';
import type { BlockResponse } from '$lib/types';

export const GET: RequestHandler = async ({ url }) => {
  const heightParam = url.searchParams.get('height');

  try {
    if (heightParam) {
      const height = parseInt(heightParam, 10);

      if (isNaN(height) || height < 0) {
        throw error(400, 'Invalid height parameter');
      }

      const block = await getBlockByHeight(height);

      const response: BlockResponse = {
        height: block.height,
        hash: block.hash,
        time: block.time,
      };

      return json(response);
    }

    const height = await getBlockCount();
    const block = await getBlockByHeight(height);

    const response: BlockResponse = {
      height: block.height,
      hash: block.hash,
      time: block.time,
    };

    return json(response);
  } catch (err) {
    if (err instanceof VerusRpcError) {
      if (err.code === -5) {
        throw error(404, 'Block not found');
      }
      throw error(502, `Verus RPC error: ${err.message}`);
    }

    if (err && typeof err === 'object' && 'status' in err) {
      throw err;
    }

    console.error('Block API error:', err);
    throw error(502, 'Failed to fetch block data from Verus');
  }
};
