# Submission: Confidential Payroll

## One-Line Pitch
Confidential Payroll lets DAOs and teams run USD-denominated private contributor payments without exposing salaries or treasury activity.

## Problem
Traditional on-chain compensation leaks:
- Contributor identities
- Individual payment amounts
- Treasury allocation patterns
- Recurring payroll structure over time

That makes routine treasury operations feel too exposed for serious payroll, grants, bounties, and team compensation.

## Solution
This project uses Aleo records and zero-knowledge execution to make contributor payments private by default:
- Budgets and contributor payouts are defined in USD terms
- Each payroll locks a deterministic USD Rate (Locked)
- The contract converts USD commitments into exact private payouts at execution time
- Contributors can be one-time or recurring across multiple cycles
- The UI follows one clear flow: Create Payroll -> Add Contributors -> Run Payroll -> View Results

Designed for USD-denominated payroll (future integration with USDCX/USAD).

## Why It Matters
- DAOs can pay core contributors without broadcasting compensation tables.
- Grant programs can settle milestone-based allocations privately.
- Teams can separate policy ownership from day-to-day execution while keeping the product simple.

## What Is New In This Version
- Product positioning now centers a real payroll use case instead of a technical demo.
- `budget_usd` and `payout_usd` replace credit-native budgeting in the contract and UI.
- Payroll lifecycle is enforced as `OPEN -> EXECUTED -> CLOSED`.
- The app exposes one clear primary action: `Run Payroll`.
- Recurring contributors carry across cycles.
- Funding guidance and wallet sync are built into the main flow.
- Optional owner-manager role separation signals DAO readiness.

## 60-Second Demo Flow
1. Connect wallet.
2. Create a payroll with a USD budget and USD Rate (Locked).
3. Add contributors with USD payouts.
4. Click `Run Payroll`.
5. Watch contributors move to paid state and the metrics bar update.
6. Close the cycle and open the next one if recurring contributors remain.

Example: A DAO pays 5 contributors monthly without exposing salaries.

## Technical Highlights
- Leo contract with record-based payroll and contributor state
- Deterministic on-chain USD-to-credit conversion
- Automatic change handling via `credits.aleo/transfer_private`
- One-click frontend orchestration for payroll execution

## Current Tradeoffs
- Manager delegation is an operator handoff because Aleo records have a single spend owner.
- Real execution still depends on available private balance in the wallet.
