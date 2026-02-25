<script lang="ts">
	import { onMount } from 'svelte';
	import QRCode from 'qrcode';
	import type { StoredCharacter } from '$lib/types';
	import type {
		SalesGameState,
		Phase,
		Territory,
		TravelChoice,
		CrossroadsChoice,
		VPChoice,
		WhaleInvestment,
		NegotiationAction,
		Client,
		GameRoll,
		NegotiationRoundResult,
	} from '$lib/sales/types';
	import {
		createSalesGameState,
		advancePhase,
		assignTerritory,
		applyTravelChoice,
		applyJourneyEvent,
		applyDriveTrouble,
		initFirstClient,
		completeFirstClient,
		applyCrossroadsChoice,
		applyQuarterEvent,
		applyVPChoice,
		applyWhaleInvestment,
		applyLuckyItem,
		initWhaleClient,
		completeWhale,
		calculateTier,
		useSpiritAbility,
		isStorableTier,
		getTierDisplayName,
		getTierDescription,
		recordRoll,
	} from '$lib/sales/engine';
	import {
		resolveNegotiationRound,
		getNegotiationOutcome,
	} from '$lib/sales/negotiation';
	import { generateClientSeed, hashClientSeed } from '$lib/crypto';
	import { deriveDice } from '$lib/dice';

	// ============================================================================
	// Types
	// ============================================================================

	type ViewState = 'loading' | 'playing' | 'game-over' | 'error';
	type PlayingSubState = 'waiting-block' | 'phase-active' | 'negotiating' | 'phase-result';

	// ============================================================================
	// State
	// ============================================================================

	let viewState: ViewState = $state('loading');
	let playingSubState: PlayingSubState = $state('phase-active');
	let character: StoredCharacter | null = $state(null);
	let gameState: SalesGameState | null = $state(null);
	let error = $state('');

	// Block waiting state
	let currentBlockHeight = $state(0);
	let targetBlockHeight = $state(0);
	let blockSeeds: string[] = $state([]);
	let blockHashes: string[] = $state([]);

	// Phase-specific UI state
	let phaseNarrative = $state('');
	let pendingChoice: string | null = $state(null);

	// Negotiation state
	let currentClient: Client | null = $state(null);
	let negotiationRound = $state(0);
	let negotiationHistory: NegotiationRoundResult[] = $state([]);

	// Achievement storage state
	let achievementQR = $state('');
	let achievementDeeplink = $state('');
	let achievementQRImage = $state('');
	let storageRequestId = $state('');

	// ============================================================================
	// Narrative Constants
	// ============================================================================

	const PHASE_NARRATIVES = {
		assignment: {
			intro: "Your first day at vSales Inc. The VP calls you into her office to give you your territory assignment.",
			waiting: "Rolling the dice on your fate...",
		},
		first_trip: {
			intro: "Time to hit the road. How you travel sets the tone for your quarter.",
		},
		first_client: {
			intro: "You walk into the meeting room. Your first client is waiting. Make a good impression.",
		},
		crossroads: {
			intro: "Mid-quarter check-in. The VP asks about your strategy for the rest of Q1.",
		},
		quarter_event: {
			intro: "Breaking news hits the market...",
		},
		vp_meeting: {
			intro: "The VP calls you in for your performance review. She wants to know how aggressive you're willing to be.",
		},
		whale_prep: {
			intro: "Word comes down: there's a whale client interested. This could make or break your quarter.",
		},
		whale: {
			intro: "The big meeting. This client could change everything.",
		},
		quarter_end: {
			intro: "Quarter close. Time to tally the numbers.",
		},
	};

	// ============================================================================
	// Lifecycle
	// ============================================================================

	onMount(() => {
		const stored = sessionStorage.getItem('selectedCharacter');
		if (!stored) {
			window.location.href = '/';
			return;
		}

		try {
			character = JSON.parse(stored);
			if (character) {
				gameState = createSalesGameState(character);
				viewState = 'playing';
				startPhase1();
			}
		} catch {
			error = 'Failed to load character';
			viewState = 'error';
		}
	});

	// ============================================================================
	// Block Management
	// ============================================================================

	async function getCurrentBlock(): Promise<{ height: number; hash: string }> {
		const response = await fetch('/api/block');
		const data = await response.json();
		if (!response.ok) throw new Error(data.error || 'Failed to get block');
		return { height: data.height, hash: data.hash };
	}

	async function getBlockAtHeight(height: number): Promise<{ hash: string }> {
		const response = await fetch(`/api/game/block?height=${height}`);
		const data = await response.json();
		if (!response.ok) throw new Error(data.error || 'Failed to get block');
		return { hash: data.hash };
	}

	async function waitForBlock(targetHeight: number): Promise<string> {
		targetBlockHeight = targetHeight;
		playingSubState = 'waiting-block';

		while (true) {
			const { height, hash } = await getCurrentBlock();
			currentBlockHeight = height;

			if (height >= targetHeight) {
				const targetBlock = await getBlockAtHeight(targetHeight);
				return targetBlock.hash;
			}

			await new Promise(resolve => setTimeout(resolve, 30000));
		}
	}

	// ============================================================================
	// Dice Rolling
	// ============================================================================

	function rollDice(seed: string, blockHash: string, label: string, dieSize: number): number {
		return deriveDice(seed, blockHash, label, dieSize);
	}

	function createGameRoll(
		label: string,
		action: string,
		seed: string,
		blockHeight: number,
		blockHash: string,
		dieSize: number,
		modifier: number = 0,
		target?: number
	): GameRoll {
		const result = rollDice(seed, blockHash, label, dieSize);
		const total = result + modifier;

		let outcome: 'success' | 'fail' | 'critical' = 'success';
		if (target !== undefined) {
			outcome = total >= target ? 'success' : 'fail';
			if (dieSize === 20 && result === 20) outcome = 'critical';
		}

		return {
			label,
			action,
			rollSeed: seed,
			rollSeedHash: hashClientSeed(seed),
			blockHeight,
			blockHash,
			dieSize,
			result,
			modifier,
			total,
			target,
			outcome,
			timestamp: Date.now(),
		};
	}

	// ============================================================================
	// Phase 1: Assignment
	// ============================================================================

	async function startPhase1() {
		if (!gameState) return;

		phaseNarrative = PHASE_NARRATIVES.assignment.intro;
		playingSubState = 'waiting-block';

		const seed1 = generateClientSeed();
		blockSeeds = [seed1];

		const { height } = await getCurrentBlock();
		const block1Hash = await waitForBlock(height + 1);
		blockHashes = [block1Hash];

		const territoryRoll = createGameRoll('territory', 'Territory Assignment', seed1, height + 1, block1Hash, 6);
		gameState = recordRoll(gameState, territoryRoll);
		gameState = assignTerritory(gameState, territoryRoll.result);

		const journeyRoll = createGameRoll('journey', 'Journey Event', seed1, height + 1, block1Hash, 6);
		gameState = recordRoll(gameState, journeyRoll);

		const driveRoll = createGameRoll('drive_trouble', 'Drive Trouble', seed1, height + 1, block1Hash, 6);
		gameState = recordRoll(gameState, driveRoll);

		const luckyRoll = createGameRoll('lucky_item', 'Lucky Item', seed1, height + 1, block1Hash, 6);
		gameState = recordRoll(gameState, luckyRoll);

		const territoryNames: Record<Territory, string> = {
			tech: 'Technology',
			retail: 'Retail',
			finance: 'Financial Services',
		};
		const territoryStats: Record<Territory, string> = {
			tech: 'Intelligence',
			retail: 'Charisma',
			finance: 'Wisdom',
		};

		phaseNarrative = `"You're assigned to ${territoryNames[gameState.territory!]}," the VP says. "Your ${territoryStats[gameState.territory!]} will serve you well there. Don't disappoint me."`;
		playingSubState = 'phase-result';
	}

	function advanceToPhase2() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		phaseNarrative = PHASE_NARRATIVES.first_trip.intro;
		playingSubState = 'phase-active';
	}

	// ============================================================================
	// Phase 2: First Trip
	// ============================================================================

	function chooseTravelOption(choice: TravelChoice) {
		if (!gameState) return;

		gameState = applyTravelChoice(gameState, choice);

		const journeyRoll = gameState.rolls.find(r => r.label === 'journey');
		if (journeyRoll) {
			gameState = applyJourneyEvent(gameState, journeyRoll.result);
		}

		if (choice === 'drive') {
			const driveRoll = gameState.rolls.find(r => r.label === 'drive_trouble');
			if (driveRoll) {
				gameState = applyDriveTrouble(gameState, driveRoll.result);
			}
		}

		let narrative = '';
		if (choice === 'fly') {
			narrative = `You book first class. The extra legroom and lounge access cost $800, but you arrive refreshed and ready. +2 bonus on your first negotiation.`;
		} else if (choice === 'train') {
			narrative = `You take the train for $200. Comfortable, reliable, and you catch up on emails during the ride.`;
		} else {
			narrative = `You decide to drive, costing $50 in gas and tolls. `;
			const driveEvents: Record<string, string> = {
				breakdown: 'Your car breaks down on the highway. $400 in emergency repairs.',
				traffic: 'Brutal traffic. You arrive late and flustered.',
				fine: 'A speed trap catches you. $150 ticket.',
				shortcut: 'You find a shortcut that saves time and gas. +$100.',
				scenic: 'The scenic route clears your mind. +1 to your first pitch.',
				podcasts: 'You binge sales podcasts the whole way. +2 to your first pitch!',
			};
			narrative += driveEvents[gameState.driveTrouble || 'traffic'];
		}

		const journeyEvents: Record<string, string> = {
			contacts: ' Along the way, you make valuable contacts. +$300.',
			intel: ' You pick up useful market intel. +1 to next pitch.',
			luggage: ' Your luggage gets lost. -$100 replacing essentials.',
			leads: ' A fellow traveler gives you promising leads. +$500.',
			delays: '',
			smooth: '',
		};
		narrative += journeyEvents[gameState.journeyEvent || 'delays'];

		phaseNarrative = narrative;
		playingSubState = 'phase-result';
	}

	function advanceToPhase3() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		startNegotiation('first');
	}

	// ============================================================================
	// Phase 3 & 8: Negotiation
	// ============================================================================

	async function startNegotiation(type: 'first' | 'whale') {
		if (!gameState) return;

		playingSubState = 'waiting-block';
		phaseNarrative = type === 'first'
			? PHASE_NARRATIVES.first_client.intro
			: PHASE_NARRATIVES.whale.intro;

		const seed = generateClientSeed();
		const seedIndex = type === 'first' ? 1 : 3;
		blockSeeds[seedIndex] = seed;

		const { height } = await getCurrentBlock();
		const blockHash = await waitForBlock(height + 1);
		blockHashes[seedIndex] = blockHash;

		const clientRoll = rollDice(seed, blockHash, `${type}_client`, 6);
		if (type === 'first') {
			gameState = initFirstClient(gameState, clientRoll);
			currentClient = gameState.firstClient!;
		} else {
			gameState = initWhaleClient(gameState, clientRoll);
			currentClient = gameState.whaleClient!;
		}

		negotiationRound = 0;
		negotiationHistory = [];
		playingSubState = 'negotiating';
	}

	async function performNegotiationAction(action: NegotiationAction) {
		if (!gameState || !currentClient) return;

		negotiationRound++;
		const type = gameState.currentPhase === 'first_client' ? 'first' : 'whale';
		const seedIndex = type === 'first' ? 1 : 3;
		const seed = blockSeeds[seedIndex];
		const blockHash = blockHashes[seedIndex];
		const blockHeight = targetBlockHeight;

		let pitchRoll: GameRoll | undefined;
		let bodyRoll: GameRoll | undefined;

		if (action === 'pitch') {
			pitchRoll = createGameRoll(
				`${type}_r${negotiationRound}_pitch`,
				'Pitch',
				seed,
				blockHeight,
				blockHash,
				20,
				gameState.character.stats.cha.modifier,
				currentClient.resistance
			);
			gameState = recordRoll(gameState, pitchRoll);

			bodyRoll = createGameRoll(
				`${type}_r${negotiationRound}_body`,
				'Body Language',
				seed,
				blockHeight,
				blockHash,
				6
			);
			gameState = recordRoll(gameState, bodyRoll);
		} else if (action === 'listen') {
			bodyRoll = createGameRoll(
				`${type}_r${negotiationRound}_body`,
				'Body Language',
				seed,
				blockHeight,
				blockHash,
				6
			);
			gameState = recordRoll(gameState, bodyRoll);
		} else if (action === 'ability' && !gameState.spiritAbilityUsed) {
			const abilityResult = useSpiritAbility(gameState);
			gameState = abilityResult.state;
			negotiationHistory = [...negotiationHistory, {
				round: negotiationRound,
				playerAction: 'ability',
				moneyGained: abilityResult.moneyGained || 0,
				narrative: abilityResult.narrative,
				patienceAfter: currentClient.patience,
				resistanceAfter: currentClient.resistance,
				dealValueAfter: currentClient.dealValue,
			}];
			return;
		}

		const { result, updatedClient, modifierToAdd } = resolveNegotiationRound(
			gameState,
			currentClient,
			action,
			pitchRoll,
			bodyRoll
		);

		currentClient = updatedClient;

		if (type === 'first') {
			gameState = { ...gameState, firstClient: updatedClient, firstClientRounds: [...(gameState.firstClientRounds || []), result] };
		} else {
			gameState = { ...gameState, whaleClient: updatedClient, whaleRounds: [...(gameState.whaleRounds || []), result] };
		}

		if (modifierToAdd) {
			gameState = { ...gameState, modifiers: [...gameState.modifiers, modifierToAdd] };
		}

		negotiationHistory = [...negotiationHistory, result];

		const outcome = getNegotiationOutcome(updatedClient);
		if (outcome !== 'ongoing') {
			completeCurrentNegotiation();
		}
	}

	function completeCurrentNegotiation() {
		if (!gameState || !currentClient) return;

		const type = gameState.currentPhase === 'first_client' ? 'first' : 'whale';

		if (type === 'first') {
			gameState = completeFirstClient(gameState);
		} else {
			gameState = completeWhale(gameState);
		}

		const outcome = getNegotiationOutcome(currentClient);
		if (outcome === 'closed') {
			phaseNarrative = `Deal closed! You secured $${currentClient.dealValue.toLocaleString()} from ${currentClient.name}. Not bad.`;
		} else {
			phaseNarrative = `${currentClient.name} walked out. No deal this time. Learn from it.`;
		}

		currentClient = null;
		playingSubState = 'phase-result';
	}

	function advanceToPhase4() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		phaseNarrative = PHASE_NARRATIVES.crossroads.intro;
		playingSubState = 'phase-active';
	}

	// ============================================================================
	// Phase 4: Crossroads
	// ============================================================================

	async function chooseCrossroads(choice: CrossroadsChoice) {
		if (!gameState) return;

		playingSubState = 'waiting-block';
		phaseNarrative = 'Executing your strategy...';

		const seed = generateClientSeed();
		blockSeeds[2] = seed;

		const { height } = await getCurrentBlock();
		const blockHash = await waitForBlock(height + 1);
		blockHashes[2] = blockHash;

		const crossroadsRoll = createGameRoll(
			'crossroads_check',
			'Crossroads Check',
			seed,
			height + 1,
			blockHash,
			20,
			0,
			choice === 'grind' ? 10 : choice === 'climb' ? 14 : 16
		);
		gameState = recordRoll(gameState, crossroadsRoll);
		gameState = applyCrossroadsChoice(gameState, choice, crossroadsRoll.result);

		const quarterRoll = createGameRoll('quarter_event', 'Quarter Event', seed, height + 1, blockHash, 6);
		gameState = recordRoll(gameState, quarterRoll);

		const dcMap = { grind: 10, climb: 14, hunt: 16 };
		const dc = dcMap[choice];
		let narrative = '';

		if (choice === 'grind') {
			narrative = gameState.crossroadsResult === 'success'
				? `You put in the hours, hit the phones, work the leads. It pays off. +$1,500.`
				: `Long hours, but the market's tough. You scrape together $800.`;
		} else if (choice === 'climb') {
			narrative = gameState.crossroadsResult === 'success'
				? `Your networking lands you a meeting with the Regional Director. Doors open. +$2,500.`
				: `The corporate ladder proves slippery. You get $200 for your trouble.`;
		} else {
			narrative = gameState.crossroadsResult === 'success'
				? `Your research uncovers exactly what the whale client needs. +4 to whale negotiations.`
				: `Your whale research comes up empty. -2 to whale negotiations.`;
		}

		phaseNarrative = narrative + ` (Rolled ${crossroadsRoll.result} vs DC ${dc})`;
		playingSubState = 'phase-result';
	}

	function advanceToPhase5() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		applyQuarterEventPhase();
	}

	// ============================================================================
	// Phase 5: Quarter Event
	// ============================================================================

	function applyQuarterEventPhase() {
		if (!gameState) return;

		const quarterRoll = gameState.rolls.find(r => r.label === 'quarter_event');
		if (quarterRoll) {
			gameState = applyQuarterEvent(gameState, quarterRoll.result);
		}

		const eventNarratives: Record<string, string> = {
			crash: 'Market crash! The economy tanks and clients tighten budgets. -$1,500.',
			competitor: 'A competitor undercuts your biggest prospect. -$1,000.',
			recall: 'Product recall announced. Clients are spooked. -$500.',
			quiet: 'A quiet news cycle. Business continues as usual.',
			press: 'Positive press coverage boosts your company\'s reputation. +$800.',
			referral: 'A satisfied customer sends you a referral. +$500.',
		};

		phaseNarrative = eventNarratives[gameState.quarterEvent || 'quiet'];
		playingSubState = 'phase-result';
	}

	function advanceToPhase6() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		phaseNarrative = PHASE_NARRATIVES.vp_meeting.intro;
		playingSubState = 'phase-active';
	}

	// ============================================================================
	// Phase 6: VP Meeting
	// ============================================================================

	function chooseVPTarget(choice: VPChoice) {
		if (!gameState) return;

		gameState = applyVPChoice(gameState, choice);

		const narratives: Record<VPChoice, string> = {
			safe: '"Playing it safe, huh?" The VP nods. "Consistent is good. But don\'t expect a promotion." Legendary status is locked. Whale deals count at 1x.',
			stretch: '"Ambitious. I like it." The VP smiles. "Hit your numbers and we\'ll talk about that corner office." Legendary possible. Whale deals at 1.25x.',
			allin: '"All or nothing?" The VP raises an eyebrow. "Bold. Don\'t let me down." Legendary possible. Whale at 1.5x. But if you fail the whale, you lose $3,000.',
		};

		phaseNarrative = narratives[choice];
		playingSubState = 'phase-result';
	}

	function advanceToPhase7() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		phaseNarrative = PHASE_NARRATIVES.whale_prep.intro;
		playingSubState = 'phase-active';
	}

	// ============================================================================
	// Phase 7: Whale Prep
	// ============================================================================

	function chooseWhalePrep(investment: WhaleInvestment) {
		if (!gameState) return;

		gameState = applyWhaleInvestment(gameState, investment);

		const luckyRoll = gameState.rolls.find(r => r.label === 'lucky_item');
		if (luckyRoll) {
			gameState = applyLuckyItem(gameState, luckyRoll.result);
		}

		const prepNarratives: Record<WhaleInvestment, string> = {
			research: 'You dig deep into the client\'s background, spending $400 on reports and data. +2 to Listen actions.',
			gift: 'You send an impressive gift basket, $600. The whale\'s assistant mentions they loved it. +1 to all checks, +2 patience.',
			dinner: 'You arrange a pre-meeting dinner, $800. Over wine, you learn their real pain points. -2 resistance.',
			wingit: 'You decide to wing it. Save your money, trust your instincts.',
		};

		const luckyNarratives: Record<string, string> = {
			watch: ' You find your lucky watch in your bag. +$200 confidence boost.',
			spill: ' Coffee spills on your shirt. -$50 for dry cleaning.',
			clover: ' A four-leaf clover in the parking lot. Good omen. +1 to pitches.',
			usb: ' You find a USB with competitor intel. +1 to pitches.',
			parking: ' Front-row parking spot. You arrive fresh and confident.',
			bird: ' A bird lands on your shoulder in the parking lot. Weird, but +$100.',
		};

		phaseNarrative = prepNarratives[investment] + (luckyNarratives[gameState.luckyItem || ''] || '');
		playingSubState = 'phase-result';
	}

	function advanceToPhase8() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		startNegotiation('whale');
	}

	// ============================================================================
	// Phase 9: Quarter End
	// ============================================================================

	function advanceToPhase9() {
		if (!gameState) return;
		gameState = advancePhase(gameState);
		gameState = calculateTier(gameState);
		viewState = 'game-over';
	}

	// ============================================================================
	// Achievement Storage
	// ============================================================================

	async function storeAchievement() {
		if (!gameState || !character || !isStorableTier(gameState.tier)) return;

		try {
			const response = await fetch('/api/achievement/store', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					identity: character.userIdentity,
					achievement: {
						characterName: character.name,
						characterRollBlockHeight: character.rollBlockHeight,
						startingMoney: gameState.startingMoney,
						finalMoney: gameState.money,
						tier: gameState.tier,
						block1Seed: blockSeeds[0],
						block1Hash: blockHashes[0],
						block2Seed: blockSeeds[1],
						block2Hash: blockHashes[1],
						block3Seed: blockSeeds[2],
						block3Hash: blockHashes[2],
						block4Seed: blockSeeds[3],
						block4Hash: blockHashes[3],
						territoryRoll: gameState.rolls.find(r => r.label === 'territory'),
						firstClientActions: (gameState.firstClientRounds || []).map(r => r.playerAction),
						whaleActions: (gameState.whaleRounds || []).map(r => r.playerAction),
						choices: gameState.choices,
						completedAtBlock: targetBlockHeight,
						timestamp: Date.now(),
					},
				}),
			});

			const data = await response.json();
			if (data.error) throw new Error(data.error);

			achievementQR = data.qrString;
			achievementDeeplink = data.deeplinkUri;
			storageRequestId = data.requestId;

			// Generate QR code image
			try {
				achievementQRImage = await QRCode.toDataURL(data.qrString, {
					width: 512,
					margin: 2,
					errorCorrectionLevel: 'L',
					color: { dark: '#000000', light: '#ffffff' },
				});
			} catch (qrErr) {
				console.error('Failed to generate QR code:', qrErr);
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to prepare achievement storage';
		}
	}

	function playAgain() {
		sessionStorage.removeItem('selectedCharacter');
		window.location.href = '/';
	}

	// ============================================================================
	// Computed values
	// ============================================================================

	const moneyDisplay = $derived.by(() => {
		if (!gameState) return '$0';
		return `$${gameState.money.toLocaleString()}`;
	});
	const startingDisplay = $derived.by(() => {
		if (!gameState) return '$0';
		return `$${gameState.startingMoney.toLocaleString()}`;
	});
	const promotionTarget = $derived.by(() => gameState ? gameState.startingMoney * 2 : 0);
	const legendaryTarget = $derived.by(() => gameState ? gameState.startingMoney * 3 : 0);
	const promotionProgress = $derived.by(() => {
		if (!gameState) return 0;
		return Math.min(100, (gameState.money / promotionTarget) * 100);
	});
	const legendaryProgress = $derived.by(() => {
		if (!gameState) return 0;
		return Math.min(100, (gameState.money / legendaryTarget) * 100);
	});

	const phaseNames: Record<Phase, string> = {
		assignment: 'Territory Assignment',
		first_trip: 'Travel',
		first_client: 'First Client',
		crossroads: 'Mid-Quarter Strategy',
		quarter_event: 'Market News',
		vp_meeting: 'VP Review',
		whale_prep: 'Whale Preparation',
		whale: 'The Whale',
		quarter_end: 'Quarter Close',
	};

	const phaseNumber = $derived.by(() => {
		if (!gameState) return 1;
		return Object.keys(phaseNames).indexOf(gameState.currentPhase) + 1;
	});
