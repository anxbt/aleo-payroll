# Confidential Payroll

Confidential Payroll is a private contributor payments app for DAOs and teams. It lets an owner define a USD-denominated payroll budget, set contributor payouts in USD, and run payroll privately without exposing salaries or treasury activity onchain.

Designed for USD-denominated payroll (future integration with USDCX/USAD).

[![Live App](https://img.shields.io/badge/Live%20App-Open-111827?logo=vercel&logoColor=white)](https://aleo-payroll-9vo6-git-main-anxbts-projects.vercel.app/)
[![YouTube Demo](https://img.shields.io/badge/YouTube-Demo-FF0000?logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=GiL_80iWzkg)

## Core Use Case

Example: A DAO pays 5 contributors monthly without exposing salaries.

The same flow also supports:
- grants and milestone payouts
- contributor bounties
- team payroll and working-group stipends
- private treasury operations where payout visibility matters

## How It Works

- Create a payroll with a USD budget.
- Lock a payroll-level USD Rate (Locked) for deterministic settlement.
- Add contributors with one-time or recurring USD payouts.
- Run Payroll to pay due contributors privately from available private balance.
- Close the cycle and open the next one when recurring contributors remain.

## Why USD Payroll

- Budgets feel stable and easy to reason about for treasury operators.
- Contributor payouts stay predictable even when credit prices move.
- The contract enforces deterministic conversion using the payroll's locked rate.
- The frontend only asks for USD amounts and hides low-level settlement mechanics.

## Privacy Guarantees

- Contributor amounts are not broadcast as public transfers.
- Treasury activity is not exposed as a public payroll table.
- Aleo records and zero-knowledge execution enforce payroll rules privately.
- The app syncs the latest private records directly from the connected wallet.

## Role Model

- Owner: creates payroll, defines contributors, sets payouts, and controls policy.
- Manager: optional operator who can run payroll and move lifecycle actions forward after handoff.
- The manager cannot change contributors or payout rules.

This separation signals DAO readiness while respecting Aleo's record ownership model.

## Demo Flow
1. Create a payroll with a USD budget and USD Rate (Locked).
2. Add contributors with recurring or one-time payouts.
3. Click `Run Payroll`.
4. Watch contributors move to paid state and the dashboard sync automatically.

## Repository Structure
```text
contracts/
  src/main.leo
  tests/

front-end/
  src/app/
  src/hooks/
  src/lib/
  src/types/

scripts/
  execute.ts
  deploy.ts
```

## Local Development

### Contract
```bash
cd contracts
leo test
```

### Frontend
```bash
cd front-end
pnpm install
pnpm dev
```

### Helper Script
```bash
cd scripts
npm install
npx tsx execute.ts init <payroll_id> <budget_usd_cents> <microcredits_per_usd_cent> [manager]
```

## Verification
- `cd contracts && leo test`
- `cd front-end && pnpm build`

## Why Aleo

- Aleo gives the app private records for balances, payroll state, and contributor payouts.
- Zero-knowledge execution lets the contract enforce budgets and payroll lifecycle without exposing amounts publicly.
- This is what makes payroll, grants, and contributor compensation feel usable in a real treasury setting.

## Real-World Applications

- DAO core contributor payroll
- grants and milestone disbursement
- bounty payouts
- team stipends and recurring contributor compensation
