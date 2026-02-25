<script lang="ts">
	import type { StoredCharacter } from '$lib/types';
	import { calculateStartingMoney } from '$lib/sales/engine';

	type ViewState = 'input' | 'loading' | 'select' | 'error';

	let viewState: ViewState = $state('input');
	let identityInput = $state('');
	let characters: StoredCharacter[] = $state([]);
	let error = $state('');

	async function loadCharacters() {
		if (!identityInput.trim()) {
			error = 'Please enter a VerusID';
			return;
		}

		viewState = 'loading';
		error = '';

		try {
			const response = await fetch(`/api/character/list?identity=${encodeURIComponent(identityInput.trim())}`);
			const data = await response.json();

			if (!response.ok || data.error) {
				throw new Error(data.error || 'Failed to load characters');
			}

			characters = data.characters || [];

			if (characters.length === 0) {
				error = 'No characters found for this identity. Create a character at vcharacter-prime first.';
				viewState = 'error';
			} else {
				viewState = 'select';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load characters';
			viewState = 'error';
		}
	}

	function selectCharacter(character: StoredCharacter) {
		sessionStorage.setItem('selectedCharacter', JSON.stringify(character));
		window.location.href = '/play';
	}

	function goBack() {
		viewState = 'input';
		error = '';
	}

	function formatMod(mod: number): string {
		return mod >= 0 ? `+${mod}` : `${mod}`;
	}
</script>

<main class="container mx-auto px-4 py-12 max-w-4xl">
	<!-- Header -->
	<div class="text-center mb-10">
		<h1 class="text-4xl text-accent mb-3">vCharacter Sales</h1>
		<p class="text-secondary text-lg">Earn that promotion</p>
	</div>

	{#if viewState === 'input'}
		<div class="card glow-money max-w-lg mx-auto">
			<div class="mb-6">
				<p class="narrative">
					It's the start of a new quarter at <span class="narrative-highlight">vSales Inc.</span> Are you ready to prove yourself?
				</p>
				<p class="narrative mt-3">
					Input your VerusID to select your character and begin your sales journey.
				</p>
			</div>

			<form onsubmit={(e: Event) => { e.preventDefault(); loadCharacters(); }}>
				<input
					type="text"
					bind:value={identityInput}
					placeholder="yourname@ or i-address"
					class="input mb-5"
				/>
				<button type="submit" class="btn btn-primary w-full">
					Load Characters
				</button>
			</form>
		</div>
	{:else if viewState === 'loading'}
		<div class="card max-w-lg mx-auto text-center py-12">
			<div class="loading-spinner mx-auto mb-5"></div>
			<p class="text-secondary text-lg">Loading your characters...</p>
		</div>
	{:else if viewState === 'error'}
		<div class="card max-w-lg mx-auto text-center">
			<p class="text-[var(--color-error)] text-lg mb-5">{error}</p>
			<button class="btn btn-secondary" onclick={goBack}>
				Try Again
			</button>
		</div>
	{:else if viewState === 'select'}
		<div class="mb-8">
			<button class="btn btn-secondary" onclick={goBack}>
				&larr; Different Identity
			</button>
		</div>

		<div class="mb-8">
			<h2 class="text-2xl text-accent mb-3">Select Your Character</h2>
			<p class="narrative">
				All six stats shape your sales career. <span class="narrative-highlight">CHA</span>,
				<span class="narrative-highlight">INT</span>, and <span class="narrative-highlight">WIS</span>
				set your starting budget, while <span class="narrative-highlight">STR</span>,
				<span class="narrative-highlight">DEX</span>, and <span class="narrative-highlight">CON</span>
				drive your negotiation edge.
			</p>
		</div>

		<div class="grid gap-5 md:grid-cols-2">
			{#each characters as character}
				{@const startingMoney = calculateStartingMoney(character)}
				<button
					class="card hover:border-[var(--color-money)] transition-all text-left cursor-pointer hover:scale-[1.02]"
					onclick={() => selectCharacter(character)}
				>
					<div class="flex justify-between items-start mb-4">
						<div>
							<h3 class="text-xl text-accent">{character.name}</h3>
						</div>
						<div class="text-right">
							<p class="text-2xl text-[var(--color-money)] font-bold mono">
								${startingMoney.toLocaleString()}
							</p>
							<p class="text-sm text-secondary">Starting Budget</p>
						</div>
					</div>

					<div class="grid grid-cols-6 gap-2 text-sm mb-4">
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">STR</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.str.modifier)}</span>
						</div>
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">DEX</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.dex.modifier)}</span>
						</div>
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">CON</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.con.modifier)}</span>
						</div>
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">INT</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.int.modifier)}</span>
						</div>
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">WIS</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.wis.modifier)}</span>
						</div>
						<div class="text-center p-2 bg-[var(--color-surface-elevated)] rounded-lg">
							<span class="text-secondary block mb-1">CHA</span>
							<span class="text-lg text-accent font-semibold">{formatMod(character.stats.cha.modifier)}</span>
						</div>
					</div>

					<div class="pt-3 border-t border-[var(--color-border)]">
						<p class="text-sm text-secondary">
							{character.traits.element} | {character.traits.spiritAnimal}
						</p>
					</div>
				</button>
			{/each}
		</div>
	{/if}

	<div class="mt-16 text-center text-sm text-secondary">
		<p class="mb-2">Don't have a character yet?</p>
		<p class="mb-4">
			Create one at <a href="https://vcharacter-prime.vercel.app" class="text-accent underline hover:text-[var(--color-money-light)]" target="_blank" rel="noopener">vcharacter-prime</a>
		</p>
		<p>
			<a href="/verify" class="text-accent underline hover:text-[var(--color-money-light)]">Verify Characters & Achievements</a>
		</p>
	</div>
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