</script>

<main class="container mx-auto px-4 py-8 max-w-4xl">
	{#if viewState === 'loading'}
		<div class="card text-center py-12">
			<div class="loading-spinner mx-auto mb-5"></div>
			<p class="text-secondary text-lg">Preparing your quarter...</p>
		</div>
	{:else if viewState === 'error'}
		<div class="card text-center">
			<p class="text-[var(--color-error)] text-lg mb-5">{error}</p>
			<button class="btn btn-secondary" onclick={playAgain}>Return Home</button>
		</div>
	{:else if viewState === 'playing' && gameState}
		<!-- Exit Button -->
		<div class="mb-4">
			<button class="text-sm text-secondary hover:text-[var(--color-error)] transition-colors" onclick={playAgain}>
				&larr; Exit Game
			</button>
		</div>

		<!-- Money Bar -->
		<div class="card mb-6">
			<!-- Primary: Character & Current Balance -->
			<div class="grid grid-cols-2 gap-4 mb-8 py-6">
				<div class="text-center">
					<p class="text-sm text-secondary uppercase tracking-widest mb-2">vCharacter</p>
					<p class="text-3xl md:text-4xl text-accent font-bold tracking-tight leading-none">{gameState.character.name}</p>
				</div>
				<div class="text-center">
					<p class="text-sm text-secondary uppercase tracking-widest mb-2">Current Total</p>
					<p class="text-3xl md:text-4xl text-[var(--color-money)] font-bold tracking-tight leading-none" style="font-family: var(--font-mono);">{moneyDisplay}</p>
				</div>
			</div>

			<!-- Secondary: Progress toward goals -->
			<div class="space-y-4 mb-4">
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-secondary">Promotion</span>
						<span class="text-[var(--color-success)]">${promotionTarget.toLocaleString()}</span>
					</div>
					<div class="h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
						<div
							class="h-full bg-[var(--color-success)] transition-all rounded-full"
							style="width: {promotionProgress}%"
						></div>
					</div>
				</div>
				<div>
					<div class="flex justify-between text-sm mb-1">
						<span class="text-secondary">Legendary</span>
						<span class="text-[var(--color-gold)]">${legendaryTarget.toLocaleString()}</span>
					</div>
					<div class="h-2 bg-[var(--color-surface-elevated)] rounded-full overflow-hidden">
						<div
							class="h-full bg-[var(--color-gold)] transition-all rounded-full"
							style="width: {legendaryProgress}%"
						></div>
					</div>
				</div>
			</div>

			<!-- Tertiary: Reference info -->
			<div class="text-center text-sm text-secondary">
				Started with {startingDisplay}
				{#if !gameState.legendaryUnlocked && gameState.vpChoice}
					<span class="text-[var(--color-warning)]"> · Legendary locked</span>
				{/if}
			</div>
		</div>

		<!-- Phase Header -->
		<div class="phase-header flex items-center justify-between mb-6">
			<div>
				<p class="text-sm text-secondary mb-1">Phase {phaseNumber} of 9</p>
				<h2 class="text-2xl text-accent">{phaseNames[gameState.currentPhase]}</h2>
			</div>
			{#if gameState.territory}
				<div class="territory-badge territory-{gameState.territory}">
					{gameState.territory}
				</div>
			{/if}
		</div>

		<!-- Block Waiting State -->
		{#if playingSubState === 'waiting-block'}
			<div class="card text-center py-10">
				<div class="loading-spinner mx-auto mb-5"></div>
				<p class="text-secondary text-lg mb-2">Waiting for blockchain confirmation...</p>
				<p class="text-sm text-secondary">
					Block {currentBlockHeight} / {targetBlockHeight}
				</p>
			</div>
		{/if}

		<!-- Phase Active States -->
		{#if playingSubState === 'phase-active'}
			{#if gameState.currentPhase === 'first_trip'}
				<div class="card">
					<p class="narrative mb-6">{phaseNarrative}</p>
					<div class="grid gap-4">
						<button class="btn btn-secondary text-left" onclick={() => chooseTravelOption('fly')}>
							<span class="block">Fly First Class</span>
							<span class="block text-sm opacity-70">-$800 | +2 to first negotiation</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseTravelOption('train')}>
							<span class="block">Take the Train</span>
							<span class="block text-sm opacity-70">-$200 | Reliable and steady</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseTravelOption('drive')}>
							<span class="block">Drive Yourself</span>
							<span class="block text-sm opacity-70">-$50 | Risk and reward</span>
						</button>
					</div>
				</div>
			{/if}

			{#if gameState.currentPhase === 'crossroads'}
				<div class="card">
					<p class="narrative mb-6">{phaseNarrative}</p>
					<div class="grid gap-4">
						<button class="btn btn-secondary text-left" onclick={() => chooseCrossroads('grind')}>
							<span class="block">Grind</span>
							<span class="block text-sm opacity-70">DC 10 | +$1,500 success / +$800 fail</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseCrossroads('climb')}>
							<span class="block">Network Up</span>
							<span class="block text-sm opacity-70">DC 14 | +$2,500 success / +$200 fail</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseCrossroads('hunt')}>
							<span class="block">Hunt the Whale</span>
							<span class="block text-sm opacity-70">DC 16 | +4/-2 to whale negotiations</span>
						</button>
					</div>
				</div>
			{/if}

			{#if gameState.currentPhase === 'vp_meeting'}
				<div class="card">
					<p class="narrative mb-6">{phaseNarrative}</p>
					<div class="grid gap-4">
						<button class="btn btn-secondary text-left" onclick={() => chooseVPTarget('safe')}>
							<span class="block">Play it Safe</span>
							<span class="block text-sm opacity-70">No legendary | Whale at 1x</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseVPTarget('stretch')}>
							<span class="block">Stretch Target</span>
							<span class="block text-sm opacity-70">Legendary possible | Whale at 1.25x</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseVPTarget('allin')}>
							<span class="block">Go All-In</span>
							<span class="block text-sm opacity-70">Legendary possible | Whale at 1.5x | -$3,000 if fail</span>
						</button>
					</div>
				</div>
			{/if}

			{#if gameState.currentPhase === 'whale_prep'}
				<div class="card">
					<p class="narrative mb-6">{phaseNarrative}</p>
					<div class="grid gap-4">
						<button class="btn btn-secondary text-left" onclick={() => chooseWhalePrep('research')}>
							<span class="block">Deep Research</span>
							<span class="block text-sm opacity-70">-$400 | +2 to Listen actions</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseWhalePrep('gift')}>
							<span class="block">Send a Gift</span>
							<span class="block text-sm opacity-70">-$600 | +1 all checks, +2 patience</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseWhalePrep('dinner')}>
							<span class="block">Dinner Meeting</span>
							<span class="block text-sm opacity-70">-$800 | -2 resistance</span>
						</button>
						<button class="btn btn-secondary text-left" onclick={() => chooseWhalePrep('wingit')}>
							<span class="block">Wing It</span>
							<span class="block text-sm opacity-70">$0 | Trust your instincts</span>
						</button>
					</div>
				</div>
			{/if}
		{/if}

		<!-- Negotiation State -->
		{#if playingSubState === 'negotiating' && currentClient}
			<div class="card mb-5">
				<div class="flex justify-between items-start mb-5">
					<div>
						<h3 class="text-xl text-accent">{currentClient.name}</h3>
						<p class="text-sm text-secondary capitalize">{currentClient.territory} sector</p>
					</div>
					<div class="text-right">
						<p class="text-2xl text-[var(--color-money)] font-bold mono">${currentClient.dealValue.toLocaleString()}</p>
						<p class="text-sm text-secondary">Deal Value</p>
					</div>
				</div>

				<div class="grid grid-cols-3 gap-4 mb-5">
					<div class="text-center p-3 bg-[var(--color-surface-elevated)] rounded-lg">
						<p class="text-sm text-secondary mb-1">Patience</p>
						<p class="text-xl text-accent">{currentClient.patience}/{currentClient.maxPatience}</p>
					</div>
					<div class="text-center p-3 bg-[var(--color-surface-elevated)] rounded-lg">
						<p class="text-sm text-secondary mb-1">Resistance</p>
						<p class="text-xl text-accent">DC {currentClient.resistance}</p>
					</div>
					<div class="text-center p-3 bg-[var(--color-surface-elevated)] rounded-lg">
						<p class="text-sm text-secondary mb-1">Budget</p>
						<p class="text-xl text-accent">${currentClient.budget.toLocaleString()}</p>
					</div>
				</div>

				<!-- Active Stats Panel -->
				<div class="mb-4 p-3 bg-[var(--color-surface-elevated)] rounded-lg">
					<p class="text-xs text-secondary uppercase tracking-widest mb-2">Active Stats</p>
					<div class="grid grid-cols-3 gap-2 text-xs">
						<div><span class="text-secondary">STR</span> <span class="text-accent">{gameState.character.stats.str.modifier >= 0 ? '+' : ''}{gameState.character.stats.str.modifier}</span> <span class="text-secondary">close</span></div>
						<div><span class="text-secondary">DEX</span> <span class="text-accent">{gameState.character.stats.dex.modifier >= 0 ? '+' : ''}{gameState.character.stats.dex.modifier}</span> <span class="text-secondary">read</span></div>
						<div><span class="text-secondary">CON</span> <span class="text-accent">{gameState.character.stats.con.modifier >= 0 ? '+' : ''}{gameState.character.stats.con.modifier}</span> <span class="text-secondary">resist</span></div>
						<div><span class="text-secondary">INT</span> <span class="text-accent">{gameState.character.stats.int.modifier >= 0 ? '+' : ''}{gameState.character.stats.int.modifier}</span> <span class="text-secondary">R2+</span></div>
						<div><span class="text-secondary">WIS</span> <span class="text-accent">{gameState.character.stats.wis.modifier >= 0 ? '+' : ''}{gameState.character.stats.wis.modifier}</span> <span class="text-secondary">R2+/spirit</span></div>
						<div><span class="text-secondary">CHA</span> <span class="text-accent">{gameState.character.stats.cha.modifier >= 0 ? '+' : ''}{gameState.character.stats.cha.modifier}</span> <span class="text-secondary">pitch</span></div>
					</div>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<button class="btn btn-secondary" onclick={() => performNegotiationAction('pitch')}>
						Pitch (d20+mods)
					</button>
					<button class="btn btn-secondary" onclick={() => performNegotiationAction('listen')}>
						Listen (+2 next)
					</button>
					<button class="btn btn-secondary" onclick={() => performNegotiationAction('concede')}>
						Concede (80%)
					</button>
					<button
						class="btn btn-secondary"
						disabled={gameState.spiritAbilityUsed}
						onclick={() => performNegotiationAction('ability')}
					>
						Use {gameState.character.traits.spiritAnimal} Ability {gameState.spiritAbilityUsed ? '(Used)' : ''}
					</button>
				</div>
			</div>

			{#if negotiationHistory.length > 0}
				<div class="card">
					<h4 class="text-sm text-secondary mb-3">Negotiation Log</h4>
					<div class="space-y-2 max-h-64 overflow-y-auto">
						{#each negotiationHistory as round}
							<div class="text-sm p-3 bg-[var(--color-surface-elevated)] rounded-lg">
								<span class="text-accent font-medium">Round {round.round}:</span>
								<span class="text-secondary"> {round.narrative}</span>
								{#if round.moneyGained > 0}
									<span class="text-[var(--color-money)] font-medium"> +${round.moneyGained.toLocaleString()}</span>
								{/if}
							</div>
						{/each}
					</div>
				</div>
			{/if}
		{/if}

		<!-- Phase Result -->
		{#if playingSubState === 'phase-result'}
			<div class="card">
				<p class="narrative mb-6">{phaseNarrative}</p>
				<button
					class="btn btn-primary w-full"
					onclick={() => {
						if (gameState?.currentPhase === 'assignment') advanceToPhase2();
						else if (gameState?.currentPhase === 'first_trip') advanceToPhase3();
						else if (gameState?.currentPhase === 'first_client') advanceToPhase4();
						else if (gameState?.currentPhase === 'crossroads') advanceToPhase5();
						else if (gameState?.currentPhase === 'quarter_event') advanceToPhase6();
						else if (gameState?.currentPhase === 'vp_meeting') advanceToPhase7();
						else if (gameState?.currentPhase === 'whale_prep') advanceToPhase8();
						else if (gameState?.currentPhase === 'whale') advanceToPhase9();
					}}
				>
					Continue
				</button>
			</div>
		{/if}

	{:else if viewState === 'game-over' && gameState}
		<!-- Game Over Screen -->
		<div class="card glow-money text-center mb-6">
			<h1 class="text-4xl text-accent mb-3">{getTierDisplayName(gameState.tier)}</h1>
			<p class="narrative mb-6">{getTierDescription(gameState.tier)}</p>

			<div class="grid grid-cols-2 gap-6 mb-8">
				<div>
					<p class="text-sm text-secondary mb-1">Final Balance</p>
					<p class="text-3xl text-[var(--color-money)] font-bold mono">${gameState.money.toLocaleString()}</p>
				</div>
				<div>
					<p class="text-sm text-secondary mb-1">Started With</p>
					<p class="text-3xl text-accent font-bold mono">${gameState.startingMoney.toLocaleString()}</p>
				</div>
			</div>

			<p class="text-xl mb-8">
				Final performance: <span class="text-accent font-bold">{(gameState.money / gameState.startingMoney * 100).toFixed(1)}%</span>
			</p>

			{#if isStorableTier(gameState.tier)}
				{#if !achievementQR}
					<button class="btn btn-gold mb-5" onclick={storeAchievement}>
						Store Achievement On-Chain
					</button>
				{:else}
					<div class="mb-5">
						<p class="text-sm text-secondary mb-3">Scan with Verus Mobile to store:</p>
						{#if achievementQRImage}
							<div class="bg-white p-4 rounded-lg inline-block">
								<img src={achievementQRImage} alt="QR Code for achievement storage" class="w-64 h-64" />
							</div>
						{:else}
							<div class="bg-white p-4 rounded-lg inline-block">
								<p class="text-gray-900 text-xs break-all max-w-xs">{achievementQR.substring(0, 100)}...</p>
							</div>
						{/if}
						<p class="text-sm text-secondary mt-3">
							<a href={achievementDeeplink} class="text-accent underline">Open in Verus Mobile</a>
						</p>
					</div>
				{/if}
			{:else}
				<p class="text-sm text-secondary mb-5">
					Only Promotion and Legendary achievements can be stored on-chain.
				</p>
			{/if}

			<button class="btn btn-secondary" onclick={playAgain}>
				Play Again
			</button>
		</div>

		<!-- Game Summary -->
		<div class="card">
			<h3 class="text-xl text-accent mb-4">Quarter Summary</h3>
			<div class="grid grid-cols-2 gap-4 text-sm">
				<div><span class="text-secondary">Character:</span> <span class="text-accent">{gameState.character.name}</span></div>
				<div><span class="text-secondary">Territory:</span> <span class="text-accent capitalize">{gameState.territory}</span></div>
				<div><span class="text-secondary">VP Target:</span> <span class="text-accent capitalize">{gameState.vpChoice}</span></div>
				<div><span class="text-secondary">Spirit Used:</span> <span class="text-accent">{gameState.spiritAbilityUsed ? 'Yes' : 'No'}</span></div>
				<div><span class="text-secondary">Client Rounds:</span> <span class="text-accent">{gameState.firstClientRounds?.length || 0}</span></div>
				<div><span class="text-secondary">Whale Rounds:</span> <span class="text-accent">{gameState.whaleRounds?.length || 0}</span></div>
			</div>
		</div>
	{/if}
</main>

<style>
	.loading-spinner {
		width: 48px;
		height: 48px;
		border: 3px solid var(--color-border);
		border-top-color: var(--color-accent);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	.btn-gold:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}
</style>
