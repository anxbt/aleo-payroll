"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
    PROGRAM_ID,
    buildAddContributorTransaction,
    buildCloseCycleTransaction,
    buildDiscloseCycleSpentTransaction,
    buildHandoffPayrollToManagerTransaction,
    buildHandoffPayrollToOwnerTransaction,
    buildInitPayrollTransaction,
    buildOpenNextCycleTransaction,
    buildRunPayrollTransaction,
    buildTransferContributorOperatorTransaction,
} from "@/lib/aleo-service";
import type {
    ContributorRecord,
    CreditRecord,
    CycleSummaryRecord,
    PaymentReceiptRecord,
    PayrollRecord,
} from "@/types/aleo";

function extractPlaintext(record: any): string {
    return record._plaintext || record.recordPlaintext || record.plaintext || "";
}

function stripLeoSuffix(value: unknown): string {
    return String(value)
        .replace(/\.(private|public)/g, "")
        .replace(/u8|u16|u32|u64|field/g, "")
        .trim();
}

function extractNumberField(record: any, fieldName: string): number {
    const direct = record.data?.[fieldName];
    if (direct !== undefined) {
        const parsed = Number(stripLeoSuffix(direct));
        if (!Number.isNaN(parsed)) return parsed;
    }

    const source = `${extractPlaintext(record)} ${JSON.stringify(record)}`;
    const match = source.match(new RegExp(`${fieldName}:\\s*(\\d+)`));
    return match ? Number(match[1]) : 0;
}

function extractBoolField(record: any, fieldName: string): boolean {
    const direct = record.data?.[fieldName];
    if (direct !== undefined) {
        const normalized = stripLeoSuffix(direct).toLowerCase();
        return normalized === "true";
    }

    const source = `${extractPlaintext(record)} ${JSON.stringify(record)}`;
    const match = source.match(new RegExp(`${fieldName}:\\s*(true|false)`));
    return match ? match[1] === "true" : false;
}

function extractAddressField(record: any, fieldName: string): string {
    const direct = record.data?.[fieldName];
    if (direct !== undefined) {
        const normalized = stripLeoSuffix(direct);
        if (normalized.startsWith("aleo1")) return normalized;
    }

    const source = `${extractPlaintext(record)} ${JSON.stringify(record)}`;
    const match = source.match(new RegExp(`${fieldName}:\\s*(aleo1[a-z0-9]+)`));
    return match ? match[1] : "";
}

function extractFieldField(record: any, fieldName: string): string {
    const direct = record.data?.[fieldName];
    if (direct !== undefined) {
        const normalized = stripLeoSuffix(direct);
        if (normalized) return normalized;
    }

    const source = `${extractPlaintext(record)} ${JSON.stringify(record)}`;
    const match = source.match(new RegExp(`${fieldName}:\\s*(\\d+)(?:field)?`));
    return match ? match[1] : "";
}

function recordId(record: any, fallbackPrefix: string, index: number): string {
    const value = record.commitment || record.id || record.nonce || record.serial_number || `${fallbackPrefix}-${index}`;
    return String(value).replace("field", "");
}

