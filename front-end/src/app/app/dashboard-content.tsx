"use client"

import * as React from "react"
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { FadeIn } from "@/components/animations/fade-in";
import { DecryptedText } from "@/components/animations/decrypted-text";
import { Send, Lock, Users, Wallet, Plus, CreditCard } from "lucide-react";
import { usePayrollContract } from "@/hooks/usePayroll";
import type { CreditRecord, PayrollRecord, ContributorRecord } from "@/types/aleo";

type TransactionStatus = "idle" | "pending" | "proving" | "broadcasting" | "success" | "error"

export default function DashboardContent() {
    const {
        address,
        connected,
        isLoading,
        error,
        initPayroll,
        addContributor,
        payContributor,
        discloseSpent,
        getCreditRecords,
        getPayrollRecords,
        getContributorRecords,
        pollTransactionStatus,
    } = usePayrollContract();

    // Credit selection state
    const [credits, setCredits] = React.useState<CreditRecord[]>([]);
    const [selectedCredit, setSelectedCredit] = React.useState<CreditRecord | null>(null);
    
    // Payroll state
    const [payrolls, setPayrolls] = React.useState<PayrollRecord[]>([]);
    const [selectedPayroll, setSelectedPayroll] = React.useState<PayrollRecord | null>(null);
    
    // Contributor state
    const [contributors, setContributors] = React.useState<ContributorRecord[]>([]);
    const [selectedContributor, setSelectedContributor] = React.useState<ContributorRecord | null>(null);
    
    // Form inputs
    const [contributorAddress, setContributorAddress] = React.useState("");
    const [payoutAmount, setPayoutAmount] = React.useState("");
    const [fundingCreditId, setFundingCreditId] = React.useState("");
    
    // Credit loading state
    const [creditsLoading, setCreditsLoading] = React.useState(false);
    
    // Transaction error detail (separate from hook error)
    const [txError, setTxError] = React.useState<string | null>(null);
    
    // Transaction states
    const [initStatus, setInitStatus] = React.useState<TransactionStatus>("idle");
    const [addContributorStatus, setAddContributorStatus] = React.useState<TransactionStatus>("idle");
    const [payStatus, setPayStatus] = React.useState<TransactionStatus>("idle");
    const [discloseStatus, setDiscloseStatus] = React.useState<TransactionStatus>("idle");
    
    // Load all records on mount and when wallet connects
    React.useEffect(() => {
        if (connected) {
            loadCredits();
            loadPayrolls();
            loadContributors();
        }
    }, [connected]);

    // Refresh all record types and clear stale selections
    const refreshAllRecords = async () => {
        setSelectedCredit(null);
        setSelectedPayroll(null);
        setSelectedContributor(null);
        setFundingCreditId("");
        await Promise.all([loadCredits(), loadPayrolls(), loadContributors()]);
    };

    // Debug: track fetch errors for credit records
    const [creditsError, setCreditsError] = React.useState<string | null>(null);

    const loadCredits = async () => {
        setCreditsLoading(true);
        setCreditsError(null);
        try {
            const records = await getCreditRecords();
            console.log("[loadCredits] parsed records:", records);
            setCredits(records);
            // If currently selected credit was consumed, clear selection
            if (selectedCredit && !records.find(r => r.id === selectedCredit.id)) {
                setSelectedCredit(null);
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error("Failed to load credits:", err);
            setCreditsError(msg);
        } finally {
            setCreditsLoading(false);
        }
    };

    const loadPayrolls = async () => {
        try {
            const records = await getPayrollRecords();
            setPayrolls(records);
        } catch (err) {
            console.error("Failed to load payrolls:", err);
        }
    };

    const loadContributors = async () => {
        try {
            const records = await getContributorRecords();
            setContributors(records);
        } catch (err) {
            console.error("Failed to load contributors:", err);
        }
    };

    // Initialize payroll with selected credit record
    // Budget is always equal to the selected credit's microcredits — no manual entry
    const handleInitPayroll = async () => {
        if (!selectedCredit) return;
        
        setInitStatus("pending");
        try {
            console.log("[handleInitPayroll] selected credit:", {
                id: selectedCredit.id,
                microcredits: selectedCredit.microcredits,
                ciphertextPreview: selectedCredit.ciphertext?.slice(0, 40),
                ciphertextLength: selectedCredit.ciphertext?.length,
                plaintextPreview: selectedCredit.plaintext?.slice(0, 60),
                plaintextLength: selectedCredit.plaintext?.length,
            });
            const txId = await initPayroll(
                selectedCredit.plaintext || selectedCredit.ciphertext,
                selectedCredit.microcredits
            );
            console.log("[handleInitPayroll] txId:", txId);
            setInitStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setInitStatus("success");
                // Consumed credit is now spent — refresh to remove it
                setSelectedCredit(null);
                await loadCredits();
                await loadPayrolls();
                setTimeout(() => setInitStatus("idle"), 3000);
            } else {
                setInitStatus("error");
                setTimeout(() => setInitStatus("idle"), 5000);
            }
        } catch (err) {
            console.error("Init payroll failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setTxError(msg);
            setInitStatus("error");
            // Refresh records — the selected credit may now be spent
            await refreshAllRecords();
            setTimeout(() => setInitStatus("idle"), 5000);
        }
    };

    // Add contributor to selected payroll
    const handleAddContributor = async () => {
        if (!selectedPayroll || !contributorAddress || !payoutAmount) return;
        
        setAddContributorStatus("pending");
        try {
            const payoutMicrocredits = Math.floor(parseFloat(payoutAmount) * 1_000_000);
            
            // Validate payout doesn't exceed remaining budget
            if (payoutMicrocredits > (selectedPayroll.remaining_budget || 0)) {
                alert("Payout exceeds remaining payroll budget");
                setAddContributorStatus("idle");
                return;
            }
            
            const txId = await addContributor(
                selectedPayroll.plaintext || selectedPayroll.ciphertext,
                contributorAddress,
                payoutMicrocredits
            );
            setAddContributorStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setAddContributorStatus("success");
                await loadPayrolls();      // payroll record was consumed & replaced
                await loadContributors();  // new contributor record created
                setSelectedPayroll(null);  // old payroll record is now stale
                setContributorAddress("");
                setPayoutAmount("");
                setTimeout(() => setAddContributorStatus("idle"), 3000);
            } else {
                setAddContributorStatus("error");
            }
        } catch (err) {
            console.error("Add contributor failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setTxError(msg);
            setAddContributorStatus("error");
            await refreshAllRecords();
            setTimeout(() => setAddContributorStatus("idle"), 5000);
        }
    };

    // Pay contributor with exact funding credit
    // Funding credit amount must exactly match contributor.payout
    const handlePayContributor = async () => {
        if (!selectedPayroll || !selectedContributor || !fundingCreditId) return;
        
        const fundingCredit = credits.find(c => c.id === fundingCreditId);
        if (!fundingCredit) {
            alert("Selected funding credit not found");
            return;
        }
        
        // Validate: funding credit must exactly match payout
        if (fundingCredit.microcredits !== selectedContributor.payout) {
            alert(
                `Funding credit must exactly match payout amount.\n` +
                `Required: ${(selectedContributor.payout / 1_000_000).toFixed(6)} credits\n` +
                `Selected: ${(fundingCredit.microcredits / 1_000_000).toFixed(6)} credits`
            );
            return;
        }
        
        setPayStatus("pending");
        try {
            const txId = await payContributor(
                selectedPayroll.plaintext || selectedPayroll.ciphertext,
                selectedContributor.plaintext || selectedContributor.ciphertext,
                fundingCredit.plaintext || fundingCredit.ciphertext
            );
            setPayStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setPayStatus("success");
                await loadPayrolls();
                await loadContributors();
                await loadCredits(); // Refresh credits (funding credit consumed)
                setSelectedContributor(null);
                setFundingCreditId("");
                setTimeout(() => setPayStatus("idle"), 3000);
            } else {
                setPayStatus("error");
            }
        } catch (err) {
            console.error("Pay contributor failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setTxError(msg);
            setPayStatus("error");
            await refreshAllRecords();
            setTimeout(() => setPayStatus("idle"), 5000);
        }
    };

    // Disclose spent budget
    const handleDiscloseSpent = async () => {
        if (!selectedPayroll) return;
        
        setDiscloseStatus("pending");
        try {
            const txId = await discloseSpent(selectedPayroll.plaintext || selectedPayroll.ciphertext);
            setDiscloseStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setDiscloseStatus("success");
                setTimeout(() => setDiscloseStatus("idle"), 3000);
            } else {
                setDiscloseStatus("error");
            }
        } catch (err) {
            console.error("Disclose spent failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setTxError(msg);
            setDiscloseStatus("error");
            await refreshAllRecords();
            setTimeout(() => setDiscloseStatus("idle"), 5000);
        }
    };

    // Get available contributors for selected payroll
    const availableContributors = React.useMemo(() => {
        if (!selectedPayroll) return [];
        return contributors.filter(c => c.payroll_owner === selectedPayroll.owner);
    }, [contributors, selectedPayroll]);
    
    // Get credits that match a specific payout amount
    const getMatchingCredits = (payoutAmount: number) => {
        return credits.filter(c => c.microcredits === payoutAmount);
    };

    if (!connected) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <FadeIn>
                    <div className="text-center space-y-4">
                        <Wallet className="h-12 w-12 text-accent mx-auto" />
                        <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
                        <p className="text-text-secondary">Connect your Shield or Leo wallet to manage payrolls</p>
                    </div>
                </FadeIn>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <FadeIn>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        <DecryptedText text="Payroll Dashboard" speed={40} />
                    </h1>
                    <p className="text-text-secondary">Manage private payrolls with real credit integration</p>
                </div>
            </FadeIn>

            {(error || txError) && (
                <FadeIn>
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-red-400 text-sm font-medium">{error || txError}</p>
                        {txError && txError.includes("already exists") && (
                            <p className="text-red-300/70 text-xs mt-2">
                                This record was already consumed on-chain. Records have been refreshed automatically.
                            </p>
                        )}
                        <button
                            type="button"
                            onClick={() => setTxError(null)}
                            className="text-xs text-text-secondary hover:underline mt-2"
                        >
                            Dismiss
                        </button>
                    </div>
                </FadeIn>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Initialize Payroll Card */}
                <FadeIn delay={0.1}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Initialize Payroll</CardTitle>
                            </div>
                            <CardDescription>
                                Lock credits into a new payroll contract
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Available credit count */}
                            <div className="flex items-center justify-between">
                                <p className="text-xs text-text-secondary">
                                    {creditsLoading
                                        ? "Loading records..."
                                        : `${credits.length} credit record${credits.length !== 1 ? "s" : ""} available`}
                                </p>
                                <button
                                    type="button"
                                    onClick={loadCredits}
                                    disabled={creditsLoading || isLoading}
                                    className="text-xs text-accent hover:underline disabled:opacity-50"
                                >
                                    Refresh
                                </button>
                            </div>

                            {creditsError && (
                                <div className="p-2 bg-red-500/10 border border-red-500/20 rounded-md">
                                    <p className="text-xs text-red-400">Error: {creditsError}</p>
                                </div>
                            )}

                            {credits.length === 0 && !creditsLoading ? (
                                <div className="p-3 bg-surface/50 rounded-lg text-center">
                                    <p className="text-sm text-text-secondary">
                                        No available credit records found.
                                    </p>
                                    <p className="text-xs text-text-secondary mt-1">
                                        You need at least one unspent credits.aleo/credits record to initialize a payroll.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-secondary">Select Credit Record</label>
                                        <select
                                            className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                            value={selectedCredit?.id || ""}
                                            disabled={!connected || creditsLoading}
                                            onChange={(e) => {
                                                const credit = credits.find(c => c.id === e.target.value);
                                                setSelectedCredit(credit || null);
                                            }}
                                        >
                                            <option value="">Choose a credit record...</option>
                                            {credits.map((credit) => (
                                                <option key={credit.id} value={credit.id}>
                                                    {(credit.microcredits / 1_000_000).toFixed(6)} credits
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* Budget auto-filled from selected credit — read only */}
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-secondary">Budget (Credits)</label>
                                        <Input
                                            type="text"
                                            value={
                                                selectedCredit
                                                    ? (selectedCredit.microcredits / 1_000_000).toFixed(6)
                                                    : ""
                                            }
                                            placeholder="Select a credit record above"
                                            disabled
                                            readOnly
                                        />
                                        <p className="text-xs text-text-secondary">
                                            Budget is locked to the selected credit record value.
                                        </p>
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleInitPayroll}
                                disabled={initStatus !== "idle" || !selectedCredit || credits.length === 0 || isLoading}
                            >
                                {initStatus === "pending" && "Pending..."}
                                {initStatus === "proving" && "Generating ZK Proof..."}
                                {initStatus === "broadcasting" && "Broadcasting..."}
                                {initStatus === "idle" && "Lock Credits & Initialize"}
                            </Button>
                            {initStatus === "success" && (
                                <StatusBadge status="success">Payroll initialized</StatusBadge>
                            )}
                            {initStatus === "error" && (
                                <StatusBadge status="error">Initialization failed</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>

                {/* Add Contributor Card */}
                <FadeIn delay={0.2}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Plus className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Add Contributor</CardTitle>
                            </div>
                            <CardDescription>
                                Register a contributor with committed payout
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={selectedPayroll?.id || ""}
                                    onChange={(e) => {
                                        const payroll = payrolls.find(p => p.id === e.target.value);
                                        setSelectedPayroll(payroll || null);
                                    }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll ({(payroll.remaining_budget || 0) / 1_000_000} credits remaining)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Contributor Address</label>
                                <Input
                                    placeholder="aleo1..."
                                    value={contributorAddress}
                                    onChange={(e) => setContributorAddress(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Committed Payout (Credits)</label>
                                <Input
                                    placeholder="0.00"
                                    type="number"
                                    value={payoutAmount}
                                    onChange={(e) => setPayoutAmount(e.target.value)}
                                />
                                <p className="text-xs text-text-secondary">
                                    This amount is locked and cannot be changed
                                </p>
                                {selectedPayroll && payoutAmount && (
                                    <p className={`text-xs ${
                                        Math.floor(parseFloat(payoutAmount) * 1_000_000) > (selectedPayroll.remaining_budget || 0) 
                                            ? 'text-red-400' 
                                            : 'text-green-400'
                                    }`}>
                                        {Math.floor(parseFloat(payoutAmount) * 1_000_000) > (selectedPayroll.remaining_budget || 0) 
                                            ? 'Exceeds remaining budget!' 
                                            : 'Within remaining budget'}
                                    </p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleAddContributor}
                                disabled={addContributorStatus !== "idle" || !selectedPayroll || !contributorAddress || !payoutAmount || isLoading}
                            >
                                {addContributorStatus === "pending" && "Pending..."}
                                {addContributorStatus === "proving" && "Generating ZK Proof..."}
                                {addContributorStatus === "broadcasting" && "Broadcasting..."}
                                {addContributorStatus === "idle" && "Add Contributor"}
                            </Button>
                            {addContributorStatus === "success" && (
                                <StatusBadge status="success">Contributor added</StatusBadge>
                            )}
                            {addContributorStatus === "error" && (
                                <StatusBadge status="error">Failed to add</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>

                {/* Pay Contributor Card */}
                <FadeIn delay={0.3}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Send className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Pay Contributor</CardTitle>
                            </div>
                            <CardDescription>
                                Execute deterministic payout from locked credits
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={selectedPayroll?.id || ""}
                                    onChange={(e) => {
                                        const payroll = payrolls.find(p => p.id === e.target.value);
                                        setSelectedPayroll(payroll || null);
                                    }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll ({(payroll.remaining_budget || 0) / 1_000_000} credits)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Contributor</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={selectedContributor?.id || ""}
                                    onChange={(e) => {
                                        const contributor = availableContributors.find(c => c.id === e.target.value);
                                        setSelectedContributor(contributor || null);
                                        setFundingCreditId(""); // Reset funding credit
                                    }}
                                >
                                    <option value="">Choose a contributor...</option>
                                    {availableContributors.map((contributor) => (
                                        <option key={contributor.id} value={contributor.id}>
                                            {contributor.contributor.slice(0, 12)}... ({(contributor.payout / 1_000_000).toFixed(2)} credits)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-secondary">
                                    {availableContributors.length} contributor(s) available
                                </p>
                            </div>
                            {selectedContributor && (
                                <>
                                    <div className="p-3 bg-surface/50 rounded-lg">
                                        <p className="text-xs text-text-secondary">Required Funding Amount</p>
                                        <p className="text-sm font-medium">{(selectedContributor.payout / 1_000_000).toFixed(6)} credits</p>
                                        <p className="text-xs text-accent mt-1">Funding credit must match exactly</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-secondary">Select Funding Credit</label>
                                        <select
                                            className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                            value={fundingCreditId}
                                            onChange={(e) => setFundingCreditId(e.target.value)}
                                        >
                                            <option value="">Choose a credit...</option>
                                            {credits.map((credit) => {
                                                const isExact = credit.microcredits === selectedContributor.payout;
                                                return (
                                                    <option key={credit.id} value={credit.id}>
                                                        {isExact ? "✓ Exact match: " : ""}
                                                        {(credit.microcredits / 1_000_000).toFixed(6)} credits
                                                    </option>
                                                );
                                            })}
                                        </select>
                                        {getMatchingCredits(selectedContributor.payout).length === 0 && (
                                            <div className="p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                                                <p className="text-xs text-yellow-400">
                                                    No credit record matches {(selectedContributor.payout / 1_000_000).toFixed(6)} credits exactly.
                                                </p>
                                                <p className="text-xs text-text-secondary mt-1">
                                                    Use your wallet to send yourself a private transfer of exactly {(selectedContributor.payout / 1_000_000).toFixed(6)} credits to create a matching record.
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handlePayContributor}
                                disabled={payStatus !== "idle" || !selectedPayroll || !selectedContributor || !fundingCreditId || isLoading}
                            >
                                {payStatus === "pending" && "Pending..."}
                                {payStatus === "proving" && "Generating ZK Proof..."}
                                {payStatus === "broadcasting" && "Broadcasting..."}
                                {payStatus === "idle" && "Execute Payout"}
                            </Button>
                            {payStatus === "success" && (
                                <StatusBadge status="success">Payment executed</StatusBadge>
                            )}
                            {payStatus === "error" && (
                                <StatusBadge status="error">Payment failed</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>
            </div>

            {/* Disclose Spent Section */}
            <FadeIn delay={0.4}>
                <SpotlightCard className="bg-surface/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">Disclose Spent Budget</CardTitle>
                                <CardDescription>Voluntarily reveal aggregate spending</CardDescription>
                            </div>
                            <StatusBadge status="neutral">Private</StatusBadge>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={selectedPayroll?.id || ""}
                                    onChange={(e) => {
                                        const payroll = payrolls.find(p => p.id === e.target.value);
                                        setSelectedPayroll(payroll || null);
                                    }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll ({(payroll.remaining_budget || 0) / 1_000_000} credits remaining)
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button
                            onClick={handleDiscloseSpent}
                            disabled={discloseStatus !== "idle" || !selectedPayroll || isLoading}
                            variant="secondary"
                        >
                            {discloseStatus === "pending" && "Pending..."}
                            {discloseStatus === "proving" && "Generating ZK Proof..."}
                            {discloseStatus === "idle" && "Disclose Spent Amount"}
                        </Button>
                        {discloseStatus === "success" && (
                            <StatusBadge status="success">Spent amount disclosed</StatusBadge>
                        )}
                    </CardContent>
                </SpotlightCard>
            </FadeIn>

            {/* Refresh Data Button */}
            <FadeIn delay={0.5}>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={loadCredits} disabled={isLoading}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Refresh Credits
                    </Button>
                    <Button variant="outline" onClick={loadPayrolls} disabled={isLoading}>
                        <Lock className="h-4 w-4 mr-2" />
                        Refresh Payrolls
                    </Button>
                    <Button variant="outline" onClick={loadContributors} disabled={isLoading}>
                        <Users className="h-4 w-4 mr-2" />
                        Refresh Contributors
                    </Button>
                </div>
            </FadeIn>
        </div>
    );
}
