# Aleo Wallet Adapter Integration Guide

> **Generated**: January 28, 2026  
> **Repository**: [ProvableHQ/aleo-wallet-adapter](https://github.com/ProvableHQ/aleo-wallet-adapter)  
> **Project**: Aleo Private Payroll Pool

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [Package Structure](#2-package-structure)
3. [Current Setup Status](#3-current-setup-status)
4. [Core Concepts](#4-core-concepts)
5. [API Reference](#5-api-reference)
6. [Integration Plan](#6-integration-plan)
7. [Code Examples](#7-code-examples)
8. [Contract Integration](#8-contract-integration)
9. [Troubleshooting](#9-troubleshooting)

---

## 1. Repository Overview

The Aleo Wallet Adapter is a modular TypeScript library that provides wallet connection functionality for Aleo applications. It follows a similar pattern to Solana's wallet adapter.

### Key Features
- **Multi-wallet support**: Leo Wallet, Puzzle Wallet, and more
- **React hooks**: `useWallet()`, `useWalletModal()`
- **Transaction handling**: Sign, execute, and deploy Aleo programs
- **Record management**: Request and decrypt records
- **Auto-connect**: Persist wallet connections
- **Event subscriptions**: Account change, disconnect events

---

## 2. Package Structure

```
@demox-labs/aleo-wallet-adapter-base     # Core types, errors, and interfaces
@demox-labs/aleo-wallet-adapter-react    # React context and hooks
@demox-labs/aleo-wallet-adapter-reactui  # Pre-built UI components
@demox-labs/aleo-wallet-adapter-leo      # Leo Wallet adapter
```

### Package Hierarchy
```
┌─────────────────────────────────────────────────────────────┐
│                    YOUR APPLICATION                          │
├─────────────────────────────────────────────────────────────┤
│  @demox-labs/aleo-wallet-adapter-reactui                    │
│  ├── WalletModalProvider                                    │
│  ├── WalletMultiButton                                      │
│  ├── WalletConnectButton                                    │
│  └── WalletDisconnectButton                                 │
├─────────────────────────────────────────────────────────────┤
│  @demox-labs/aleo-wallet-adapter-react                      │
│  ├── WalletProvider                                         │
│  ├── useWallet()                                            │
│  └── WalletContext                                          │
├─────────────────────────────────────────────────────────────┤
│  @demox-labs/aleo-wallet-adapter-leo                        │
│  └── LeoWalletAdapter                                       │
├─────────────────────────────────────────────────────────────┤
│  @demox-labs/aleo-wallet-adapter-base                       │
│  ├── Types (DecryptPermission, WalletAdapterNetwork, etc.)  │
│  ├── Errors (WalletNotConnectedError, etc.)                 │
│  └── Transaction/Deployment classes                         │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Current Setup Status

### ✅ Already Installed Packages

Your `package.json` already includes:

```json
{
  "@demox-labs/aleo-wallet-adapter-base": "^0.0.23",
  "@demox-labs/aleo-wallet-adapter-leo": "^0.0.25",
  "@demox-labs/aleo-wallet-adapter-react": "^0.0.22",
  "@demox-labs/aleo-wallet-adapter-reactui": "^0.0.36"
}
```

### ✅ Existing Wallet Provider Setup

**File**: `src/components/wallet-provider.tsx`

```tsx
"use client";

import React, { FC, useMemo } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
    DecryptPermission,
    WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: "Aleo Private Pool",
            }),
        ],
        []
    );

    return (
        <AleoWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.UponRequest}
            network={WalletAdapterNetwork.Testnet}
            autoConnect
        >
            <WalletModalProvider>{children}</WalletModalProvider>
        </AleoWalletProvider>
    );
};
```

### ✅ Existing Wallet Connect Component

**File**: `src/components/wallet-connect.tsx`

```tsx
"use client"

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react"
import { useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui"

export function WalletConnect() {
    const { wallet, publicKey, disconnect, connected } = useWallet()
    const { setVisible } = useWalletModal()

    if (connected && publicKey) {
        return (
            <Button onClick={() => disconnect()}>
                {formatAddress(publicKey)}
            </Button>
        )
    }

    return (
        <Button onClick={() => setVisible(true)}>
            Connect Wallet
        </Button>
    )
}
```

---

## 4. Core Concepts

### 4.1 DecryptPermission

Controls what the wallet can decrypt automatically:

```typescript
enum DecryptPermission {
    NoDecrypt = "NO_DECRYPT",           // No automatic decryption
    UponRequest = "UPON_REQUEST",       // Ask user each time
    AutoDecrypt = "AUTO_DECRYPT",       // Decrypt automatically
    OnChainHistory = "ON_CHAIN_HISTORY" // Access transaction history
}
```

**Recommendation for Payroll App**: Use `UponRequest` for security, or `AutoDecrypt` for convenience.

### 4.2 WalletAdapterNetwork

```typescript
enum WalletAdapterNetwork {
    Localnet = "localnet",
    Testnet = "testnet",
    TestnetBeta = "testnetbeta",
    Mainnet = "mainnet"
}
```

### 4.3 WalletReadyState

```typescript
enum WalletReadyState {
    Installed = "Installed",       // Extension installed & ready
    NotDetected = "NotDetected",   // Extension not found
    Loadable = "Loadable",         // Can be loaded (mobile)
    Unsupported = "Unsupported"    // Browser not supported
}
```

---

## 5. API Reference

### 5.1 useWallet() Hook

The primary hook for wallet interactions:

```typescript
interface WalletContextState {
    // State
    autoConnect: boolean;
    wallets: Wallet[];
    wallet: Wallet | null;
    publicKey: string | null;
    connecting: boolean;
    connected: boolean;
    disconnecting: boolean;

    // Actions
    select(walletName: WalletName): void;
    connect(decryptPermission: DecryptPermission, network: WalletAdapterNetwork, programs?: string[]): Promise<void>;
    disconnect(): Promise<void>;

    // Transaction Methods
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    decrypt: (cipherText: string, tpk?: string, programId?: string, functionName?: string, index?: number) => Promise<string>;
    requestRecords: (program: string) => Promise<any[]>;
    requestTransaction: (transaction: AleoTransaction) => Promise<string>;
    requestExecution: (transaction: AleoTransaction) => Promise<string>;
    requestBulkTransactions: (transactions: AleoTransaction[]) => Promise<string[]>;
    requestDeploy: (deployment: AleoDeployment) => Promise<string>;
    transactionStatus: (transactionId: string) => Promise<string>;
    getExecution: (transactionId: string) => Promise<string>;
    requestRecordPlaintexts: (program: string) => Promise<any[]>;
    requestTransactionHistory: (program: string) => Promise<any[]>;
}
```

### 5.2 AleoTransaction Class

For executing program functions:

```typescript
import { Transaction, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

const transaction = Transaction.createTransaction(
    publicKey,                          // Fee payer address
    WalletAdapterNetwork.Testnet,       // Network
    "hello.aleo",                       // Program ID
    "init_payroll",                     // Function name
    [100000],                           // Inputs (u64 total_budget)
    1_000_000,                          // Fee in microcredits
    false                               // Private fee (true/false)
);
```

### 5.3 AleoDeployment Class

For deploying programs:

```typescript
import { Deployment, WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";

const deployment = new Deployment(
    publicKey,
    WalletAdapterNetwork.Testnet,
    programCode,          // Leo program as string
    5_000_000             // Deployment fee
);
```

---

## 6. Integration Plan

### Phase 1: Update Aleo Service ✏️

**File**: `src/lib/aleo-service.ts`

```typescript
import { 
    Transaction, 
    WalletAdapterNetwork 
} from "@demox-labs/aleo-wallet-adapter-base";

export const PROGRAM_ID = "hello.aleo";
export const NETWORK = WalletAdapterNetwork.Testnet;
export const DEFAULT_FEE = 1_000_000; // 1 credit = 1,000,000 microcredits

// Transaction builders for each contract function
export function buildInitPayrollTransaction(
    publicKey: string, 
    totalBudget: number
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "init_payroll",
        [`${totalBudget}u64`],  // Format as u64
        DEFAULT_FEE,
        false
    );
}

export function buildAddContributorTransaction(
    publicKey: string,
    payrollRecord: string,  // Encrypted record ciphertext
    contributor: string,    // Aleo address
    payout: number
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "add_contributor",
        [payrollRecord, contributor, `${payout}u64`],
        DEFAULT_FEE,
        false
    );
}

export function buildPayContributorTransaction(
    publicKey: string,
    payrollRecord: string,
    contributorRecord: string
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "pay_contributor",
        [payrollRecord, contributorRecord],
        DEFAULT_FEE,
        false
    );
}

export function buildDiscloseSpentTransaction(
    publicKey: string,
    payrollRecord: string
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "disclose_spent",
        [payrollRecord],
        DEFAULT_FEE,
        false
    );
}
```

### Phase 2: Create usePayroll Hook ✏️

**File**: `src/hooks/usePayroll.ts`

```typescript
"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";
import {
    PROGRAM_ID,
    buildInitPayrollTransaction,
    buildAddContributorTransaction,
    buildPayContributorTransaction,
    buildDiscloseSpentTransaction,
} from "@/lib/aleo-service";
import type { 
    PayrollRecord, 
    ContributorRecord, 
    PaymentReceiptRecord,
    TransactionStatus 
} from "@/types/aleo";

export function usePayrollContract() {
    const { 
        publicKey, 
        requestTransaction, 
        transactionStatus, 
        requestRecords, 
        connected,
        decrypt
    } = useWallet();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Poll transaction until finalized or failed
    const pollTransactionStatus = useCallback(async (
        txId: string, 
        maxAttempts = 30, 
        interval = 2000
    ): Promise<{ status: string; finalized: boolean }> => {
        if (!transactionStatus) {
            throw new Error("Transaction status not available");
        }

        for (let i = 0; i < maxAttempts; i++) {
            const status = await transactionStatus(txId);
            
            if (status === "Finalized" || status === "Accepted") {
                return { status, finalized: true };
            }
            if (status === "Failed" || status === "Rejected") {
                return { status, finalized: false };
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        return { status: "Timeout", finalized: false };
    }, [transactionStatus]);

    // Initialize a new payroll
    const initPayroll = useCallback(async (totalBudget: number): Promise<string> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestTransaction) throw new Error("Request transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const transaction = buildInitPayrollTransaction(publicKey, totalBudget);
            const txId = await requestTransaction(transaction);
            return txId;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to init payroll";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, requestTransaction]);

    // Add a contributor to the payroll
    const addContributor = useCallback(async (
        payrollRecord: string,
        contributor: string,
        payout: number
    ): Promise<string> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestTransaction) throw new Error("Request transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const transaction = buildAddContributorTransaction(
                publicKey, 
                payrollRecord, 
                contributor, 
                payout
            );
            const txId = await requestTransaction(transaction);
            return txId;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add contributor";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, requestTransaction]);

    // Pay a contributor
    const payContributor = useCallback(async (
        payrollRecord: string,
        contributorRecord: string
    ): Promise<string> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestTransaction) throw new Error("Request transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const transaction = buildPayContributorTransaction(
                publicKey,
                payrollRecord,
                contributorRecord
            );
            const txId = await requestTransaction(transaction);
            return txId;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to pay contributor";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, requestTransaction]);

    // Disclose spent budget (public output)
    const discloseSpent = useCallback(async (
        payrollRecord: string
    ): Promise<string> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestTransaction) throw new Error("Request transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const transaction = buildDiscloseSpentTransaction(publicKey, payrollRecord);
            const txId = await requestTransaction(transaction);
            return txId;
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to disclose spent";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, requestTransaction]);

    // Fetch all payroll records for the connected wallet
    const getPayrollRecords = useCallback(async (): Promise<PayrollRecord[]> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID);
            return records
                .filter((r: any) => r.recordName === "Payroll")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    total_budget: Number(r.data.total_budget.replace("u64", "")),
                    spent_budget: Number(r.data.spent_budget.replace("u64", "")),
                    ciphertext: r.ciphertext,
                }));
        } catch (err) {
            console.error("Failed to get payroll records:", err);
            return [];
        }
    }, [publicKey, requestRecords]);

    // Fetch contributor records
    const getContributorRecords = useCallback(async (): Promise<ContributorRecord[]> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID);
            return records
                .filter((r: any) => r.recordName === "Contributor")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    payroll_owner: r.data.payroll_owner,
                    contributor: r.data.contributor,
                    payout: Number(r.data.payout.replace("u64", "")),
                    ciphertext: r.ciphertext,
                }));
        } catch (err) {
            console.error("Failed to get contributor records:", err);
            return [];
        }
    }, [publicKey, requestRecords]);

    // Fetch payment receipts
    const getPaymentReceipts = useCallback(async (): Promise<PaymentReceiptRecord[]> => {
        if (!publicKey) throw new WalletNotConnectedError();
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID);
            return records
                .filter((r: any) => r.recordName === "PaymentReceipt")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    contributor: r.data.contributor,
                    amount: Number(r.data.amount.replace("u64", "")),
                    ciphertext: r.ciphertext,
                }));
        } catch (err) {
            console.error("Failed to get payment receipts:", err);
            return [];
        }
    }, [publicKey, requestRecords]);

    return {
        // State
        connected,
        publicKey,
        isLoading,
        error,

        // Contract Operations
        initPayroll,
        addContributor,
        payContributor,
        discloseSpent,

        // Record Management
        getPayrollRecords,
        getContributorRecords,
        getPaymentReceipts,

        // Transaction Utilities
        pollTransactionStatus,
    };
}
```

### Phase 3: Update Types ✏️

**File**: `src/types/aleo.ts`

```typescript
// Record Types matching contract
export interface PayrollRecord {
    id: string;
    owner: string;
    total_budget: number;
    spent_budget: number;
    ciphertext: string;
}

