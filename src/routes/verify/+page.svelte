<script lang="ts">
	import type { StoredCharacter } from '$lib/types';
	import type { SalesAchievementProofData } from '$lib/sales/types';
	import { calculateStartingMoney } from '$lib/sales/engine';

	type ViewState = 'input' | 'loading' | 'results' | 'error';

	let viewState: ViewState = $state('input');
	let identityInput = $state('');
	let characters: StoredCharacter[] = $state([]);
	let achievements: SalesAchievementProofData[] = $state([]);
	let identityAddress = $state('');
	let error = $state('');

	async function loadData() {
		if (!identityInput.trim()) {
			error = 'Please enter a VerusID';
			return;
		}

		viewState = 'loading';
		error = '';

		try {
			// Load characters and achievements in parallel
			const [charResponse, achieveResponse] = await Promise.all([
				fetch(`/api/character/list?identity=${encodeURIComponent(identityInput.trim())}`),
				fetch(`/api/achievement/list?identity=${encodeURIComponent(identityInput.trim())}`)
			]);

			const charData = await charResponse.json();
			const achieveData = await achieveResponse.json();

			if (!charResponse.ok || charData.error) {
				// Allow no characters but still show achievements
				if (charData.error !== 'No characters found on this identity') {
					throw new Error(charData.error || 'Failed to load characters');
				}
			}

			characters = charData.characters || [];
			achievements = achieveData.achievements || [];
			identityAddress = charData.identityAddress || achieveData.identityAddress || '';

			if (characters.length === 0 && achievements.length === 0) {
				error = 'No characters or achievements found for this identity.';
				viewState = 'error';
			} else {
				viewState = 'results';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load data';
			viewState = 'error';
		}
	}

	function goBack() {
		viewState = 'input';
		error = '';
		characters = [];
		achievements = [];
	}

	function formatMod(mod: number): string {
		return mod >= 0 ? `+${mod}` : `${mod}`;
	}

	function formatMoney(amount: number): string {
		return `$${amount.toLocaleString()}`;
	}

	function getAchievementsForCharacter(rollBlockHeight: number): SalesAchievementProofData[] {
		return achievements.filter(a => a.characterRollBlockHeight === rollBlockHeight);
	}

	function getTierColor(tier: string): string {
		switch (tier) {
			case 'legendary': return 'text-[var(--color-gold)]';
			case 'promotion': return 'text-[var(--color-money)]';
			default: return 'text-secondary';
		}
	}

	function getTierLabel(tier: string): string {
		switch (tier) {
			case 'legendary': return 'LEGENDARY';
			case 'promotion': return 'PROMOTION';
			default: return tier.toUpperCase();
		}
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}

	function truncateHash(hash: string, chars: number = 8): string {
		if (!hash) return '';
		return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
	}

	// Extract choice value from choices array (e.g., "territory:tech" -> "tech")
	function getChoice(choices: string[] | undefined, prefix: string): string {
		if (!choices) return '-';
		const choice = choices.find(c => c.startsWith(prefix + ':'));
		if (!choice) return '-';
		const parts = choice.split(':');
		return parts[1] || '-';
	}

	function formatTerritory(choices: string[] | undefined): string {
		const territory = getChoice(choices, 'territory');
		return territory.charAt(0).toUpperCase() + territory.slice(1);
	}

	function formatVPChoice(choices: string[] | undefined): string {
		const vp = getChoice(choices, 'vp');
		switch (vp) {
			case 'safe': return 'Safe';
			case 'stretch': return 'Stretch';
			case 'allin': return 'All-In';
			default: return vp;
		}
	}

	function formatTravelChoice(choices: string[] | undefined): string {
		const travel = getChoice(choices, 'travel');
		return travel.charAt(0).toUpperCase() + travel.slice(1);
	}

	function formatCrossroads(choices: string[] | undefined): string {
		const crossroads = getChoice(choices, 'crossroads');
		// crossroads might be "climb:success" or just "climb"
		const base = crossroads.split(':')[0];
		return base.charAt(0).toUpperCase() + base.slice(1);
	}

	function formatWhaleInvest(choices: string[] | undefined): string {
		const invest = getChoice(choices, 'whaleinvest');
		switch (invest) {
			case 'research': return 'Research';
			case 'gift': return 'Gift';
			case 'dinner': return 'Dinner';
			case 'wingit': return 'Wing It';
			default: return invest;
		}
	}

	function getTotalRounds(achievement: SalesAchievementProofData): number {
		return (achievement.firstClientActions?.length || 0) + (achievement.whaleActions?.length || 0);
	}
</script>

<main class="container mx-auto px-4 py-12 max-w-4xl">
	<!-- Header -->
	<div class="text-center mb-10">
		<h1 class="text-4xl text-accent mb-3">Verify Characters & Achievements</h1>
		<p class="text-secondary text-lg">View on-chain character data and sales achievements</p>
	</div>

	{#if viewState === 'input'}
		<div class="card glow-money max-w-lg mx-auto">
			<div class="mb-6">
				<p class="narrative">
					Enter a <span class="narrative-highlight">VerusID</span> to view their characters and any sales achievements stored on-chain.
				</p>
			</div>

			<form onsubmit={(e) => { e.preventDefault(); loadData(); }}>
				<input
					type="text"
					bind:value={identityInput}
					placeholder="yourname@ or i-address"
					class="input mb-5"
				/>
				<button type="submit" class="btn btn-primary w-full">
					Verify
				</button>
			</form>
		</div>

		<div class="mt-8 text-center text-sm text-secondary">
			<a href="/" class="text-accent underline hover:text-[var(--color-money-light)]">Return to main page</a>
		</div>
	{:else if viewState === 'loading'}
		<div class="card max-w-lg mx-auto text-center py-12">
			<div class="loading-spinner mx-auto mb-5"></div>
			<p class="text-secondary text-lg">Loading on-chain data...</p>
		</div>
	{:else if viewState === 'error'}
		<div class="card max-w-lg mx-auto text-center">
			<p class="text-[var(--color-error)] text-lg mb-5">{error}</p>
			<button class="btn btn-secondary" onclick={goBack}>
				Try Again
			</button>
		</div>
	{:else if viewState === 'results'}
		<div class="mb-8">
			<button class="btn btn-secondary" onclick={goBack}>
				&larr; Different Identity
			</button>
		</div>

		<!-- Identity Info -->
		<div class="card mb-8">
			<h2 class="text-xl text-accent mb-3">Identity</h2>
			<div class="grid gap-2 text-sm">
				<div class="flex justify-between">
					<span class="text-secondary">Name:</span>
					<span class="mono">{identityInput}</span>
				</div>
				{#if identityAddress}
					<div class="flex justify-between">
						<span class="text-secondary">Address:</span>
						<span class="mono text-xs">{identityAddress}</span>
					</div>
				{/if}
				<div class="flex justify-between">
					<span class="text-secondary">Characters:</span>
					<span>{characters.length}</span>
				</div>
				<div class="flex justify-between">
					<span class="text-secondary">Achievements:</span>
					<span>{achievements.length}</span>
				</div>
			</div>
		</div>

		<!-- Characters Section -->
		{#if characters.length > 0}
			<div class="mb-10">
				<h2 class="text-2xl text-accent mb-5">vCharacters</h2>
				<div class="grid gap-5">
					{#each characters as character}
						{@const charAchievements = getAchievementsForCharacter(character.rollBlockHeight)}
						{@const startingMoney = calculateStartingMoney(character)}
						<div class="card">
							<div class="flex justify-between items-start mb-4">
								<div>
									<h3 class="text-xl text-accent">{character.name}</h3>
									<p class="text-sm text-secondary">
										{character.traits.element} | {character.traits.spiritAnimal} | {character.traits.sex}
									</p>
								</div>
								<div class="text-right">
									<p class="text-lg text-[var(--color-money)] font-bold mono">
										{formatMoney(startingMoney)}
									</p>
									<p class="text-xs text-secondary">Starting Budget</p>
								</div>
							</div>

							<!-- Stats -->
							<div class="grid grid-cols-6 gap-2 text-sm mb-4">
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">STR</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.str.modifier)}</span>
								</div>
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">DEX</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.dex.modifier)}</span>
								</div>
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">CON</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.con.modifier)}</span>
								</div>
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">INT</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.int.modifier)}</span>
								</div>
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">WIS</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.wis.modifier)}</span>
								</div>
								<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded">
									<span class="text-secondary block text-xs">CHA</span>
									<span class="text-accent font-semibold">{formatMod(character.stats.cha.modifier)}</span>
								</div>
							</div>

							<!-- Proof Data -->
							<div class="text-xs text-secondary border-t border-[var(--color-border)] pt-3 mb-4">
								<div class="flex justify-between mb-1">
									<span>Roll Block:</span>
									<span class="mono">{character.rollBlockHeight}</span>
								</div>
								<div class="flex justify-between">
									<span>Roll Hash:</span>
									<span class="mono">{truncateHash(character.rollBlockHash, 10)}</span>
								</div>
							</div>

							<!-- Character Achievements -->
							{#if charAchievements.length > 0}
								<div class="border-t border-[var(--color-border)] pt-4">
									<h4 class="text-sm text-secondary mb-3">Sales Achievements</h4>
									<div class="grid gap-3">
										{#each charAchievements as achievement}
											<div class="bg-[var(--color-surface-elevated)] rounded-lg p-3">
												<div class="flex justify-between items-center mb-2">
													<span class="font-bold {getTierColor(achievement.tier)}">
														{getTierLabel(achievement.tier)}
													</span>
													<span class="text-xs text-secondary">
														{formatDate(achievement.timestamp)}
													</span>
												</div>
												<div class="grid grid-cols-5 gap-2 text-xs mb-2">
													<div>
														<span class="text-secondary">Starting:</span>
														<span class="mono">{formatMoney(achievement.startingMoney)}</span>
													</div>
													<div>
														<span class="text-secondary">Territory:</span>
														<span>{formatTerritory(achievement.choices)}</span>
													</div>
													<div>
														<span class="text-secondary">Crossroads:</span>
														<span>{formatCrossroads(achievement.choices)}</span>
													</div>
													<div>
														<span class="text-secondary">Whale Prep:</span>
														<span>{formatWhaleInvest(achievement.choices)}</span>
													</div>
													<div>
														<span class="text-secondary">Final:</span>
														<span class="mono text-[var(--color-money)]">{formatMoney(achievement.finalMoney)}</span>
													</div>
												</div>
												<div class="grid grid-cols-5 gap-2 text-xs">
													<div>
														<span class="text-secondary">Multiplier:</span>
														<span class="mono">{(achievement.finalMoney / achievement.startingMoney).toFixed(2)}x</span>
													</div>
													<div>
														<span class="text-secondary">Travel:</span>
														<span>{formatTravelChoice(achievement.choices)}</span>
													</div>
													<div>
														<span class="text-secondary">VP Target:</span>
														<span>{formatVPChoice(achievement.choices)}</span>
													</div>
													<div>
														<span class="text-secondary">Rounds:</span>
														<span>{getTotalRounds(achievement)}</span>
													</div>
													<div>
														<span class="text-secondary">Block:</span>
														<span class="mono">{achievement.completedAtBlock}</span>
													</div>
												</div>
											</div>
										{/each}
									</div>
								</div>
							{:else}
								<div class="border-t border-[var(--color-border)] pt-4">
									<p class="text-sm text-secondary italic">No sales achievements yet</p>
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Standalone Achievements (if any without matching character) -->
		{@const orphanAchievements = achievements.filter(a => !characters.some(c => c.rollBlockHeight === a.characterRollBlockHeight))}
		{#if orphanAchievements.length > 0}
			<div class="mb-10">
				<h2 class="text-2xl text-accent mb-5">Other Achievements</h2>
				<p class="text-sm text-secondary mb-4">
					These achievements reference characters not currently stored on this identity.
				</p>
				<div class="grid gap-4">
					{#each orphanAchievements as achievement}
						<div class="card">
							<div class="flex justify-between items-center mb-3">
								<div>
									<span class="font-bold {getTierColor(achievement.tier)}">
										{getTierLabel(achievement.tier)}
									</span>
									<span class="text-secondary ml-2">- {achievement.characterName}</span>
								</div>
								<span class="text-xs text-secondary">
									{formatDate(achievement.timestamp)}
								</span>
							</div>
							<div class="grid grid-cols-5 gap-3 text-sm mb-2">
								<div>
									<span class="text-secondary block text-xs">Starting</span>
									<span class="mono">{formatMoney(achievement.startingMoney)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Territory</span>
									<span>{formatTerritory(achievement.choices)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Crossroads</span>
									<span>{formatCrossroads(achievement.choices)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Whale Prep</span>
									<span>{formatWhaleInvest(achievement.choices)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Final</span>
									<span class="mono text-[var(--color-money)]">{formatMoney(achievement.finalMoney)}</span>
								</div>
							</div>
							<div class="grid grid-cols-5 gap-3 text-sm">
								<div>
									<span class="text-secondary block text-xs">Multiplier</span>
									<span class="mono">{(achievement.finalMoney / achievement.startingMoney).toFixed(2)}x</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Travel</span>
									<span>{formatTravelChoice(achievement.choices)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">VP Target</span>
									<span>{formatVPChoice(achievement.choices)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Rounds</span>
									<span>{getTotalRounds(achievement)}</span>
								</div>
								<div>
									<span class="text-secondary block text-xs">Block</span>
									<span class="mono">{achievement.completedAtBlock}</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Link to Play -->
		<div class="text-center mt-10">
			<a href="/" class="btn btn-primary">
				Play vCharacter Sales
			</a>
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
</style>
