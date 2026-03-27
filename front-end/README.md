# Frontend Notes

This Next.js app is the wallet-facing interface for Confidential Payroll.

## What the App Does
- Connects Shield or Leo wallets
- Syncs live payroll and private balance records from the wallet
- Lets owners create USD-denominated payrolls with a USD Rate (Locked)
- Supports one-time and recurring contributors
- Exposes one simple execution action: `Run Payroll`
- Guides users through closing a finished cycle and opening the next one

## Key UX Decisions
- The visible flow is `Create Payroll -> Add Contributors -> Run Payroll -> View Results`.
- `Sync with Wallet` is the only manual refresh action.
- The app hides low-level Aleo mechanics and automatically uses available private balance.
- Designed for USD-denominated payroll (future integration with USDCX/USAD).

## Local Development
```bash
pnpm install
pnpm dev
```

## Production Check
```bash
pnpm build
```
