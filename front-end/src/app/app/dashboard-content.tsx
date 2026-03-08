"use client"

import * as React from "react"
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { FadeIn } from "@/components/animations/fade-in";
import { DecryptedText } from "@/components/animations/decrypted-text";
import { Send, Users, Wallet, Plus, CreditCard, Play } from "lucide-react";
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
        batchPayContributors,
        discloseSpent,
        getCreditRecords,
        getPayrollRecords,
        getContributorRecords,
        pollTransactionStatus,
    } = usePayrollContract();

    // Credit records
    const [credits, setCredits] = React.useState<CreditRecord[]>([]);
    const [creditsLoading, setCreditsLoading] = React.useState(false);
    const [creditsError, setCreditsError] = React.useState<string | null>(null);
    
    // Payroll & contributor records
    const [payrolls, setPayrolls] = React.useState<PayrollRecord[]>([]);
    const [contributors, setContributors] = React.useState<ContributorRecord[]>([]);
    
    // ---- Separate selection state per card (fixes shared-state bug) ----
    // Init Payroll
    const [initBudget, setInitBudget] = React.useState("");
    
    // Add Contributor
    const [addPayrollId, setAddPayrollId] = React.useState("");
    const [contributorAddress, setContributorAddress] = React.useState("");
    const [payoutAmount, setPayoutAmount] = React.useState("");
    const [addError, setAddError] = React.useState<string | null>(null);
    
    // Pay Single Contributor
    const [payPayrollId, setPayPayrollId] = React.useState("");
    const [payContributorId, setPayContributorId] = React.useState("");
    const [payFundingCreditId, setPayFundingCreditId] = React.useState("");
    
    // Batch Pay
    const [batchPayrollId, setBatchPayrollId] = React.useState("");
    const [batchSelections, setBatchSelections] = React.useState<Record<string, boolean>>({});
    const [batchFunding, setBatchFunding] = React.useState<Record<string, string>>({});
    
    // Disclose
    const [disclosePayrollId, setDisclosePayrollId] = React.useState("");
    
    // Transaction error detail
    const [txError, setTxError] = React.useState<string | null>(null);
    
    // Transaction states
    const [initStatus, setInitStatus] = React.useState<TransactionStatus>("idle");
    const [addContributorStatus, setAddContributorStatus] = React.useState<TransactionStatus>("idle");
    const [payStatus, setPayStatus] = React.useState<TransactionStatus>("idle");
    const [batchPayStatus, setBatchPayStatus] = React.useState<TransactionStatus>("idle");
    const [discloseStatus, setDiscloseStatus] = React.useState<TransactionStatus>("idle");
    
    // Load all records on mount and when wallet connects
    React.useEffect(() => {
        if (connected) {
            loadCredits();
            loadPayrolls();
            loadContributors();
        }
    }, [connected]);

    const refreshAllRecords = async () => {
        await Promise.all([loadCredits(), loadPayrolls(), loadContributors()]);
    };

    const loadCredits = async () => {
        setCreditsLoading(true);
        setCreditsError(null);
        try {
            const records = await getCreditRecords();
            setCredits(records);
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

    // ---- Derived state ----
    const addPayroll = payrolls.find(p => p.id === addPayrollId) || null;
    const payPayroll = payrolls.find(p => p.id === payPayrollId) || null;
    const batchPayroll = payrolls.find(p => p.id === batchPayrollId) || null;
    const disclosePayroll = payrolls.find(p => p.id === disclosePayrollId) || null;
    
    // Contributors for single-pay card (unpaid only)
    const payContributors = React.useMemo(() => {
        if (!payPayroll) return [];
        return contributors.filter(c => c.payroll_owner === payPayroll.owner && !c.paid);
    }, [contributors, payPayroll]);
    
    const selectedPayContributor = payContributors.find(c => c.id === payContributorId) || null;
    
    // Sufficient credits for a given payout
    const getSufficientCredits = (payoutAmount: number) => {
        return credits.filter(c => c.microcredits >= payoutAmount);
    };
    
    // Contributors for batch pay (unpaid only)
    const batchContributors = React.useMemo(() => {
        if (!batchPayroll) return [];
        return contributors.filter(c => c.payroll_owner === batchPayroll.owner && !c.paid);
    }, [contributors, batchPayroll]);
    
    const selectedBatchContributors = batchContributors.filter(c => batchSelections[c.id]);

    // ============ Handlers ============

    // Initialize payroll — just a budget number, no credits consumed
    const handleInitPayroll = async () => {
        const budgetCredits = parseFloat(initBudget);
        if (!budgetCredits || budgetCredits <= 0) return;
        
        const budgetMicrocredits = Math.floor(budgetCredits * 1_000_000);
        
        setInitStatus("pending");
        setTxError(null);
        try {
            const txId = await initPayroll(budgetMicrocredits);
            setInitStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setInitStatus("success");
                setInitBudget("");
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
            setTimeout(() => setInitStatus("idle"), 5000);
        }
    };

    // Add contributor
    const handleAddContributor = async () => {
        if (!addPayroll || !contributorAddress || !payoutAmount) return;
        
        const payoutMicrocredits = Math.floor(parseFloat(payoutAmount) * 1_000_000);
        
        // Inline validation (no alert)
        if (payoutMicrocredits > (addPayroll.remaining_budget || 0)) {
            setAddError("Payout exceeds remaining payroll budget");
            return;
        }
        
        setAddContributorStatus("pending");
        setAddError(null);
        setTxError(null);
        try {
            const txId = await addContributor(
                addPayroll.plaintext || addPayroll.ciphertext,
                contributorAddress,
                payoutMicrocredits
            );
            setAddContributorStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setAddContributorStatus("success");
                await loadPayrolls();
                await loadContributors();
                setAddPayrollId("");
                setContributorAddress("");
                setPayoutAmount("");
                setTimeout(() => setAddContributorStatus("idle"), 3000);
            } else {
                setAddContributorStatus("error");
                setTimeout(() => setAddContributorStatus("idle"), 5000);
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

    // Pay single contributor — funding credit >= payout
    const handlePayContributor = async () => {
        if (!payPayroll || !selectedPayContributor || !payFundingCreditId) return;
        
        const fundingCredit = credits.find(c => c.id === payFundingCreditId);
        if (!fundingCredit) return;
        
        setPayStatus("pending");
        setTxError(null);
        try {
            const txId = await payContributor(
                payPayroll.plaintext || payPayroll.ciphertext,
                selectedPayContributor.plaintext || selectedPayContributor.ciphertext,
                fundingCredit.plaintext || fundingCredit.ciphertext
            );
            setPayStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setPayStatus("success");
                await refreshAllRecords();
                setPayContributorId("");
                setPayFundingCreditId("");
                setTimeout(() => setPayStatus("idle"), 3000);
            } else {
                setPayStatus("error");
                setTimeout(() => setPayStatus("idle"), 5000);
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

    // Batch pay 2-3 contributors
    const handleBatchPay = async () => {
        if (!batchPayroll || selectedBatchContributors.length < 2 || selectedBatchContributors.length > 3) return;
        
        // Validate all have funding credits assigned
        const contributorRecords: string[] = [];
        const fundingRecords: string[] = [];
        
        for (const c of selectedBatchContributors) {
            const creditId = batchFunding[c.id];
            if (!creditId) return;
            const credit = credits.find(cr => cr.id === creditId);
            if (!credit) return;
            contributorRecords.push(c.plaintext || c.ciphertext);
            fundingRecords.push(credit.plaintext || credit.ciphertext);
        }
        
        setBatchPayStatus("pending");
        setTxError(null);
        try {
            const txId = await batchPayContributors(
                batchPayroll.plaintext || batchPayroll.ciphertext,
                contributorRecords,
                fundingRecords
            );
            setBatchPayStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setBatchPayStatus("success");
                await refreshAllRecords();
                setBatchSelections({});
                setBatchFunding({});
                setTimeout(() => setBatchPayStatus("idle"), 3000);
            } else {
                setBatchPayStatus("error");
                setTimeout(() => setBatchPayStatus("idle"), 5000);
            }
        } catch (err) {
            console.error("Batch pay failed:", err);
            const msg = err instanceof Error ? err.message : String(err);
            setTxError(msg);
            setBatchPayStatus("error");
            await refreshAllRecords();
            setTimeout(() => setBatchPayStatus("idle"), 5000);
        }
    };

    // Disclose spent budget
    const handleDiscloseSpent = async () => {
        if (!disclosePayroll) return;
        
        setDiscloseStatus("pending");
        setTxError(null);
        try {
            const txId = await discloseSpent(disclosePayroll.plaintext || disclosePayroll.ciphertext);
            setDiscloseStatus("proving");
            
            const result = await pollTransactionStatus(txId);
            
            if (result.finalized) {
                setDiscloseStatus("success");
                setTimeout(() => setDiscloseStatus("idle"), 3000);
            } else {
                setDiscloseStatus("error");
                setTimeout(() => setDiscloseStatus("idle"), 5000);
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

    // Toggle batch contributor selection
    const toggleBatchSelection = (id: string) => {
        setBatchSelections(prev => {
            const next = { ...prev };
            if (next[id]) {
                delete next[id];
                // Also clear funding for this contributor
                setBatchFunding(f => {
                    const nf = { ...f };
                    delete nf[id];
                    return nf;
                });
            } else {
                // Max 3 selected
                const currentCount = Object.keys(next).length;
                if (currentCount >= 3) return prev;
                next[id] = true;
            }
            return next;
        });
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            <DecryptedText text="Payroll Dashboard" speed={40} />
                        </h1>
                        <p className="text-text-secondary">Manage private payrolls with zero-knowledge proofs</p>
                    </div>
                    <Button 
                        variant="outline" 
                        onClick={refreshAllRecords} 
                        disabled={isLoading || creditsLoading}
                        className="flex items-center gap-2"
                    >
                        <svg className={`h-4 w-4 ${(isLoading || creditsLoading) ? 'animate-spin' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Refresh All
                    </Button>
                </div>
            </FadeIn>

            {/* Quick Stats Bar */}
            <FadeIn delay={0.05}>
                <div className="grid grid-cols-3 gap-4 p-4 bg-surface/30 rounded-lg border border-border">
                    <div className="text-center">
                        <p className="text-2xl font-semibold">{payrolls.length}</p>
                        <p className="text-xs text-text-secondary">Payrolls</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-semibold">{contributors.filter(c => !c.paid).length}</p>
                        <p className="text-xs text-text-secondary">Unpaid Contributors</p>
                    </div>
                    <div className="text-center">
                        <p className="text-2xl font-semibold">{credits.length}</p>
                        <p className="text-xs text-text-secondary">Credit Records</p>
                    </div>
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

            {/* Row 1: Init Payroll + Add Contributor */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Initialize Payroll Card */}
                <FadeIn delay={0.1}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <CreditCard className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Create Payroll</CardTitle>
                            </div>
                            <CardDescription>
                                Set up a new payroll with a declared budget
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Budget (Credits)</label>
                                <Input
                                    placeholder="e.g. 10.0"
                                    type="number"
                                    min="0"
                                    step="0.000001"
                                    value={initBudget}
                                    onChange={(e) => setInitBudget(e.target.value)}
                                />
                                <p className="text-xs text-text-secondary">
                                    No credits are locked — budget is tracked on-chain. You provide funding credits when paying contributors.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleInitPayroll}
                                disabled={initStatus !== "idle" || !initBudget || parseFloat(initBudget) <= 0 || isLoading}
                            >
                                {initStatus === "pending" && "Pending..."}
                                {initStatus === "proving" && "Generating ZK Proof..."}
                                {initStatus === "idle" && "Create Payroll"}
                            </Button>
                            {initStatus === "success" && (
                                <StatusBadge status="success">Payroll created</StatusBadge>
                            )}
                            {initStatus === "error" && (
                                <StatusBadge status="error">Creation failed</StatusBadge>
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
                                Register a contributor — budget is reserved immediately
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={addPayrollId}
                                    onChange={(e) => { setAddPayrollId(e.target.value); setAddError(null); }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll, idx) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll #{idx + 1}: {(payroll.total_budget / 1_000_000).toFixed(2)} total, {(payroll.remaining_budget / 1_000_000).toFixed(2)} remaining
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
                                    onChange={(e) => { setPayoutAmount(e.target.value); setAddError(null); }}
                                />
                                <p className="text-xs text-text-secondary">
                                    This amount is locked at add-time and reserved from the budget
                                </p>
                                {addPayroll && payoutAmount && (
                                    <p className={`text-xs ${
                                        Math.floor(parseFloat(payoutAmount) * 1_000_000) > (addPayroll.remaining_budget || 0) 
                                            ? 'text-red-400' 
                                            : 'text-green-400'
                                    }`}>
                                        {Math.floor(parseFloat(payoutAmount) * 1_000_000) > (addPayroll.remaining_budget || 0) 
                                            ? 'Exceeds remaining budget!' 
                                            : 'Within remaining budget'}
                                    </p>
                                )}
                                {addError && (
                                    <p className="text-xs text-red-400">{addError}</p>
                                )}
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleAddContributor}
                                disabled={addContributorStatus !== "idle" || !addPayroll || !contributorAddress || !payoutAmount || isLoading}
                            >
                                {addContributorStatus === "pending" && "Pending..."}
                                {addContributorStatus === "proving" && "Generating ZK Proof..."}
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
            </div>

            {/* Row 2: Pay Single + Batch Pay */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Pay Single Contributor Card */}
                <FadeIn delay={0.3}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Send className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Pay Contributor</CardTitle>
                            </div>
                            <CardDescription>
                                Execute payout to a single contributor
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={payPayrollId}
                                    onChange={(e) => { setPayPayrollId(e.target.value); setPayContributorId(""); setPayFundingCreditId(""); }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll, idx) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll #{idx + 1}: {(payroll.total_budget / 1_000_000).toFixed(2)} total, {(payroll.remaining_budget / 1_000_000).toFixed(2)} remaining
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Contributor</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={payContributorId}
                                    onChange={(e) => { setPayContributorId(e.target.value); setPayFundingCreditId(""); }}
                                >
                                    <option value="">Choose a contributor...</option>
                                    {payContributors.map((contributor) => (
                                        <option key={contributor.id} value={contributor.id}>
                                            {contributor.contributor.slice(0, 12)}... ({(contributor.payout / 1_000_000).toFixed(2)} credits)
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-text-secondary">
                                    {payContributors.length} unpaid contributor(s)
                                </p>
                            </div>
                            {selectedPayContributor && (
                                <>
                                    <div className="p-3 bg-surface/50 rounded-lg">
                                        <p className="text-xs text-text-secondary">Payout Amount</p>
                                        <p className="text-sm font-medium">{(selectedPayContributor.payout / 1_000_000).toFixed(6)} credits</p>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-medium text-text-secondary">Select Funding Credit</label>
                                        <select
                                            className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                            value={payFundingCreditId}
                                            onChange={(e) => setPayFundingCreditId(e.target.value)}
                                        >
                                            <option value="">Choose a credit...</option>
                                            {getSufficientCredits(selectedPayContributor.payout).map((credit) => (
                                                <option key={credit.id} value={credit.id}>
                                                    {(credit.microcredits / 1_000_000).toFixed(6)} credits
                                                    {credit.microcredits > selectedPayContributor.payout 
                                                        ? ` (change: ${((credit.microcredits - selectedPayContributor.payout) / 1_000_000).toFixed(6)})` 
                                                        : " (exact)"}
                                                </option>
                                            ))}
                                        </select>
                                        {getSufficientCredits(selectedPayContributor.payout).length === 0 && (
                                            <p className="text-xs text-yellow-400">
                                                No credit record with at least {(selectedPayContributor.payout / 1_000_000).toFixed(6)} credits found.
                                            </p>
                                        )}
                                    </div>
                                </>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handlePayContributor}
                                disabled={payStatus !== "idle" || !payPayroll || !selectedPayContributor || !payFundingCreditId || isLoading}
                            >
                                {payStatus === "pending" && "Pending..."}
                                {payStatus === "proving" && "Generating ZK Proof..."}
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

                {/* Batch Pay Card — Wave 3 Feature */}
                <FadeIn delay={0.4}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Play className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Run Payroll</CardTitle>
                                <StatusBadge status="neutral">Batch</StatusBadge>
                            </div>
                            <CardDescription>
                                Pay 2–3 contributors in a single transaction
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Select Payroll</label>
                                <select
                                    className="w-full p-2 bg-background border border-border rounded-md text-sm"
                                    value={batchPayrollId}
                                    onChange={(e) => { setBatchPayrollId(e.target.value); setBatchSelections({}); setBatchFunding({}); }}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll, idx) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll #{idx + 1}: {(payroll.total_budget / 1_000_000).toFixed(2)} total, {(payroll.remaining_budget / 1_000_000).toFixed(2)} remaining
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {batchPayroll && batchContributors.length > 0 && (
                                <div className="space-y-3">
                                    <label className="text-xs font-medium text-text-secondary">
                                        Select Contributors ({selectedBatchContributors.length}/3)
                                    </label>
                                    <div className="space-y-2 max-h-64 overflow-y-auto">
                                        {batchContributors.map((c) => {
                                            const isSelected = !!batchSelections[c.id];
                                            const sufficientCredits = getSufficientCredits(c.payout);
                                            return (
                                                <div
                                                    key={c.id}
                                                    className={`p-3 rounded-lg border transition-colors ${
                                                        isSelected 
                                                            ? 'border-accent bg-accent/5' 
                                                            : 'border-border bg-surface/30 hover:border-border/80'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <label className="flex items-center gap-2 cursor-pointer flex-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={isSelected}
                                                                onChange={() => toggleBatchSelection(c.id)}
                                                                className="rounded border-border"
                                                                disabled={!isSelected && selectedBatchContributors.length >= 3}
                                                            />
                                                            <span className="text-sm">
                                                                {c.contributor.slice(0, 10)}...{c.contributor.slice(-4)}
                                                            </span>
                                                        </label>
                                                        <span className="text-xs text-text-secondary">
                                                            {(c.payout / 1_000_000).toFixed(2)} credits
                                                        </span>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="mt-2">
                                                            <select
                                                                className="w-full p-1.5 bg-background border border-border rounded text-xs"
                                                                value={batchFunding[c.id] || ""}
                                                                onChange={(e) => setBatchFunding(prev => ({ ...prev, [c.id]: e.target.value }))}
                                                            >
                                                                <option value="">Assign funding credit...</option>
                                                                {sufficientCredits.map((credit) => (
                                                                    <option key={credit.id} value={credit.id}>
                                                                        {(credit.microcredits / 1_000_000).toFixed(6)} credits
                                                                    </option>
                                                                ))}
                                                            </select>
                                                            {sufficientCredits.length === 0 && (
                                                                <p className="text-xs text-yellow-400 mt-1">
                                                                    No sufficient credit record found
                                                                </p>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}

                            {batchPayroll && batchContributors.length === 0 && (
                                <p className="text-xs text-text-secondary text-center py-4">
                                    No unpaid contributors for this payroll
                                </p>
                            )}

                            {batchPayroll && batchContributors.length === 1 && (
                                <p className="text-xs text-yellow-400 text-center py-2">
                                    Batch pay requires at least 2 contributors. Use single pay instead.
                                </p>
                            )}
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleBatchPay}
                                disabled={
                                    batchPayStatus !== "idle" || 
                                    !batchPayroll || 
                                    selectedBatchContributors.length < 2 || 
                                    selectedBatchContributors.length > 3 ||
                                    selectedBatchContributors.some(c => !batchFunding[c.id]) ||
                                    isLoading
                                }
                            >
                                {batchPayStatus === "pending" && "Pending..."}
                                {batchPayStatus === "proving" && "Generating ZK Proof..."}
                                {batchPayStatus === "idle" && `Run Payroll (${selectedBatchContributors.length} selected)`}
                            </Button>
                            {batchPayStatus === "success" && (
                                <StatusBadge status="success">Batch payment executed</StatusBadge>
                            )}
                            {batchPayStatus === "error" && (
                                <StatusBadge status="error">Batch payment failed</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>
            </div>

            {/* Disclose Spent Section */}
            <FadeIn delay={0.5}>
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
                                    value={disclosePayrollId}
                                    onChange={(e) => setDisclosePayrollId(e.target.value)}
                                >
                                    <option value="">Choose a payroll...</option>
                                    {payrolls.map((payroll, idx) => (
                                        <option key={payroll.id} value={payroll.id}>
                                            Payroll #{idx + 1}: {(payroll.total_budget / 1_000_000).toFixed(2)} total, {(payroll.remaining_budget / 1_000_000).toFixed(2)} remaining
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <Button
                            onClick={handleDiscloseSpent}
                            disabled={discloseStatus !== "idle" || !disclosePayroll || isLoading}
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

            {/* Refresh Data Buttons */}
            <FadeIn delay={0.6}>
                <div className="flex gap-4">
                    <Button variant="outline" onClick={loadCredits} disabled={isLoading || creditsLoading}>
                        <CreditCard className="h-4 w-4 mr-2" />
                        Refresh Credits {creditsLoading ? "..." : `(${credits.length})`}
                    </Button>
                    <Button variant="outline" onClick={loadPayrolls} disabled={isLoading}>
                        <Users className="h-4 w-4 mr-2" />
                        Refresh Payrolls ({payrolls.length})
                    </Button>
                    <Button variant="outline" onClick={loadContributors} disabled={isLoading}>
                        <Users className="h-4 w-4 mr-2" />
                        Refresh Contributors ({contributors.length})
                    </Button>
                </div>
                {creditsError && (
                    <p className="text-xs text-red-400 mt-2">Credits error: {creditsError}</p>
                )}
            </FadeIn>
        </div>
    );
}
