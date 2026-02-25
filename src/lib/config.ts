/**
 * vcharacter-sales Configuration
 *
 * Central configuration for the sales game.
 * Reuses character VDXF keys from vcharacter-prime, adds sales achievement keys.
 */

import { PUBLIC_VERUS_NETWORK, PUBLIC_SWITCH_NETWORK_URL } from '$env/static/public';

// Environment detection
export const isDev = import.meta.env.DEV;
export const isProd = import.meta.env.PROD;

/**
 * Verus RPC Configuration
 */
export const RPC_ENDPOINTS = {
  testnet: {
    primary: 'https://api.verustest.net',
    fallback: 'https://rpc.vrsc.syncproof.net',
  },
  mainnet: {
    primary: 'https://api.verus.services',
    fallback: 'https://rpc.vrsc.syncproof.net',
  },
};

// Current network - read from environment variable
export const CURRENT_NETWORK: 'testnet' | 'mainnet' =
  PUBLIC_VERUS_NETWORK === 'mainnet' ? 'mainnet' : 'testnet';

// URL of the other network's deployment (for the switch link)
export const SWITCH_NETWORK_URL = PUBLIC_SWITCH_NETWORK_URL || '';

export const VERUS_RPC = {
  // Public daemon RPC endpoints (primary with fallback)
  endpoint: RPC_ENDPOINTS[CURRENT_NETWORK].primary,
  fallbackEndpoint: RPC_ENDPOINTS[CURRENT_NETWORK].fallback,

  // Chain ID
  chainId: CURRENT_NETWORK === 'testnet' ? 'vrsctest' : 'vrsc',

  // Request timeout in milliseconds
  timeout: 30000,
};

/**
 * i-address version byte for generating random VerusID i-addresses
 */
export const IADDRESS_VERSION_BYTE = 102;

/**
 * Chain IDs for VerusID
 */
export const CHAIN_IDS = {
  testnet: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq', // VRSCTEST
  mainnet: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV', // VRSC
} as const;

/**
 * VDXF Key Constants for vcharacter-sales
 *
 * Character keys are reused from vcharacter-prime (prime.inaugural.* namespace).
 * Sales achievement keys use the sales.achievement.* namespace.
 *
 * Testnet: testidx.vrsctest:: namespace
 * Mainnet: vcharacter.vrsc:: namespace
 *
 * To generate these IDs, run:
 *   ./verus -chain=vrsctest getvdxfid "testidx.vrsctest::sales.achievement"
 *   ./verus getvdxfid "vcharacter.vrsc::sales.achievement"
 */

// Testnet VDXF Keys (testidx.vrsctest:: namespace)
const TESTNET_VDXF = {
  // Commitment challenge namespace (reused from vcharacter-prime)
  commitment: 'iQQPkGHFazZQq3WGseVmf1Nhwj5m2gKQGU', // testidx.vrsctest::prime.inaugural.commitment

  // Character proof outer key (reused from vcharacter-prime)
  characterProof: 'iFyh3hu51uwFbNSmDxSPZCFzCVKf8rvEtr', // testidx.vrsctest::prime.inaugural

  // Sales achievement outer key
  salesAchievement: 'iLYkyeGjamsFba4PW3K7KXWur3YJvcNViP', // testidx.vrsctest::sales.achievement

  // Sales achievement tier keys
  salesAchievementPromotion: 'iLQ5x8jy8FH2VYGHL1sD1zzGtK8qUFNdVD', // testidx.vrsctest::sales.achievement.promotion
  salesAchievementLegendary: 'iEb7KnHUqx7RvVZqmkwDaHU6nR3jwwQ5nf', // testidx.vrsctest::sales.achievement.legendary

  // Labels (inside DataDescriptor, reused from vcharacter-prime)
  labels: {
    name: 'iEKKM3YbgNvLoXVP4Uya7bsx54d2oQc1iQ',   // testidx.vrsctest::prime.inaugural.name
    stats: 'iNzD4oawft7rG6jfAF6CtzinVAeGbJyt3w',   // testidx.vrsctest::prime.inaugural.stats
    traits: 'iKrjYActmR6ZZfZkXWNDsVHuvyKmwiawSC',  // testidx.vrsctest::prime.inaugural.traits
    proof: 'iKTEgWF5SScKRKwte6YuubSn2iWq5Pc6iM',   // testidx.vrsctest::prime.inaugural.proof
  },
};