export interface ContributorRecord {
    id: string;
    owner: string;
    payroll_owner: string;
    contributor: string;
    payout: number;
    ciphertext: string;
}

export interface PaymentReceiptRecord {
    id: string;
    owner: string;
    contributor: string;
    amount: number;
    ciphertext: string;
}

// Transaction Types
export type TransactionStatus = 
    | "Pending"
    | "Proving"
    | "Broadcasting"
    | "Finalized"
    | "Accepted"
    | "Failed"
    | "Rejected"
    | "Timeout";

export interface TransactionResult {
    transactionId: string;
    status: TransactionStatus;
    outputs?: string[];
    error?: string;
}

// UI State Types
export interface PayrollState {
    payrolls: PayrollRecord[];
    contributors: ContributorRecord[];
    receipts: PaymentReceiptRecord[];
    isLoading: boolean;
    error: string | null;
}
```

---

## 7. Code Examples

### 7.1 Complete Dashboard Component

```tsx
"use client"

import { useState, useEffect } from "react";
import { usePayrollContract } from "@/hooks/usePayroll";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function PayrollDashboard() {
    const {
        connected,
        publicKey,
        isLoading,
        error,
        initPayroll,
        addContributor,
        payContributor,
        getPayrollRecords,
        getContributorRecords,
        pollTransactionStatus,
    } = usePayrollContract();

    const [totalBudget, setTotalBudget] = useState("");
    const [payrolls, setPayrolls] = useState([]);
    const [contributors, setContributors] = useState([]);
    const [txStatus, setTxStatus] = useState<string | null>(null);

    // Load records on mount
    useEffect(() => {
        if (connected) {
            loadRecords();
        }
    }, [connected]);

    const loadRecords = async () => {
        const [payrollRecords, contributorRecords] = await Promise.all([
            getPayrollRecords(),
            getContributorRecords(),
        ]);
        setPayrolls(payrollRecords);
        setContributors(contributorRecords);
    };

    const handleInitPayroll = async () => {
        if (!totalBudget) return;
        
        setTxStatus("Submitting...");
        try {
            const txId = await initPayroll(Number(totalBudget));
            setTxStatus(`Transaction submitted: ${txId.slice(0, 10)}...`);
            
            const result = await pollTransactionStatus(txId);
            setTxStatus(result.finalized ? "✅ Success!" : `❌ ${result.status}`);
            
            if (result.finalized) {
                await loadRecords();
                setTotalBudget("");
            }
        } catch (err) {
            setTxStatus(`❌ Error: ${err.message}`);
        }
    };

    if (!connected) {
        return (
            <Card>
                <CardContent className="py-8 text-center">
                    <p>Please connect your wallet to continue</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Create Payroll */}
            <Card>
                <CardHeader>
                    <CardTitle>Initialize Payroll</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-2">
                        <Input
                            type="number"
                            placeholder="Total Budget (microcredits)"
                            value={totalBudget}
                            onChange={(e) => setTotalBudget(e.target.value)}
                        />
                        <Button 
                            onClick={handleInitPayroll}
                            disabled={isLoading || !totalBudget}
                        >
                            {isLoading ? "Processing..." : "Create Payroll"}
                        </Button>
                    </div>
                    {txStatus && (
                        <p className="text-sm text-muted-foreground">{txStatus}</p>
                    )}
                </CardContent>
            </Card>

            {/* Payroll List */}
            <Card>
                <CardHeader>
                    <CardTitle>Your Payrolls ({payrolls.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {payrolls.length === 0 ? (
                        <p className="text-muted-foreground">No payrolls found</p>
                    ) : (
                        <div className="space-y-2">
                            {payrolls.map((p, i) => (
                                <div key={i} className="p-3 border rounded">
                                    <p>Budget: {p.total_budget} microcredits</p>
                                    <p>Spent: {p.spent_budget} microcredits</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        ID: {p.id}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
```

### 7.2 Sign Message Example

```tsx
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { WalletNotConnectedError } from "@demox-labs/aleo-wallet-adapter-base";

export function SignMessage() {
    const { wallet, publicKey } = useWallet();

    const handleSign = async () => {
        if (!publicKey) throw new WalletNotConnectedError();
        
        const message = "Sign this message to verify ownership";
        const bytes = new TextEncoder().encode(message);
        
        const signatureBytes = await (
            wallet?.adapter as LeoWalletAdapter
        ).signMessage(bytes);
        
        const signature = new TextDecoder().decode(signatureBytes);
        console.log("Signature:", signature);
    };

    return (
        <button onClick={handleSign} disabled={!publicKey}>
            Sign Message
        </button>
    );
}
```

### 7.3 Subscribe to Events

```tsx
import { useEffect, useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";

export function WalletEventSubscriber() {
    const { wallet, publicKey, disconnect, connect } = useWallet();

    const handleAccountChange = useCallback(async () => {
        console.log("Account changed, reconnecting...");
        await disconnect();
        // Optionally auto-reconnect
    }, [disconnect]);

    useEffect(() => {
        if (!wallet?.adapter) return;

        const adapter = wallet.adapter as LeoWalletAdapter;
        adapter.on('accountChange', handleAccountChange);

        return () => {
            adapter.off('accountChange', handleAccountChange);
        };
    }, [wallet, handleAccountChange]);

    return null;
}
```

---

## 8. Contract Integration

### 8.1 Contract Structure (hello.aleo)

```leo
program hello.aleo {
    // Records
    record Payroll {
        owner: address,
        total_budget: u64,
        spent_budget: u64,
    }

    record Contributor {
        owner: address,
        payroll_owner: address,
        contributor: address,
        payout: u64,
    }

    record PaymentReceipt {
        owner: address,
        contributor: address,
        amount: u64,
    }

    // Transitions
    transition init_payroll(total_budget: u64) -> Payroll
    transition add_contributor(payroll: Payroll, contributor: address, payout: u64) -> (Payroll, Contributor)
    transition pay_contributor(payroll: Payroll, contributor: Contributor) -> (Payroll, PaymentReceipt)
    transition disclose_spent(payroll: Payroll) -> (Payroll, u64)
}
```

### 8.2 Input Formatting

| Leo Type | JavaScript Format | Example |
|----------|-------------------|---------|
| `u64` | String with suffix | `"1000000u64"` |
| `u128` | String with suffix | `"1000000u128"` |
| `address` | String (Aleo address) | `"aleo1..."` |
| `record` | Encrypted ciphertext | `"record1..."` |
| `bool` | String | `"true"` or `"false"` |

### 8.3 Transaction Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│   Frontend  │────▶│  Leo Wallet  │────▶│   Prover    │────▶│   Network    │
│  (React)    │     │  (Extension) │     │   (Local)   │     │  (Testnet)   │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
      │                    │                    │                    │
      │ requestTransaction │                    │                    │
      │───────────────────▶│                    │                    │
      │                    │  Generate proof    │                    │
      │                    │───────────────────▶│                    │
      │                    │                    │                    │
      │                    │◀───────────────────│                    │
      │                    │     Broadcast      │                    │
      │                    │───────────────────────────────────────▶│
      │                    │                    │                    │
      │◀───────────────────│                    │    Confirmation    │
      │   Transaction ID   │◀───────────────────────────────────────│
      │                    │                    │                    │
```

---

## 9. Troubleshooting

### Common Issues

#### 1. Wallet Not Detected
```typescript
// Check ready state
const { wallet } = useWallet();
if (wallet?.readyState !== WalletReadyState.Installed) {
    console.log("Please install Leo Wallet extension");
}
```

#### 2. Transaction Fails
- Ensure sufficient balance for fees (minimum ~1 credit)
- Verify input formats (u64 suffix, valid addresses)
- Check record ownership matches caller

#### 3. Records Not Loading
```typescript
// Use correct permission
<WalletProvider
    decryptPermission={DecryptPermission.UponRequest}
    // or DecryptPermission.AutoDecrypt
>
```

#### 4. Hydration Errors (Next.js)
```typescript
// Use mounted state pattern
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);
if (!mounted) return <>{children}</>;
```

### Useful Links

- [Leo Wallet](https://leo.app/) - Download wallet extension
- [Aleo Explorer](https://explorer.aleo.org/) - View transactions
- [Aleo Faucet](https://faucet.aleo.org/) - Get testnet credits
- [Wallet Adapter Demo](https://demo.leo.app/) - Official demo

---

## Quick Reference Card

```typescript
// Import everything you need
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui";
import { 
    Transaction,
    WalletAdapterNetwork,
    WalletNotConnectedError,
    DecryptPermission
} from "@demox-labs/aleo-wallet-adapter-base";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";

// Access wallet state
const { 
    publicKey,        // Current address or null
    connected,        // Boolean connection state
    connecting,       // Boolean connecting state
    disconnect,       // Disconnect function
    requestTransaction,
    requestRecords,
    transactionStatus,
} = useWallet();

// Open wallet modal
const { setVisible } = useWalletModal();
setVisible(true);

// Create and send transaction
const tx = Transaction.createTransaction(
    publicKey!,
    WalletAdapterNetwork.Testnet,
    "program.aleo",
    "function_name",
    ["arg1", "arg2"],
    1_000_000,  // fee
    false       // private fee
);
const txId = await requestTransaction(tx);
```

---

*Generated for Aleo Private Payroll Pool - January 2026*
