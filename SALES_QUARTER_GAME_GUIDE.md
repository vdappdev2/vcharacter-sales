# The Sales Quarter — Game Guide

A complete guide to how your character's stats, traits, and choices shape your journey through a 9-phase sales quarter.

---

## How It Works

You load a character created in [vcharacter-prime](https://github.com/vdappdev2/vcharacter-prime) — same stats, element, spirit animal. In this game, **money replaces HP**. You start with a budget determined by your stats, play through a sales quarter, and try to finish with as much money as possible. Reach 2x your starting money for a **Promotion**, or 3x for **Legendary** status — both stored on-chain as verifiable proofs.

All dice rolls use blockchain randomness from Verus block hashes, making every outcome provably fair.

---

## Starting Money

Your starting budget is calculated from three stats:

```
Starting Money = $10,000 + (CHA mod × $2,000) + (INT mod × $1,000) + (WIS mod × $500)
Minimum: $3,000
```

A character with CHA +2, INT +1, WIS +1 starts with $10,000 + $4,000 + $1,000 + $500 = **$15,500**.

---

## The Six Stats

Every stat from your character matters. Unlike the Primordial Trial where STR/DEX dominate combat, the sales game spreads stat relevance across the entire quarter.

### CHA — Charisma

**Role:** Primary pitch stat

- Your base pitch modifier is your CHA modifier
- Pitch roll: d20 + CHA mod (or territory favored stat, whichever is higher) vs client resistance DC
- Crossroads "Grind" option uses CHA (DC 10)

CHA is your bread-and-butter sales stat. It determines your starting budget and powers every pitch.

---

### INT — Intelligence

**Role:** Growing pitch power (Pattern Recognition)

- **Round 1:** INT has no pitch effect — your character is reading the room
- **Round 2+:** INT modifier is added to every pitch roll alongside CHA
- Crossroads "Climb" option uses INT (DC 14) — high risk, high reward

This represents recognizing client patterns and adapting your pitch. A character with CHA +2 and INT +2 pitches at +2 in round 1 but +4 from round 2 onward.

INT also contributes $1,000 per modifier point to your starting budget.

---

### WIS — Wisdom

**Role:** Body language reading (Intuition) + Spirit Bond

WIS has two roles:

**Intuition:**
- **Round 1:** No body language shift from WIS
- **Round 2+:** floor(WIS mod / 2) shifts the body language d6 in your favor

This represents reading the client's subtle cues and adjusting your approach.

**Spirit Bond:**
WIS enhances your spirit animal's ability (see Spirit Animals below). Higher WIS means a bigger payout.

WIS also contributes $500 per modifier point to your starting budget, and the Crossroads "Hunt" option uses WIS (DC 16).

---

### STR — Strength

**Role:** Closing Power

- Every successful pitch adds STR modifier × $100 to the deal value
- Negative STR reduces deal value

This represents your ability to close hard. A STR +3 character earns an extra $300 on every successful pitch — over multiple rounds and two clients, that adds up fast.

---

### DEX — Dexterity

**Role:** Reading clients (Read the Room)

- floor(DEX mod / 2) shifts the body language d6 roll every round
- Body language determines client patience, resistance changes, and deal value bonuses
- Shifting a "skeptical" (resistance +2) to "interested" (resistance -1) is a 3-point swing

High DEX means consistently better body language reads, making every negotiation smoother.

---

### CON — Constitution

**Role:** Resilience

- CON modifier × $100 reduces all money losses (setbacks, bad events, failures)
- The reduction applies everywhere: journey mishaps, quarter events, all-in penalties
- Losses can never become gains — CON only reduces, never inverts

A CON +3 character shrugs off $300 from every setback. Over a full quarter of random events, that protection is significant.

---

## Stat Comparison at a Glance

| Stat | Role | When Active | Type |
|------|------|-------------|------|
| CHA | Pitch rolls + starting budget | Every pitch | Offensive |
| INT | Pitch rolls (pattern recognition) + starting budget | Round 2+ pitches | Offensive (growing) |
| WIS | Body language shift + spirit bond + starting budget | Round 2+ / one-use | Utility (growing) |
| STR | Deal value per successful pitch | Every successful pitch | Offensive |
| DEX | Body language shift | Every round | Defensive |
| CON | Reduces all money losses | Always | Survivability |

**No stat is wasted.** CHA/INT power your pitches, STR boosts deal value, DEX/WIS read clients better over time, and CON protects you from setbacks.

---

## Elements

Your element (rolled on a d6 during character creation) provides a passive benefit throughout the quarter:

| Element | Effect |
|---------|--------|
| **Fire** | +$500 on every closed deal |
| **Water** | Perception bonus (narrative advantage) |
| **Earth** | -$200 from all setbacks and losses |
| **Air** | +$300 on your first deal |
| **Wood** | +$100 passive income each phase (9 phases = +$900 total) |
| **Metal** | +$200 on every deal |

**Fire** and **Metal** scale with how many deals you close — aggressive negotiators benefit most. **Earth** and **CON** stack for resilience. **Wood** is guaranteed income regardless of performance. **Air** gives a first-deal boost.

---

## Spirit Animals

Your spirit animal (rolled on a d12 during character creation) grants a **one-use ability** you can activate during any negotiation. Choose your moment — you only get one use per quarter.

### Money Spirits (enhanced by WIS)

| Spirit | Ability | Base Effect | With WIS Bonus |
|--------|---------|-------------|----------------|
| **Wolf** | Pack Tactics | +$2,000 team bonus | +$2,000 + WIS mod × $500 |
| **Dragon** | Dragon Fire | +$5,000 instant bonus | +$5,000 + WIS mod × $500 |
| **Owl** | Hidden Need | +$1,500 spotted opportunity | +$1,500 + WIS mod × $500 |
| **Tiger** | Tiger Strike | +$3,000 on next deal | +$3,000 + WIS mod × $500 |
| **Whale** | Recovery | +$4,000 recovery | +$4,000 + WIS mod × $500 |
| **Elephant** | Memory | +$1,000 per past success | +($1,000 + WIS mod × $200) per success |
| **Frog** | Fortune | +$800/round for 3 rounds | +($800 + WIS mod × $100)/round for 3 rounds |

### Tactical Spirits (not affected by WIS)

| Spirit | Ability | Effect |
|--------|---------|--------|
| **Bear** | Mighty Presence | Client cannot object this round |
| **Eagle** | Perfect Clarity | Auto-succeed next pitch |
| **Octopus** | Escape Artist | Exit any negotiation without loss |
| **Spider** | Spectral Webs | Deal value protected this round |
| **Deer** | Swift Close | Close current deal at 50% value |

**Strategy tip:** Money spirits (Dragon, Whale, Wolf) are best saved for the Whale negotiation where stakes are highest. Tactical spirits (Eagle, Bear) are best used at critical moments. Elephant rewards aggressive play — the more successful pitches you've landed, the bigger the payout.

---

## The Sales Quarter — Phase by Phase

### Phase 1: Territory Assignment

A d6 determines your sales territory:

| Roll | Territory | Favored Stat |
|------|-----------|-------------|
| 1-2 | Technology | INT |
| 3-4 | Retail | CHA |
| 5-6 | Finance | WIS |

Your pitch modifier uses the **higher** of CHA or your territory's favored stat. Getting a territory that matches your best stat is a big advantage.

### Phase 2: First Trip

Choose how to travel to your territory:

| Choice | Cost | Benefit |
|--------|------|---------|
| **Fly** | $800 | +2 to first negotiation (Well Rested) |
| **Train** | $200 | No bonus, no risk |
| **Drive** | $50 | Random d6 event (risk/reward) |

**Driving** is a gamble. The d6 can range from a $400 breakdown to a +2 pitch bonus from great podcasts. If you have high CON, driving is safer since resilience reduces the worst outcomes.

After choosing travel, a **Journey Event** (d6) fires — random encounters ranging from -$100 to +$500. Earth element and CON resilience reduce losses here.

### Phase 3: First Client

Your first negotiation. You face a client based on your territory — moderate budgets ($2,200-$3,500), moderate resistance (DC 10-14). This is where you learn the negotiation system (see Negotiation Mechanics below).

Element bonuses apply on closed deals: Fire +$500, Metal +$200, Air +$300 (first deal only).

### Phase 4: Crossroads

Choose your mid-quarter strategy:

| Choice | Stat | DC | Success | Failure |
|--------|------|-----|---------|---------|
| **Grind** | CHA | 10 | +$1,500 | +$800 |
| **Climb** | INT | 14 | +$2,500 | +$200 |
| **Hunt** | WIS | 16 | +4 to Whale negotiations | -2 to Whale negotiations |

**Grind** is safe — even failure pays $800. **Climb** is high-risk/high-reward money. **Hunt** is the strategic choice — it pays nothing now but a +4 bonus on the high-stakes Whale deal can be worth far more than immediate cash.

### Phase 5: Quarter Event

A random d6 event affects the whole market:

| Roll | Event | Effect |
|------|-------|--------|
| 1 | Market crash | -$1,500 |
| 2 | Competitor undercut | -$1,000 |
| 3 | Product recall | -$500 |
| 4 | Quiet quarter | No change |
| 5 | Good press | +$800 |
| 6 | Great referral | +$500 |

Earth element (-$200) and CON resilience reduce losses from bad events.

### Phase 6: VP Meeting

The VP offers you a choice that determines your quarter's ceiling:

| Choice | Whale Multiplier | Legendary Eligible? | Failure Penalty |
|--------|-----------------|--------------------|-----------------|
| **Safe** | 1.0x | No | None |
| **Stretch** | 1.25x | Yes | None |
| **All-In** | 1.5x | Yes | -$3,000 if Whale fails |

**Safe** locks you out of Legendary tier but guarantees no VP penalty. **Stretch** unlocks Legendary with a 25% whale bonus. **All-In** gives the biggest whale multiplier but costs $3,000 if you fail the whale deal entirely.

This is the most consequential strategic decision in the game.

### Phase 7: Whale Prep

Invest in preparation for the high-stakes Whale client:

| Investment | Cost | Benefit |
|-----------|------|---------|
| **Research** | $400 | +2 to Listen actions |
| **Gift** | $600 | +1 all checks, +2 client patience |
| **Dinner** | $800 | -2 client resistance |
| **Wing It** | Free | No bonus, keep the cash |

A **Lucky Item** event (d6) also fires — small random bonuses from +$200 to pitch buffs.

### Phase 8: The Whale

The big deal. Whale clients have larger budgets ($5,500-$8,000) and higher resistance (DC 13-16). Your VP choice multiplier applies to the whale's deal value.

This is where everything comes together: your territory stat advantage, accumulated buffs from travel/crossroads/prep, and your one-use spirit ability. The whale deal often determines whether you hit Promotion or Legendary.

### Phase 9: Quarter End

Your final money is compared to your starting money:

| Tier | Requirement | On-Chain? |
|------|-------------|-----------|
| **Fired** | $0 or below | No |
| **Under Review** | Below starting money | No |
| **Employed** | 1.0x - 1.99x starting money | No |
| **Promotion** | 2.0x starting money or more | Yes |
| **Legendary** | 3.0x starting money + VP unlock | Yes |

Legendary requires both hitting 3x your starting money AND choosing Stretch or All-In at the VP Meeting.

---

## Negotiation Mechanics

Negotiations are multi-round encounters against clients. Each round you choose an action, then body language is read.

### Actions

**Pitch:** Roll d20 + pitch modifier vs client resistance DC. Success earns a portion of the client's budget (15% base + margin bonus). Failure costs no money but uses a round of the client's patience.

**Listen:** Skip your pitch but gain +2 to your next pitch. Good for when resistance is too high.

**Concede:** Close the deal immediately at 80% of the accumulated deal value. Guaranteed success — use it to lock in gains when the client's patience is running low.

**Spirit Ability:** Activate your one-use spirit animal power (see Spirit Animals).

### Pitch Formula

```
Pitch Roll = d20 + max(CHA mod, territory favored stat mod)
           + INT mod (round 2+ only)
           + active buffs (travel, listen, prep, etc.)

Success: roll total >= client resistance DC
```

On success, deal value earned:
```
Base Value = 15% of client budget
Margin Bonus = +5% per point over DC (up to +25%)
STR Closing Power = STR mod × $100
Minimum: $100 per successful pitch
```

### Body Language

Each round, a d6 determines the client's body language:

| Roll | Body Language | Effect |
|------|-------------|--------|
| 1 | Arms Crossed | Patience -2, Resistance +1 |
| 2 | Skeptical | Resistance +2 |
| 3-4 | Neutral | No change |
| 5 | Interested | Resistance -1 |
| 6 | Engaged | Resistance -2, Deal value +10% |

Your DEX and WIS shift this roll in your favor:
- **DEX "Read the Room":** floor(DEX mod / 2) shift every round
- **WIS "Intuition":** floor(WIS mod / 2) shift from round 2+
- Result clamped to 1-6

A DEX +4 character shifts every body language roll by +2, turning neutrals into engaged reads.

### Client Patience

Clients have limited patience (4-8 rounds). Each pitch (hit or miss) reduces patience by 1. When patience hits 0, the client leaves — you keep whatever deal value you've accumulated. Arms-crossed body language also drains 2 extra patience.

---

## Territories

Each territory has different client profiles:

| Territory | First Client Budget | First Client DC | Whale Budget | Whale DC |
|-----------|-------------------|-----------------|-------------|----------|
| **Tech** | $2,500-$3,500 | 11-13 | $5,500-$7,000 | 13-15 |
| **Retail** | $2,200-$2,800 | 10-12 | $5,500-$7,500 | 13-15 |
| **Finance** | $3,000-$3,500 | 12-14 | $6,500-$8,000 | 14-16 |

Finance has the highest budgets but toughest resistance. Retail is most forgiving. Tech is balanced.

---

## Balance: Budget Scaling

Achievement thresholds are multipliers of starting money (2x for Promotion, 3x for Legendary). To keep these achievable across all stat distributions, **client budgets scale with your starting money**:

```
Budget Scale = max(0.5, Starting Money / $10,000)
```

A character starting with $20,000 faces clients with 2x the base budgets — bigger deals for the bigger threshold. A character starting at $3,000 faces clients at 0.5x (the floor), keeping deals viable despite the lower threshold. Resistance DCs stay fixed, so you still need good rolls to land pitches — the scaling only affects how much you earn when you succeed, not whether you succeed.

This means average characters tend to have the best shot at achievements, while extreme stat distributions (very high or very low CHA/INT/WIS) face different challenges. Some characters may find Promotion or Legendary very difficult or near-impossible. That's by design — not every quarter ends in a promotion.

---

## On-Chain Verification

Top achievements — Promotion and Legendary — are stored on the Verus blockchain via your VerusID's content multimap. The proof includes:

- Character name and creation block height
- Starting and final money
- All dice rolls with block seeds
- Every choice made (travel, crossroads, VP, investments)
- Negotiation actions for both clients

Anyone can look up your VerusID, extract the achievement data, and verify that every roll and outcome is legitimate. No trust required.