// Mainnet VDXF Keys (vcharacter.vrsc:: namespace)
const MAINNET_VDXF = {
  // Commitment challenge namespace (reused from vcharacter-prime)
  commitment: 'iRqdBB5Tsm3PRZj2dTiWnS4iBvhxPg3be4', // vcharacter.vrsc::prime.inaugural.commitment

  // Character proof outer key (reused from vcharacter-prime)
  characterProof: 'iJxgKswyBJofVV5kFSdx4EudSFrtchdVWA', // vcharacter.vrsc::prime.inaugural

  // Sales achievement outer key
  salesAchievement: 'iCtbdFsgWwyppjhYnk5wHFt9wGzS4NfjH1', // vcharacter.vrsc::sales.achievement

  // Sales achievement tier keys
  salesAchievementPromotion: 'iS7EFwQi4Cj8gnYuXKZ1zeAHQrv2uVW4ML', // vcharacter.vrsc::sales.achievement.promotion
  salesAchievementLegendary: 'iESeu4NLCci2fyQbLcewrj1aUzrP8qYujJ', // vcharacter.vrsc::sales.achievement.legendary

  // Labels (reused from vcharacter-prime)
  labels: {
    name: 'i9FPJynBLX8DxnsH58y1UFTpVqR73tCHVL',     // vcharacter.vrsc::prime.inaugural.name
    stats: 'iGmAs4NcqXYAXoZ3G2JJYiijC5VpZ6WtLy',    // vcharacter.vrsc::prime.inaugural.stats
    traits: 'iJKSNMdzaJdAvY6sTUvfA1V9gY8K9NesUP',   // vcharacter.vrsc::prime.inaugural.traits
    proof: 'iPfkFE6wZUzwVo97T25RXq9KS23m1ZCWUW',    // vcharacter.vrsc::prime.inaugural.proof
  },
};

export const VDXF_KEYS = {
  // DataDescriptor wrapper key (same for testnet and mainnet)
  dataDescriptor: 'i4GC1YGEVD21afWudGoFJVdnfjJ5XWnCQv',

  // Network-specific keys
  ...(CURRENT_NETWORK === 'testnet' ? TESTNET_VDXF : MAINNET_VDXF),
};

/**
 * Service Identity Configuration
 *
 * The service identity is used to sign commitment challenges.
 * Testnet: testidx@ (i6V4or9qptD5JzxkqgUKz45tvtBNMb72N3)
 * Mainnet: vcharacter@ (iJPATzocvNM3k9UaCDYjVFarzrG3ujzCup)
 *
 * The private key (WIF) should be set in environment variable SERVICE_IDENTITY_WIF
 * Get it with: ./verus -chain=vrsctest dumpprivkey <primary_address>
 */
export const SERVICE_IDENTITY = {
  name: CURRENT_NETWORK === 'testnet' ? 'testidx@' : 'vcharacter@',
  iAddress: CURRENT_NETWORK === 'testnet' ? 'i6V4or9qptD5JzxkqgUKz45tvtBNMb72N3' : 'iJPATzocvNM3k9UaCDYjVFarzrG3ujzCup',
};

/**
 * Commitment Configuration
 */
export const COMMITMENT_CONFIG = {
  // How long a commitment challenge is valid (10 minutes)
  challengeTTL: 10 * 60 * 1000,

  // How long to keep verified commitments for rolling (15 minutes)
  // Extended to handle high block time variance
  completedTTL: 15 * 60 * 1000,

  // How many blocks to wait after commitment before rolling
  rollBlockDelay: 1,
};

/**
 * App Metadata
 */
export const APP_META = {
  name: 'vcharacter-sales',
  description: 'Sales game proof-of-concept on Verus',
  version: '0.1.0',
  network: CURRENT_NETWORK,
};

/**
 * Sales Game Configuration
 */
export const SALES_CONFIG = {
  // Starting money formula parameters
  baseMoney: 10000,
  chaMultiplier: 2000,
  intMultiplier: 1000,
  wisMultiplier: 500,
  minimumMoney: 3000,

  // Budget scaling: client budgets scale with starting money so achievement
  // thresholds (2x/3x) remain achievable regardless of starting budget.
  // budgetScale = max(budgetScaleFloor, startingMoney / baseMoney)
  budgetScaleFloor: 0.5,

  // Achievement thresholds (multipliers of starting money)
  promotionThreshold: 2.0,  // 2x starting money = Promotion
  legendaryThreshold: 3.0,  // 3x starting money = Legendary

  // VP choice gates Legendary
  vpChoices: {
    safe: { legendaryGated: true, whaleMultiplier: 1.0, failurePenalty: 0 },
    stretch: { legendaryGated: false, whaleMultiplier: 1.25, failurePenalty: 0 },
    allin: { legendaryGated: false, whaleMultiplier: 1.5, failurePenalty: 3000 },
  },
};
