# vcharacter-sales

A sales-themed proof-of-concept game built on the Verus blockchain. Uses characters created in [vcharacter-prime](https://github.com/vcharacter/vcharacter-prime) with money replacing HP.

## Overview

Players use their existing vcharacter-prime characters to play through a 9-phase sales quarter. All six stats matter:

- **CHA, INT, WIS** — determine starting budget
- **STR** — closing bonus in negotiations
- **DEX** — reading clients (negotiation checks)
- **CON** — resistance to setbacks
- **INT, WIS** — round 2+ negotiation bonuses and spirit ability scaling

Top achievements (Promotion at 2x starting money, Legendary at 3x) are stored on-chain as verifiable proofs.

## Features

- Load characters from any VerusID via VDXF data
- 9-phase gameplay: Assignment, First Trip, First Client, Crossroads, Quarter Event, VP Meeting, Whale Prep, The Whale, Quarter End
- Negotiation system with Pitch/Listen/Concede/Ability actions
- Element and spirit animal bonuses
- On-chain achievement storage for Promotion and Legendary tiers
- Verifiable dice rolls using blockchain randomness
- Testnet and mainnet support with network switching

## Tech Stack

- SvelteKit 5 with TypeScript
- Tailwind CSS v4
- Verus RPC (public endpoints with fallback)
- Verus VDXF for data storage/retrieval
- Upstash Redis for cross-device wallet callbacks

## Setup

```bash
yarn install
cp .env.example .env  # Configure your environment
yarn dev
```

## Environment Variables

- `PUBLIC_VERUS_NETWORK` — `testnet` or `mainnet`
- `PUBLIC_SWITCH_NETWORK_URL` — URL of the other network's deployment (optional, for switch link)
- `SERVICE_IDENTITY_WIF` — Private key for signing storage requests (required for on-chain achievement storage)
- `UPSTASH_REDIS_REST_URL` — Redis URL (optional, for cross-device wallet callbacks)
- `UPSTASH_REDIS_REST_TOKEN` — Redis token (optional)

## License

MIT
