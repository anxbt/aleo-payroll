"use client";

import { useCallback, useState, useRef, useEffect } from "react";
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react";
import {
    PROGRAM_ID,
    buildInitPayrollTransaction,
    buildAddContributorTransaction,
    buildPayContributorTransaction,
    buildBatchPay2Transaction,
    buildBatchPay3Transaction,
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
        decrypt,
    } = useWallet();

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);

    // Cleanup polling on unmount
    useEffect(() => {
        const ref = pollingRef.current;
        return () => {
            if (ref) {
                clearInterval(ref);
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

    // Initialize a new payroll (no credits consumed — budget tracking only)
    const initPayroll = useCallback(async (
        budget: number
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");

        setIsLoading(true);
        setError(null);

        try {
            const txOptions = buildInitPayrollTransaction(budget);
            console.log("[initPayroll] txOptions:", JSON.stringify(txOptions, null, 2));
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

    // Pay a single contributor — funding credit must have microcredits >= payout
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

    // Batch pay 2 or 3 contributors in a single transaction
    const batchPayContributors = useCallback(async (
        payrollRecord: string,
        contributorRecords: string[],
        fundingCredits: string[]
    ): Promise<string> => {
        if (!address) throw new Error("Wallet not connected");
        if (!executeTransaction) throw new Error("Execute transaction not available");
        if (contributorRecords.length !== fundingCredits.length) {
            throw new Error("Contributor and funding credit arrays must match");
        }
        if (contributorRecords.length < 2 || contributorRecords.length > 3) {
            throw new Error("Batch pay supports 2 or 3 contributors");
        }

        setIsLoading(true);
        setError(null);

        try {
            let txOptions;
            if (contributorRecords.length === 2) {
                txOptions = buildBatchPay2Transaction(
                    payrollRecord,
                    contributorRecords[0], contributorRecords[1],
                    fundingCredits[0], fundingCredits[1]
                );
            } else {
                txOptions = buildBatchPay3Transaction(
                    payrollRecord,
                    contributorRecords[0], contributorRecords[1], contributorRecords[2],
                    fundingCredits[0], fundingCredits[1], fundingCredits[2]
                );
            }
            const result = await executeTransaction(txOptions);
            return result?.transactionId || "";
        } catch (err) {
            const message = err instanceof Error ? err.message : "Failed to batch pay contributors";
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
            // Pass true to request decrypted plaintext from the wallet
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("[getPayrollRecords] raw records:", JSON.stringify(records, null, 2));
            
            // Filter to unspent Payroll records
            const payrollRecords = (records as any[]).filter((r: any) => {
                if (r.spent === true || r.spent === "true") return false;
                if (r.recordName && r.recordName !== "Payroll") return false;
                if (!r.recordName) {
                    const pt = r.recordPlaintext || r.plaintext || r.data?.toString() || JSON.stringify(r);
                    if (!pt.includes("total_budget")) return false;
                }
                return true;
            });

            // Decrypt records that don't have plaintext yet
            const decryptedRecords = await Promise.all(
                payrollRecords.map(async (r: any) => {
                    let pt = r.recordPlaintext || r.plaintext || "";
                    
                    // If plaintext is empty but we have ciphertext, try to decrypt
                    if (!pt && r.recordCiphertext && decrypt) {
                        try {
                            pt = await decrypt(r.recordCiphertext);
                            console.log("[getPayrollRecords] decrypted:", pt);
                        } catch (decryptErr) {
                            console.warn("[getPayrollRecords] decrypt failed:", decryptErr);
                        }
                    }

                    return { ...r, _plaintext: pt };
                })
            );

            const parsed = decryptedRecords.map((r: any, index: number) => {
                const pt = r._plaintext || "";
                const fullStr = pt || JSON.stringify(r);
                console.log(`[getPayrollRecords] record ${index} plaintext:`, pt.slice(0, 300));

                // Parse total_budget - try multiple formats
                let total_budget = 0;
                if (r.data?.total_budget !== undefined) {
                    const raw = String(r.data.total_budget);
                    total_budget = Number(raw.replace(/u64(\.private)?/g, "").trim());
                }
                if (total_budget === 0) {
                    const patterns = [
                        /total_budget:\s*(\d+)u64/,
                        /total_budget:\s*(\d+)/,
                    ];
                    for (const pattern of patterns) {
                        const m = pt.match(pattern) || fullStr.match(pattern);
                        if (m) {
                            total_budget = Number(m[1]);
                            break;
                        }
                    }
                }

                // Parse spent_budget
                let spent_budget = 0;
                if (r.data?.spent_budget !== undefined) {
                    const raw = String(r.data.spent_budget);
                    spent_budget = Number(raw.replace(/u64(\.private)?/g, "").trim());
                }
                if (spent_budget === 0 && total_budget > 0) {
                    const patterns = [
                        /spent_budget:\s*(\d+)u64/,
                        /spent_budget:\s*(\d+)/,
                    ];
                    for (const pattern of patterns) {
                        const m = pt.match(pattern) || fullStr.match(pattern);
                        if (m) {
                            spent_budget = Number(m[1]);
                            break;
                        }
                    }
                }

                // Owner
                let ownerAddr = "";
                if (r.sender && String(r.sender).startsWith("aleo1")) ownerAddr = r.sender;
                else if (r.owner && String(r.owner).startsWith("aleo1")) ownerAddr = r.owner;
                else if (r.data?.owner) {
                    const ownerStr = String(r.data.owner).replace(".private", "");
                    if (ownerStr.startsWith("aleo1")) ownerAddr = ownerStr;
                }
                if (!ownerAddr) {
                    const om = pt.match(/owner:\s*(aleo1[a-z0-9]+)/);
                    if (om) ownerAddr = om[1];
                }

                const id = r.commitment || r.id || r.nonce || `payroll-${index}`;
                const remaining = total_budget - spent_budget;

                console.log(`[getPayrollRecords] parsed record ${index}:`, {
                    id, total_budget, spent_budget, remaining
                });

                return {
                    id: String(id).replace("field", ""),
                    owner: ownerAddr || address,
                    total_budget,
                    spent_budget,
                    remaining_budget: remaining,
                    ciphertext: r.recordCiphertext || r.ciphertext || "",
                    plaintext: pt,
                };
            });

            console.log("[getPayrollRecords] final parsed:", parsed);
            return parsed;
        } catch (err) {
            console.error("Failed to get payroll records:", err);
            return [];
        }
    }, [address, requestRecords, decrypt]);

    // Fetch contributor records
    const getContributorRecords = useCallback(async (): Promise<ContributorRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            // Pass true to request decrypted plaintext from the wallet
            const records = await requestRecords(PROGRAM_ID, true);
            console.log("[getContributorRecords] raw:", records);
            
            // Filter to unspent Contributor records
            const contributorRecords = (records as any[]).filter((r: any) => {
                if (r.spent === true || r.spent === "true") return false;
                if (r.recordName && r.recordName !== "Contributor") return false;
                if (!r.recordName) {
                    const pt = r.recordPlaintext || r.plaintext || "";
                    if (!pt.includes("payroll_owner")) return false;
                }
                return true;
            });

            // Decrypt records that don't have plaintext yet
            const decryptedRecords = await Promise.all(
                contributorRecords.map(async (r: any) => {
                    let pt = r.recordPlaintext || r.plaintext || "";
                    if (!pt && r.recordCiphertext && decrypt) {
                        try {
                            pt = await decrypt(r.recordCiphertext);
                        } catch (e) {
                            console.warn("[getContributorRecords] decrypt failed:", e);
                        }
                    }
                    return { ...r, _plaintext: pt };
                })
            );

            return decryptedRecords.map((r: any, index: number) => {
                    const pt = r._plaintext || "";

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
    }, [address, requestRecords, decrypt]);

    // Fetch payment receipts
    const getPaymentReceipts = useCallback(async (): Promise<PaymentReceiptRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            // Pass true to request decrypted plaintext from the wallet
            const records = await requestRecords(PROGRAM_ID, true);
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
    }, [address, requestRecords, decrypt]);

    // Fetch user's unspent private credit records from credits.aleo
    const getCreditRecords = useCallback(async (): Promise<CreditRecord[]> => {
        if (!address) throw new Error("Wallet not connected");
        if (!requestRecords) throw new Error("Request records not available");

        try {
            // Pass true to request decrypted plaintext from the wallet
            const records = await requestRecords("credits.aleo", true);
            
            console.log("[getCreditRecords] raw records from wallet:", JSON.stringify(records, null, 2));
            console.log("[getCreditRecords] record count:", records?.length ?? 0);

            // Filter unspent credit records
            const creditRecords = (records as any[]).filter((r: any) => {
                if (r.spent === true || r.spent === "true") return false;
                if (r.recordName && r.recordName !== "credits") return false;
                return true;
            });

            console.log("[getCreditRecords] unspent count:", creditRecords.length);

            // Decrypt records that don't have plaintext yet
            const decryptedRecords = await Promise.all(
                creditRecords.map(async (r: any) => {
                    let pt = r.recordPlaintext || r.plaintext || "";
                    if (!pt && r.recordCiphertext && decrypt) {
                        try {
                            pt = await decrypt(r.recordCiphertext);
                        } catch (e) {
                            console.warn("[getCreditRecords] decrypt failed:", e);
                        }
                    }
                    return { ...r, _plaintext: pt };
                })
            );

            return decryptedRecords
                .map((r: any) => {
                    const pt = r._plaintext || "";
                    let microcredits = 0;

                    if (r.data?.microcredits !== undefined) {
                        microcredits = Number(String(r.data.microcredits).replace(/u64(\.private)?/, "").trim());
                    } else if (r.microcredits !== undefined) {
                        microcredits = Number(String(r.microcredits).replace(/u64(\.private)?/, "").trim());
                    }
                    
                    if (microcredits === 0 && pt) {
                        const match = String(pt).match(/microcredits:\s*(\d+)u64/);
                        if (match) microcredits = Number(match[1]);
                    }

                    const ciphertext = r.recordCiphertext || r.ciphertext || r.record || "";

                    let ownerAddr = "";
                    if (r.sender && String(r.sender).startsWith("aleo1")) {
                        ownerAddr = r.sender;
                    } else if (r.owner && String(r.owner).startsWith("aleo1")) {
                        ownerAddr = r.owner;
                    } else if (pt) {
                        const ownerMatch = String(pt).match(/owner:\s*(aleo1[a-z0-9]+)/);
                        if (ownerMatch) ownerAddr = ownerMatch[1];
                    }

                    const id = r.commitment || r.id || r.nonce || r.serial_number || 
                               ciphertext?.slice(0, 40) || String(Math.random());

                    console.log(`[getCreditRecords] record:`, { id: String(id).slice(0, 20), microcredits, spent: r.spent });

                    return {
                        id: String(id).replace("field", ""),
                        owner: ownerAddr || address,
                        microcredits,
                        ciphertext,
                        plaintext: pt,
                    };
                })
                .filter((r) => r.microcredits > 0 && (r.ciphertext !== "" || r.plaintext !== ""));
        } catch (err) {
            console.error("Failed to get credit records:", err);
            return [];
        }
    }, [address, requestRecords, decrypt]);

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
        batchPayContributors,
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
