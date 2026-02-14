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
} from "@/types/aleo";

export function usePayrollContract() {
    const { 
        publicKey, 
        requestTransaction, 
        transactionStatus, 
        requestRecords, 
        connected,
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return records
                .filter((r: any) => r.recordName === "Payroll")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    total_budget: Number(String(r.data?.total_budget || "0").replace("u64", "")),
                    spent_budget: Number(String(r.data?.spent_budget || "0").replace("u64", "")),
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return records
                .filter((r: any) => r.recordName === "Contributor")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    payroll_owner: r.data?.payroll_owner || "",
                    contributor: r.data?.contributor || "",
                    payout: Number(String(r.data?.payout || "0").replace("u64", "")),
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
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return records
                .filter((r: any) => r.recordName === "PaymentReceipt")
                .map((r: any) => ({
                    id: r.id,
                    owner: r.owner,
                    contributor: r.data?.contributor || "",
                    amount: Number(String(r.data?.amount || "0").replace("u64", "")),
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