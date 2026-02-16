"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
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
    CreditRecord,
} from "@/types/aleo";

export function usePayrollContract() {
    const { 
        address, 
        connected,
        executeTransaction,
        transactionStatus,
        requestRecords,
    } = useWallet();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
        };
    }, []);

    // Poll transaction until finalized or failed
    const pollTransactionStatus = useCallback(async (
        txId: string, 
        maxAttempts = 60, 
        interval = 2000
    ): Promise<{ status: string; finalized: boolean; onChainId?: string }> => {
        if (!transactionStatus) {
            throw new Error("Transaction status not available");
        }

        for (let i = 0; i < maxAttempts; i++) {
            try {
                const statusResponse = await transactionStatus(txId);
                const status = statusResponse.status?.toLowerCase();

                if (status !== "pending") {
                    if (status === "accepted" || status === "finalized") {
                        return { 
                            status: statusResponse.status, 
                            finalized: true,
                            onChainId: statusResponse.transactionId 
                        };
                    }
                    if (status === "failed" || status === "rejected") {
                        return { 
                            status: statusResponse.status, 
                            finalized: false,
                            onChainId: statusResponse.transactionId 
                        };
                    }
                }
            } catch (err) {
                console.error("Error polling transaction status:", err);
            }
            
            await new Promise(resolve => setTimeout(resolve, interval));
        }
        
        return { status: "Timeout", finalized: false };
    }, [transactionStatus]);

    // Initialize a new payroll by verifying credits
    const initPayroll = useCallback(async (
        creditRecord: string,
        budget: number
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const txOptions = buildInitPayrollTransaction(creditRecord, budget);
            console.log("[initPayroll] txOptions:", JSON.stringify(txOptions, null, 2));
            console.log("[initPayroll] creditRecord length:", creditRecord.length, "starts with:", creditRecord.slice(0, 20));
            const result = await executeTransaction(txOptions);
            console.log("[initPayroll] result:", result);
            return result?.transactionId || "";
        } catch (err) {
            console.error("[initPayroll] transaction error:", err);
            const message = err instanceof Error ? err.message : "Failed to init payroll";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address, executeTransaction]);

    // Add a contributor to the payroll with committed payout
    const addContributor = useCallback(async (
        payrollRecord: string,
        contributor: string,
        payout: number
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const txOptions = buildAddContributorTransaction(
                payrollRecord, 
                contributor, 
                payout
            );
            const result = await executeTransaction(txOptions);
            return result?.transactionId || "";
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to add contributor";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address, executeTransaction]);

    // Pay a contributor - deterministic payout from record
    const payContributor = useCallback(async (
        payrollRecord: string,
        contributorRecord: string,
        fundingCredit: string
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const txOptions = buildPayContributorTransaction(
                payrollRecord,
                contributorRecord,
                fundingCredit
            );
            const result = await executeTransaction(txOptions);
            return result?.transactionId || "";
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to pay contributor";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address, executeTransaction]);

    // Disclose spent budget (public output)
    const discloseSpent = useCallback(async (
        payrollRecord: string
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const txOptions = buildDiscloseSpentTransaction(payrollRecord);
            const result = await executeTransaction(txOptions);
            return result?.transactionId || "";
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to disclose spent";
            setError(message);
            throw err;
        } finally {
            setIsLoading(false);
        }
    }, [address, executeTransaction]);

    // Fetch all payroll records for the connected wallet
    const getPayrollRecords = useCallback(async (): Promise<PayrollRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("[getPayrollRecords] raw:", records);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (records as any[])
                .filter((r: any) => {
                    if (r.spent === true || r.spent === "true") return false;
                    if (r.recordName && r.recordName !== "Payroll") return false;
                    // If no recordName, check plaintext for Payroll fields
                    if (!r.recordName) {
                        const pt = r.recordPlaintext || r.plaintext || "";
                        if (!pt.includes("total_budget")) return false;
                    }
                    return true;
                })
                .map((r: any, index: number) => {
                    const pt = r.recordPlaintext || r.plaintext || "";

                    // Parse total_budget
                    let total_budget = 0;
                    if (r.data?.total_budget !== undefined) {
                        total_budget = Number(String(r.data.total_budget).replace(/u64(\.private)?/, "").trim());
                    } else {
                        const m = pt.match(/total_budget:\s*(\d+)u64/);
                        if (m) total_budget = Number(m[1]);
                    }

                    // Parse spent_budget
                    let spent_budget = 0;
                    if (r.data?.spent_budget !== undefined) {
                        spent_budget = Number(String(r.data.spent_budget).replace(/u64(\.private)?/, "").trim());
                    } else {
                        const m = pt.match(/spent_budget:\s*(\d+)u64/);
                        if (m) spent_budget = Number(m[1]);
                    }

                    // Owner
                    let ownerAddr = "";
                    if (r.sender && String(r.sender).startsWith("aleo1")) ownerAddr = r.sender;
                    else if (r.owner && String(r.owner).startsWith("aleo1")) ownerAddr = r.owner;
                    else {
                        const om = pt.match(/owner:\s*(aleo1[a-z0-9]+)/);
                        if (om) ownerAddr = om[1];
                    }

                    const id = r.commitment || r.id || r.nonce || `payroll-${index}`;

                    return {
                        id: String(id).replace("field", ""),
                        owner: ownerAddr || address,
                        total_budget,
                        spent_budget,
                        remaining_budget: total_budget - spent_budget,
                        ciphertext: r.recordCiphertext || r.ciphertext || "",
                        plaintext: pt,
                    };
                });
        } catch (err) {
            console.error("Failed to get payroll records:", err);
            return [];
        }
    }, [address, requestRecords]);

    // Fetch contributor records
    const getContributorRecords = useCallback(async (): Promise<ContributorRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("[getContributorRecords] raw:", records);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (records as any[])
                .filter((r: any) => {
                    if (r.spent === true || r.spent === "true") return false;
                    if (r.recordName && r.recordName !== "Contributor") return false;
                    if (!r.recordName) {
                        const pt = r.recordPlaintext || r.plaintext || "";
                        if (!pt.includes("payroll_owner")) return false;
                    }
                    return true;
                })
                .map((r: any, index: number) => {
                    const pt = r.recordPlaintext || r.plaintext || "";

                    let ownerAddr = "";
                    if (r.sender && String(r.sender).startsWith("aleo1")) ownerAddr = r.sender;
                    else if (r.owner && String(r.owner).startsWith("aleo1")) ownerAddr = r.owner;
                    else {
                        const om = pt.match(/owner:\s*(aleo1[a-z0-9]+)/);
                        if (om) ownerAddr = om[1];
                    }

                    // payroll_owner
                    let payroll_owner = r.data?.payroll_owner || "";
                    if (!payroll_owner) {
                        const m = pt.match(/payroll_owner:\s*(aleo1[a-z0-9]+)/);
                        if (m) payroll_owner = m[1];
                    }

                    // contributor address
                    let contributor = r.data?.contributor || "";
                    if (!contributor) {
                        const m = pt.match(/contributor:\s*(aleo1[a-z0-9]+)/);
                        if (m) contributor = m[1];
                    }

                    // payout
                    let payout = 0;
                    if (r.data?.payout !== undefined) {
                        payout = Number(String(r.data.payout).replace(/u64(\.private)?/, "").trim());
                    } else {
                        const m = pt.match(/payout:\s*(\d+)u64/);
                        if (m) payout = Number(m[1]);
                    }

                    // paid
                    let paid = false;
                    if (r.data?.paid !== undefined) {
                        paid = r.data.paid === "true" || r.data.paid === true;
                    } else {
                        paid = pt.includes("paid: true");
                    }

                    const id = r.commitment || r.id || r.nonce || `contrib-${index}`;

                    return {
                        id: String(id).replace("field", ""),
                        owner: ownerAddr || address,
                        payroll_owner,
                        contributor,
                        payout,
                        paid,
                        ciphertext: r.recordCiphertext || r.ciphertext || "",
                        plaintext: pt,
                    };
                });
        } catch (err) {
            console.error("Failed to get contributor records:", err);
            return [];
        }
    }, [address, requestRecords]);

    // Fetch payment receipts
    const getPaymentReceipts = useCallback(async (): Promise<PaymentReceiptRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            const records = await requestRecords(PROGRAM_ID, true);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (records as any[])
                .filter((r: any) => {
                    if (r.spent === true || r.spent === "true") return false;
                    if (r.recordName && r.recordName !== "PaymentReceipt") return false;
                    if (!r.recordName) {
                        const pt = r.recordPlaintext || r.plaintext || "";
                        if (!pt.includes("amount") || pt.includes("total_budget")) return false;
                    }
                    return true;
                })
                .map((r: any, index: number) => {
                    const pt = r.recordPlaintext || r.plaintext || "";

                    let ownerAddr = "";
                    if (r.sender && String(r.sender).startsWith("aleo1")) ownerAddr = r.sender;
                    else if (r.owner && String(r.owner).startsWith("aleo1")) ownerAddr = r.owner;
                    else {
                        const om = pt.match(/owner:\s*(aleo1[a-z0-9]+)/);
                        if (om) ownerAddr = om[1];
                    }

                    let contributor = r.data?.contributor || "";
                    if (!contributor) {
                        const m = pt.match(/contributor:\s*(aleo1[a-z0-9]+)/);
                        if (m) contributor = m[1];
                    }

                    let amount = 0;
                    if (r.data?.amount !== undefined) {
                        amount = Number(String(r.data.amount).replace(/u64(\.private)?/, "").trim());
                    } else {
                        const m = pt.match(/amount:\s*(\d+)u64/);
                        if (m) amount = Number(m[1]);
                    }

                    const id = r.commitment || r.id || r.nonce || `receipt-${index}`;

                    return {
                        id: String(id).replace("field", ""),
                        owner: ownerAddr || address,
                        contributor,
                        amount,
                        ciphertext: r.recordCiphertext || r.ciphertext || "",
                        plaintext: pt,
                    };
                });
        } catch (err) {
            console.error("Failed to get payment receipts:", err);
            return [];
        }
    }, [address, requestRecords]);

    // Fetch user's unspent private credit records from credits.aleo
    const getCreditRecords = useCallback(async (): Promise<CreditRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            // Request records with plaintext so we can read field values
            const records = await requestRecords("credits.aleo", true);
            
            // Debug: log raw records so we can inspect the wallet's response shape
            console.log("[getCreditRecords] raw records from wallet:", JSON.stringify(records, null, 2));
            console.log("[getCreditRecords] record count:", records?.length ?? 0);
            if (records?.length > 0) {
                console.log("[getCreditRecords] first record keys:", Object.keys(records[0] as object));
                console.log("[getCreditRecords] first record:", records[0]);
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return (records as any[])
                .filter((r: any) => {
                    // Skip explicitly spent records
                    if (r.spent === true || r.spent === "true") return false;

                    // Accept if recordName matches OR if there's no recordName
                    // (some wallets don't include recordName for credits.aleo)
                    if (r.recordName && r.recordName !== "credits") return false;

                    return true;
                })
                .map((r: any) => {
                    // Parse microcredits from all possible locations:
                    // Shield wallet: r.recordPlaintext string ("microcredits: 16915906u64.private")
                    // Leo wallet: r.data.microcredits or r.microcredits
                    let microcredits = 0;

                    if (r.data?.microcredits !== undefined) {
                        microcredits = Number(String(r.data.microcredits).replace(/u64(\.private)?/, "").trim());
                    } else if (r.microcredits !== undefined) {
                        microcredits = Number(String(r.microcredits).replace(/u64(\.private)?/, "").trim());
                    }
                    
                    // Parse from recordPlaintext (Shield wallet format)
                    if (microcredits === 0 && r.recordPlaintext) {
                        const match = String(r.recordPlaintext).match(/microcredits:\s*(\d+)u64/);
                        if (match) microcredits = Number(match[1]);
                    }

                    // Fallback: parse from plaintext (other wallets)
                    if (microcredits === 0 && r.plaintext) {
                        const match = String(r.plaintext).match(/microcredits:\s*(\d+)u64/);
                        if (match) microcredits = Number(match[1]);
                    }

                    // Record ciphertext to pass into transactions
                    // Shield: r.recordCiphertext, Leo: r.ciphertext
                    const ciphertext = r.recordCiphertext || r.ciphertext || r.record || "";

                    // Owner address: Shield puts a field element in r.owner,
                    // actual address is in r.sender or parsed from plaintext
                    let ownerAddr = "";
                    if (r.sender && String(r.sender).startsWith("aleo1")) {
                        ownerAddr = r.sender;
                    } else if (r.owner && String(r.owner).startsWith("aleo1")) {
                        ownerAddr = r.owner;
                    } else if (r.recordPlaintext || r.plaintext) {
                        const pt = r.recordPlaintext || r.plaintext;
                        const ownerMatch = String(pt).match(/owner:\s*(aleo1[a-z0-9]+)/);
                        if (ownerMatch) ownerAddr = ownerMatch[1];
                    }

                    // Unique ID from commitment (most reliable) or fallbacks
                    const id = r.commitment || r.id || r.nonce || r.serial_number || 
                               ciphertext?.slice(0, 40) || String(Math.random());

                    return {
                        id: String(id).replace("field", ""),
                        owner: ownerAddr || address,
                        microcredits,
                        ciphertext,
                        plaintext: r.recordPlaintext || r.plaintext || "",
                    };
                })
                .filter((r) => r.microcredits > 0 && (r.ciphertext !== "" || r.plaintext !== ""));
        } catch (err) {
            console.error("Failed to get credit records:", err);
            return [];
        }
    }, [address, requestRecords]);

    return {
        // State
        connected,
        address,
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
        getCreditRecords,

        // Transaction Utilities
        pollTransactionStatus,
    };
}