export function usePayrollContract() {
    const {
        address,
        connected,
        executeTransaction,
        transactionStatus,
        requestRecords,
        decrypt,
    } = useWallet();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const ref = pollingRef.current;
        return () => {
            if (ref) clearInterval(ref);
        };
    }, []);

    const executeWith = useCallback(async (txOptions: ReturnType<typeof buildInitPayrollTransaction>): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);
        try {
            const result = await executeTransaction(txOptions);
            return result?.transactionId || "";
        } catch (err) {
            const message = err instanceof Error ? err.message : "Transaction failed";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address, executeTransaction]);

    const pollTransactionStatus = useCallback(async (
        txId: string,
        maxAttempts = 60,
        interval = 2000
    ): Promise<{ status: string; finalized: boolean; onChainId?: string }> => {
        if (!transactionStatus) throw new Error("Transaction status not available");

        for (let i = 0; i < maxAttempts; i += 1) {
            try {
                const statusResponse = await transactionStatus(txId);
                const status = statusResponse.status?.toLowerCase();

                if (status !== "pending") {
                    if (status === "accepted" || status === "finalized") {
                        return {
                            status: statusResponse.status,
                            finalized: true,
                            onChainId: statusResponse.transactionId,
                        };
                    }

                    if (status === "failed" || status === "rejected") {
                        return {
                            status: statusResponse.status,
                            finalized: false,
                            onChainId: statusResponse.transactionId,
                        };
                    }
                }
            } catch (err) {
                console.error("Error polling transaction status:", err);
            }

            await new Promise((resolve) => setTimeout(resolve, interval));
        }

        return { status: "Timeout", finalized: false };
    }, [transactionStatus]);

    const initPayroll = useCallback(async (
        payrollId: string,
        budgetUsdCents: number,
        microcreditsPerUsdCent: number,
        manager: string
    ): Promise<string> => executeWith(
        buildInitPayrollTransaction(payrollId, budgetUsdCents, microcreditsPerUsdCent, manager)
    ), [executeWith]);

    const addContributor = useCallback(async (
        payrollRecord: string,
        contributor: string,
        payoutUsdCents: number,
        recurring: boolean
    ): Promise<string> => executeWith(
        buildAddContributorTransaction(payrollRecord, contributor, payoutUsdCents, recurring)
    ), [executeWith]);

    const runPayroll = useCallback(async (
        payrollRecord: string,
        contributorRecords: string[],
        fundingCredits: string[],
        finalizeCycle: boolean
    ): Promise<string> => executeWith(
        buildRunPayrollTransaction(
            payrollRecord,
            contributorRecords,
            fundingCredits,
            finalizeCycle
        )
    ), [executeWith]);

    const closeCycle = useCallback(async (payrollRecord: string): Promise<string> => (
        executeWith(buildCloseCycleTransaction(payrollRecord))
    ), [executeWith]);

    const openNextCycle = useCallback(async (payrollRecord: string): Promise<string> => (
        executeWith(buildOpenNextCycleTransaction(payrollRecord))
    ), [executeWith]);

    const discloseCycleSpent = useCallback(async (payrollRecord: string): Promise<string> => (
        executeWith(buildDiscloseCycleSpentTransaction(payrollRecord))
    ), [executeWith]);

    const handoffPayrollToManager = useCallback(async (payrollRecord: string): Promise<string> => (
        executeWith(buildHandoffPayrollToManagerTransaction(payrollRecord))
    ), [executeWith]);

    const handoffPayrollToOwner = useCallback(async (payrollRecord: string): Promise<string> => (
        executeWith(buildHandoffPayrollToOwnerTransaction(payrollRecord))
    ), [executeWith]);

    const transferContributorOperator = useCallback(async (
        contributorRecord: string,
        newOwner: string
    ): Promise<string> => executeWith(
        buildTransferContributorOperatorTransaction(contributorRecord, newOwner)
    ), [executeWith]);

    const fetchProgramRecords = useCallback(async () => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        const records = await requestRecords(PROGRAM_ID, true);
        const normalized = await Promise.all((records as any[]).map(async (record) => {
            let plaintext = record.recordPlaintext || record.plaintext || "";
            if (!plaintext && record.recordCiphertext && decrypt) {
                try {
                    plaintext = await decrypt(record.recordCiphertext);
                } catch (decryptErr) {
                    console.warn("Record decrypt failed:", decryptErr);
                }
            }

            return { ...record, _plaintext: plaintext };
        }));

        return normalized;
    }, [address, requestRecords, decrypt]);

    const getPayrollRecords = useCallback(async (): Promise<PayrollRecord[]> => {
        try {
            const records = await fetchProgramRecords();
            return records
                .filter((record: any) => {
                    if (record.spent === true || record.spent === "true") return false;
                    if (record.recordName) return record.recordName === "Payroll";
                    return extractPlaintext(record).includes("budget_usd");
                })
                .map((record: any, index: number) => {
                    const budgetUsdCents = extractNumberField(record, "budget_usd");
                    const cycleDueUsdCents = extractNumberField(record, "cycle_due_usd");
                    const activeCommitmentUsdCents = extractNumberField(record, "active_commitment_usd");
                    const spentUsdCents = extractNumberField(record, "spent_usd");

                    return {
                        id: recordId(record, "payroll", index),
                        owner: extractAddressField(record, "owner") || address || "",
                        treasury_owner: extractAddressField(record, "treasury_owner") || address || "",
                        manager: extractAddressField(record, "manager") || address || "",
                        payroll_id: extractFieldField(record, "payroll_id"),
                        budget_usd_cents: budgetUsdCents,
                        cycle_due_usd_cents: cycleDueUsdCents,
                        active_commitment_usd_cents: activeCommitmentUsdCents,
                        spent_usd_cents: spentUsdCents,
                        microcredits_per_usd_cent: extractNumberField(record, "microcredits_per_usd_cent"),
                        cycle_index: extractNumberField(record, "cycle_index"),
                        status: extractNumberField(record, "status") as PayrollRecord["status"],
                        remaining_cycle_usd_cents: cycleDueUsdCents - spentUsdCents,
                        ciphertext: record.recordCiphertext || record.ciphertext || "",
                        plaintext: extractPlaintext(record),
                    };
                });
        } catch (err) {
            console.error("Failed to get payroll records:", err);
            return [];
        }
    }, [address, fetchProgramRecords]);

    const getContributorRecords = useCallback(async (): Promise<ContributorRecord[]> => {
        try {
            const records = await fetchProgramRecords();
            return records
                .filter((record: any) => {
                    if (record.spent === true || record.spent === "true") return false;
                    if (record.recordName) return record.recordName === "Contributor";
                    return extractPlaintext(record).includes("payout_usd");
                })
                .map((record: any, index: number) => ({
                    id: recordId(record, "contributor", index),
                    owner: extractAddressField(record, "owner") || address || "",
                    payroll_id: extractFieldField(record, "payroll_id"),
                    contributor: extractAddressField(record, "contributor"),
                    payout_usd_cents: extractNumberField(record, "payout_usd"),
                    recurring: extractBoolField(record, "recurring"),
                    active: extractBoolField(record, "active"),
                    last_paid_cycle: extractNumberField(record, "last_paid_cycle"),
                    ciphertext: record.recordCiphertext || record.ciphertext || "",
                    plaintext: extractPlaintext(record),
                }));
        } catch (err) {
            console.error("Failed to get contributor records:", err);
            return [];
        }
    }, [address, fetchProgramRecords]);

    const getPaymentReceipts = useCallback(async (): Promise<PaymentReceiptRecord[]> => {
        try {
            const records = await fetchProgramRecords();
            return records
                .filter((record: any) => {
                    if (record.spent === true || record.spent === "true") return false;
                    if (record.recordName) return record.recordName === "PaymentReceipt";
                    return extractPlaintext(record).includes("amount_microcredits");
                })
                .map((record: any, index: number) => ({
                    id: recordId(record, "receipt", index),
                    owner: extractAddressField(record, "owner") || address || "",
                    payroll_id: extractFieldField(record, "payroll_id"),
                    contributor: extractAddressField(record, "contributor"),
                    payout_usd_cents: extractNumberField(record, "payout_usd"),
                    amount_microcredits: extractNumberField(record, "amount_microcredits"),
                    cycle_index: extractNumberField(record, "cycle_index"),
                    ciphertext: record.recordCiphertext || record.ciphertext || "",
                    plaintext: extractPlaintext(record),
                }));
        } catch (err) {
            console.error("Failed to get payment receipts:", err);
            return [];
        }
    }, [address, fetchProgramRecords]);

    const getCycleSummaries = useCallback(async (): Promise<CycleSummaryRecord[]> => {
        try {
            const records = await fetchProgramRecords();
            return records
                .filter((record: any) => {
                    if (record.spent === true || record.spent === "true") return false;
                    if (record.recordName) return record.recordName === "CycleSummary";
                    const plaintext = extractPlaintext(record);
                    return plaintext.includes("budget_usd") && plaintext.includes("status") && !plaintext.includes("microcredits_per_usd_cent");
                })
                .map((record: any, index: number) => ({
                    id: recordId(record, "summary", index),
                    owner: extractAddressField(record, "owner") || address || "",
                    payroll_id: extractFieldField(record, "payroll_id"),
                    cycle_index: extractNumberField(record, "cycle_index"),
                    budget_usd_cents: extractNumberField(record, "budget_usd"),
                    spent_usd_cents: extractNumberField(record, "spent_usd"),
                    status: extractNumberField(record, "status") as CycleSummaryRecord["status"],
                    ciphertext: record.recordCiphertext || record.ciphertext || "",
                    plaintext: extractPlaintext(record),
                }));
        } catch (err) {
            console.error("Failed to get cycle summaries:", err);
            return [];
        }
    }, [address, fetchProgramRecords]);

    const getCreditRecords = useCallback(async (): Promise<CreditRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords("credits.aleo", true);
            const normalized = await Promise.all((records as any[]).map(async (record) => {
                let plaintext = record.recordPlaintext || record.plaintext || "";
                if (!plaintext && record.recordCiphertext && decrypt) {
                    try {
                        plaintext = await decrypt(record.recordCiphertext);
                    } catch (decryptErr) {
                        console.warn("Credit decrypt failed:", decryptErr);
                    }
                }

                return { ...record, _plaintext: plaintext };
            }));

            return normalized
                .filter((record: any) => {
                    if (record.spent === true || record.spent === "true") return false;
                    if (record.recordName) return record.recordName === "credits";
                    return true;
                })
                .map((record: any, index: number) => {
                    const plaintext = extractPlaintext(record);
                    let microcredits = 0;

                    if (record.data?.microcredits !== undefined) {
                        microcredits = Number(stripLeoSuffix(record.data.microcredits));
                    } else if (record.microcredits !== undefined) {
                        microcredits = Number(stripLeoSuffix(record.microcredits));
                    } else {
                        const match = plaintext.match(/microcredits:\s*(\d+)/);
                        microcredits = match ? Number(match[1]) : 0;
                    }

                    return {
                        id: recordId(record, "credit", index),
                        owner: extractAddressField(record, "owner") || address,
                        microcredits,
                        ciphertext: record.recordCiphertext || record.ciphertext || record.record || "",
                        plaintext,
                    };
                })
                .filter((record) => record.microcredits > 0 && (record.ciphertext || record.plaintext));
        } catch (err) {
            console.error("Failed to get private balance records:", err);
            return [];
        }
    }, [address, requestRecords, decrypt]);

    return {
        connected,
        address,
        isLoading,
        error,
        pollTransactionStatus,
        initPayroll,
        addContributor,
        runPayroll,
        closeCycle,
        openNextCycle,
        discloseCycleSpent,
        handoffPayrollToManager,
        handoffPayrollToOwner,
        transferContributorOperator,
        getPayrollRecords,
        getContributorRecords,
        getPaymentReceipts,
        getCycleSummaries,
        getCreditRecords,
    };
}
