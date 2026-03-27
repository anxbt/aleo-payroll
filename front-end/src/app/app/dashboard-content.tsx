"use client";

import * as React from "react";
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { FadeIn } from "@/components/animations/fade-in";
import { DecryptedText } from "@/components/animations/decrypted-text";
import {
    AlertTriangle,
    ArrowRightLeft,
    CreditCard,
    DollarSign,
    FolderSync,
    Play,
    Plus,
    Users,
} from "lucide-react";
import { usePayrollContract } from "@/hooks/usePayroll";
import {
    formatAddress,
    formatCredits,
    formatRate,
    formatUsd,
    generatePayrollId,
    parseCreditsPerUsdToMicrocreditsPerCent,
    parseUsdToCents,
} from "@/lib/aleo-service";
import {
    DEPLOYED_PROGRAM_ID,
    DEPLOYMENT_EXPLORER_URL,
    DEPLOYMENT_NETWORK_URL,
} from "@/lib/deployment";
import type { ContributorRecord, CreditRecord, PayrollRecord } from "@/types/aleo";

type ActionState = "idle" | "pending" | "proving" | "success" | "error";

type SyncSnapshot = {
    credits: CreditRecord[];
    payrolls: PayrollRecord[];
    contributors: ContributorRecord[];
};

type ExecutionPlan = {
    contributors: ContributorRecord[];
    credits: CreditRecord[];
};

function statusLabel(status: number): "OPEN" | "EXECUTED" | "CLOSED" {
    if (status === 1) return "EXECUTED";
    if (status === 2) return "CLOSED";
    return "OPEN";
}

function statusTone(status: number): "success" | "pending" | "neutral" {
    if (status === 1) return "success";
    if (status === 2) return "neutral";
    return "pending";
}

function contributorIsDue(contributor: ContributorRecord, payroll: PayrollRecord): boolean {
    return contributor.payroll_id === payroll.payroll_id && contributor.active && contributor.last_paid_cycle < payroll.cycle_index;
}

function contributorPaidThisCycle(contributor: ContributorRecord, payroll: PayrollRecord): boolean {
    return contributor.payroll_id === payroll.payroll_id && contributor.last_paid_cycle === payroll.cycle_index;
}

function sumPayoutUsdCents(contributors: ContributorRecord[]): number {
    return contributors.reduce((total, contributor) => total + contributor.payout_usd_cents, 0);
}

function requiredMicrocredits(contributor: ContributorRecord, payroll: PayrollRecord): number {
    return contributor.payout_usd_cents * payroll.microcredits_per_usd_cent;
}

function combinations<T>(items: T[], size: number): T[][] {
    if (size === 0) return [[]];
    if (items.length < size) return [];
    if (size === 1) return items.map((item) => [item]);

    const output: T[][] = [];
    items.forEach((item, index) => {
        const rest = combinations(items.slice(index + 1), size - 1);
        rest.forEach((combo) => output.push([item, ...combo]));
    });
    return output;
}

function allocatePrivateBalance(
    contributors: ContributorRecord[],
    credits: CreditRecord[],
    payroll: PayrollRecord
): ExecutionPlan | null {
    const sortedCredits = [...credits].sort((a, b) => a.microcredits - b.microcredits);
    const sortedContributors = [...contributors].sort((a, b) => b.payout_usd_cents - a.payout_usd_cents);
    const selectedCredits: CreditRecord[] = [];

    for (const contributor of sortedContributors) {
        const needed = requiredMicrocredits(contributor, payroll);
        const creditIndex = sortedCredits.findIndex((credit) => credit.microcredits >= needed);
        if (creditIndex === -1) return null;
        selectedCredits.push(sortedCredits.splice(creditIndex, 1)[0]);
    }

    return {
        contributors: sortedContributors,
        credits: selectedCredits,
    };
}

function findNextExecutionPlan(
    contributors: ContributorRecord[],
    credits: CreditRecord[],
    payroll: PayrollRecord
): ExecutionPlan | null {
    const orderedContributors = [...contributors].sort((a, b) => b.payout_usd_cents - a.payout_usd_cents);

    for (const size of [3, 2, 1]) {
        if (orderedContributors.length < size) continue;
        const executionCombos = combinations(orderedContributors, size);
        for (const combo of executionCombos) {
            const allocation = allocatePrivateBalance(combo, credits, payroll);
            if (allocation) return allocation;
        }
    }

    return null;
}

export default function DashboardContent() {
    const {
        address,
        connected,
        isLoading,
        error,
        initPayroll,
        addContributor,
        runPayroll,
        closeCycle,
        openNextCycle,
        handoffPayrollToManager,
        handoffPayrollToOwner,
        transferContributorOperator,
        getCreditRecords,
        getPayrollRecords,
        getContributorRecords,
        getPaymentReceipts,
        getCycleSummaries,
        pollTransactionStatus,
    } = usePayrollContract();

    const [credits, setCredits] = React.useState<CreditRecord[]>([]);
    const [payrolls, setPayrolls] = React.useState<PayrollRecord[]>([]);
    const [contributors, setContributors] = React.useState<ContributorRecord[]>([]);
    const [selectedPayrollKey, setSelectedPayrollKey] = React.useState("");
    const [syncing, setSyncing] = React.useState(false);
    const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
    const [txError, setTxError] = React.useState<string | null>(null);
    const [actionState, setActionState] = React.useState<ActionState>("idle");
    const [actionLabel, setActionLabel] = React.useState("");

    const [budgetUsd, setBudgetUsd] = React.useState("");
    const [rateCreditsPerUsd, setRateCreditsPerUsd] = React.useState("");
    const [managerAddress, setManagerAddress] = React.useState("");

    const [contributorAddress, setContributorAddress] = React.useState("");
    const [payoutUsd, setPayoutUsd] = React.useState("");
    const [recurring, setRecurring] = React.useState(false);

    const txBusy = actionState === "pending" || actionState === "proving";

    const syncAllRecords = React.useCallback(async (): Promise<SyncSnapshot> => {
        setSyncing(true);
        try {
            const [creditRecords, payrollRecords, contributorRecords] = await Promise.all([
                getCreditRecords(),
                getPayrollRecords(),
                getContributorRecords(),
                getPaymentReceipts(),
                getCycleSummaries(),
            ]);

            setCredits(creditRecords);
            setPayrolls(payrollRecords);
            setContributors(contributorRecords);
            setLastSyncedAt(new Date());

            return {
                credits: creditRecords,
                payrolls: payrollRecords,
                contributors: contributorRecords,
            };
        } finally {
            setSyncing(false);
        }
    }, [getContributorRecords, getCreditRecords, getCycleSummaries, getPaymentReceipts, getPayrollRecords]);

    React.useEffect(() => {
        if (connected) {
            void syncAllRecords();
        }
    }, [connected, syncAllRecords]);

    React.useEffect(() => {
        if (!selectedPayrollKey && payrolls.length > 0) {
            setSelectedPayrollKey(payrolls[0].payroll_id);
            return;
        }

        if (selectedPayrollKey && !payrolls.some((payroll) => payroll.payroll_id === selectedPayrollKey)) {
            setSelectedPayrollKey(payrolls[0]?.payroll_id || "");
        }
    }, [payrolls, selectedPayrollKey]);

    const selectedPayroll = React.useMemo(
        () => payrolls.find((payroll) => payroll.payroll_id === selectedPayrollKey) || null,
        [payrolls, selectedPayrollKey]
    );

    const payrollContributors = React.useMemo(() => {
        if (!selectedPayroll) return [];
        return contributors.filter((contributor) => contributor.payroll_id === selectedPayroll.payroll_id);
    }, [contributors, selectedPayroll]);

    const dueContributors = React.useMemo(() => {
        if (!selectedPayroll) return [];
        return payrollContributors.filter((contributor) => contributorIsDue(contributor, selectedPayroll));
    }, [payrollContributors, selectedPayroll]);

    const paidThisCycle = React.useMemo(() => {
        if (!selectedPayroll) return [];
        return payrollContributors.filter((contributor) => contributorPaidThisCycle(contributor, selectedPayroll));
    }, [payrollContributors, selectedPayroll]);

    const cycleRequiredMicrocredits = React.useMemo(() => {
        if (!selectedPayroll) return 0;
        return selectedPayroll.remaining_cycle_usd_cents * selectedPayroll.microcredits_per_usd_cent;
    }, [selectedPayroll]);

    const availableMicrocredits = React.useMemo(
        () => credits.reduce((total, credit) => total + credit.microcredits, 0),
        [credits]
    );

    const managerConfigured = !!selectedPayroll && selectedPayroll.manager && selectedPayroll.manager !== selectedPayroll.treasury_owner;
    const canEditPayrollPolicy = !!selectedPayroll && selectedPayroll.owner === selectedPayroll.treasury_owner && address === selectedPayroll.owner;
    const canOperatePayroll = !!selectedPayroll && address === selectedPayroll.owner;

    const unpaidContributorCount = React.useMemo(
        () => contributors.filter((contributor) => {
            const payroll = payrolls.find((item) => item.payroll_id === contributor.payroll_id);
            return payroll ? contributorIsDue(contributor, payroll) : false;
        }).length,
        [contributors, payrolls]
    );

    const runTx = React.useCallback(async (
        label: string,
        exec: () => Promise<string>,
        options?: {
            maxAttempts?: number;
            interval?: number;
            allowTimeoutAsPending?: boolean;
        }
    ) => {
        setActionLabel(label);
        setActionState("pending");
        setTxError(null);

        try {
            const txId = await exec();
            setActionState("proving");
            const result = await pollTransactionStatus(
                txId,
                options?.maxAttempts ?? 60,
                options?.interval ?? 2000
            );

            if (!result.finalized && result.status === "Timeout" && options?.allowTimeoutAsPending) {
                setActionState("pending");
                setTxError(`${label} is still pending on Aleo. Tx: ${result.onChainId || txId}. Wait a bit and click Sync with Wallet.`);
                return { ...result, txId };
            }

            if (!result.finalized) {
                throw new Error(`${label} was not finalized (${result.status}). Tx: ${result.onChainId || txId}`);
            }
            setActionState("success");
            return { ...result, txId };
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            setTxError(message);
            setActionState("error");
            throw err;
        }
    }, [pollTransactionStatus]);

    const resetActionState = React.useCallback(() => {
        window.setTimeout(() => {
            setActionState("idle");
            setActionLabel("");
        }, 2500);
    }, []);

    const handleCreatePayroll = async () => {
        if (!address) return;

        const budgetUsdCents = parseUsdToCents(budgetUsd);
        const microcreditsPerUsdCent = parseCreditsPerUsdToMicrocreditsPerCent(rateCreditsPerUsd);
        if (budgetUsdCents <= 0 || microcreditsPerUsdCent <= 0) return;

        const payrollId = generatePayrollId();
        const manager = managerAddress.trim() || address;

        try {
            await runTx("Creating payroll", () => initPayroll(payrollId, budgetUsdCents, microcreditsPerUsdCent, manager));
            const snapshot = await syncAllRecords();
            const created = snapshot.payrolls.find((payroll) => payroll.payroll_id === payrollId);
            if (created) setSelectedPayrollKey(created.payroll_id);
            setBudgetUsd("");
            setRateCreditsPerUsd("");
            setManagerAddress("");
        } finally {
            resetActionState();
        }
    };

    const handleAddContributor = async () => {
        if (!selectedPayroll) return;

        const payoutUsdCents = parseUsdToCents(payoutUsd);
        if (!contributorAddress.trim() || payoutUsdCents <= 0) return;

        try {
            // Refresh records first so we don't submit with a stale payroll record.
            const snapshot = await syncAllRecords();
            const latestPayroll = snapshot.payrolls.find((item) => item.payroll_id === selectedPayroll.payroll_id);

            if (!latestPayroll) {
                setTxError("Selected payroll could not be refreshed from the wallet.");
                return;
            }

            const canEditLatestPayrollPolicy =
                latestPayroll.owner === latestPayroll.treasury_owner && address === latestPayroll.owner;

            if (!canEditLatestPayrollPolicy) {
                setTxError("Only the payroll owner can change contributors or payouts.");
                return;
            }

            if (latestPayroll.status !== 0) {
                setTxError("Contributors can only be added while the cycle is OPEN.");
                return;
            }

            if (latestPayroll.active_commitment_usd_cents + payoutUsdCents > latestPayroll.budget_usd_cents) {
                setTxError("This payout would exceed the payroll budget.");
                return;
            }

            await runTx("Adding contributor", () => addContributor(
                latestPayroll.plaintext || latestPayroll.ciphertext,
                contributorAddress.trim(),
                payoutUsdCents,
                recurring
            ));
            await syncAllRecords();
            setContributorAddress("");
            setPayoutUsd("");
            setRecurring(false);
        } catch {
            // runTx already sets user-facing error state; avoid uncaught promise logs.
        } finally {
            resetActionState();
        }
    };

    const handleRunPayroll = async () => {
        if (!selectedPayroll) return;
        if (!canOperatePayroll) {
            setTxError("Only the active operator can run this payroll.");
            return;
        }
        if (selectedPayroll.status !== 0) {
            setTxError("Only OPEN payroll cycles can be executed.");
            return;
        }

        let snapshot = await syncAllRecords();
        let payroll = snapshot.payrolls.find((item) => item.payroll_id === selectedPayroll.payroll_id) || null;
        if (!payroll) {
            setTxError("Selected payroll could not be refreshed from the wallet.");
            return;
        }

        try {
            while (payroll && payroll.status === 0) {
                const currentPayroll = payroll;
                const remainingContributors = snapshot.contributors.filter((contributor) => contributorIsDue(contributor, currentPayroll));
                if (remainingContributors.length === 0) break;

                const executionPlan = findNextExecutionPlan(remainingContributors, snapshot.credits, currentPayroll);
                if (!executionPlan) {
                    throw new Error("Available private balance records cannot cover the remaining private payouts. Sync with Wallet after funding the operator wallet.");
                }

                const executionUsdTotal = sumPayoutUsdCents(executionPlan.contributors);
                const finalizeCycle = currentPayroll.spent_usd_cents + executionUsdTotal === currentPayroll.cycle_due_usd_cents;

                const runResult = await runTx(
                    "Running payroll",
                    () => runPayroll(
                        currentPayroll.plaintext || currentPayroll.ciphertext,
                        executionPlan.contributors.map((contributor) => contributor.plaintext || contributor.ciphertext),
                        executionPlan.credits.map((credit) => credit.plaintext || credit.ciphertext),
                        finalizeCycle
                    ),
                    {
                        // Running payroll can take much longer than simpler transitions.
                        maxAttempts: 180,
                        interval: 2000,
                        allowTimeoutAsPending: true,
                    }
                );

                if (!runResult.finalized) {
                    break;
                }

                snapshot = await syncAllRecords();
                payroll = snapshot.payrolls.find((item) => item.payroll_id === selectedPayroll.payroll_id) || null;
            }
        } catch {
            // runTx already sets user-facing error state; avoid uncaught promise logs.
        } finally {
            resetActionState();
        }
    };

    const handleCloseCycle = async () => {
        if (!selectedPayroll) return;
        try {
            await runTx("Closing cycle", () => closeCycle(selectedPayroll.plaintext || selectedPayroll.ciphertext));
            await syncAllRecords();
        } finally {
            resetActionState();
        }
    };

    const handleOpenNextCycle = async () => {
        if (!selectedPayroll) return;
        try {
            await runTx("Opening next cycle", () => openNextCycle(selectedPayroll.plaintext || selectedPayroll.ciphertext));
            await syncAllRecords();
        } finally {
            resetActionState();
        }
    };

    const handleOperatorHandoff = async () => {
        if (!selectedPayroll) return;

        const toManager = selectedPayroll.owner === selectedPayroll.treasury_owner;
        const nextOperator = toManager ? selectedPayroll.manager : selectedPayroll.treasury_owner;
        if (!nextOperator || nextOperator === selectedPayroll.treasury_owner && toManager) {
            setTxError("Configure a distinct manager before delegating payroll operations.");
            return;
        }

        const relevantContributors = payrollContributors.filter((contributor) => contributor.owner === selectedPayroll.owner);

        try {
            for (const contributor of relevantContributors) {
                await runTx("Handing off contributor access", () => transferContributorOperator(
                    contributor.plaintext || contributor.ciphertext,
                    nextOperator
                ));
            }

            await runTx(
                toManager ? "Delegating payroll to manager" : "Returning payroll to owner",
                () => toManager
                    ? handoffPayrollToManager(selectedPayroll.plaintext || selectedPayroll.ciphertext)
                    : handoffPayrollToOwner(selectedPayroll.plaintext || selectedPayroll.ciphertext)
            );

            await syncAllRecords();
        } finally {
            resetActionState();
        }
    };

    const nextExecutionPlan = selectedPayroll ? findNextExecutionPlan(dueContributors, credits, selectedPayroll) : null;

    if (!connected) {
        return (
            <div className="flex min-h-[60vh] items-center justify-center">
                <FadeIn>
                    <div className="text-center space-y-4">
                        <CreditCard className="h-12 w-12 text-accent mx-auto" />
                        <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
                        <p className="text-text-secondary">
                            Connect Shield or Leo to run private contributor payments for DAOs and teams.
                        </p>
                    </div>
                </FadeIn>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <FadeIn>
                <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">
                            <DecryptedText text="Private Contributor Payments for DAOs and Teams" speed={36} />
                        </h1>
                        <p className="text-text-secondary">
                            Define a USD-denominated budget, set contributor payouts in USD, and run payroll privately without exposing salaries or treasury activity.
                        </p>
                        <p className="mt-2 text-sm text-text-secondary">
                            Designed for USD-denominated payroll (future integration with USDCX/USAD). Example: A DAO pays 5 contributors monthly without exposing salaries.
                        </p>
                    </div>
                    <div className="flex flex-col items-start gap-2 md:items-end">
                        <Button
                            variant="outline"
                            onClick={() => { void syncAllRecords(); }}
                            disabled={syncing || txBusy || isLoading}
                            className="flex items-center gap-2"
                        >
                            <FolderSync className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                            Sync with Wallet
                        </Button>
                        <p className="text-xs text-text-secondary">
                            Fetch the latest private records from your wallet before or after payroll activity.
                        </p>
                    </div>
                </div>
            </FadeIn>

            <FadeIn delay={0.03}>
                <div className="rounded-xl border border-border bg-surface/20 p-4">
                    <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Live Deployment</p>
                    <p className="mt-2 text-sm font-medium break-all">{DEPLOYED_PROGRAM_ID}</p>
                    <p className="mt-1 text-xs text-text-secondary break-all">Network: {DEPLOYMENT_NETWORK_URL}</p>
                    <a
                        href={DEPLOYMENT_EXPLORER_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                        View deployment transaction
                    </a>
                </div>
            </FadeIn>

            {(error || txError) && (
                <FadeIn>
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="mt-0.5 h-4 w-4 text-red-400" />
                            <div>
                                <p className="text-sm font-medium text-red-300">{error || txError}</p>
                                <button
                                    type="button"
                                    className="mt-2 text-xs text-text-secondary hover:underline"
                                    onClick={() => setTxError(null)}
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                    </div>
                </FadeIn>
            )}

            {(actionState === "pending" || actionState === "proving" || actionState === "success") && actionLabel && (
                <FadeIn>
                    <div className="rounded-lg border border-border bg-surface/40 p-4">
                        <div className="flex items-center justify-between gap-4">
                            <p className="text-sm font-medium">{actionLabel}</p>
                            <StatusBadge status={actionState === "success" ? "success" : "pending"}>
                                {actionState === "pending" && "Waiting for wallet"}
                                {actionState === "proving" && "Finalizing on Aleo"}
                                {actionState === "success" && "Synced"}
                            </StatusBadge>
                        </div>
                    </div>
                </FadeIn>
            )}

            <FadeIn delay={0.05}>
                <div className="grid gap-4 rounded-xl border border-border bg-surface/30 p-4 md:grid-cols-4">
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Total Payrolls</p>
                        <p className="mt-2 text-2xl font-semibold">{payrolls.length}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Unpaid Contributors</p>
                        <p className="mt-2 text-2xl font-semibold">{unpaidContributorCount}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Private Balance Records</p>
                        <p className="mt-2 text-2xl font-semibold">{credits.length}</p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Last Synced</p>
                        <p className="mt-2 text-lg font-semibold">{lastSyncedAt ? lastSyncedAt.toLocaleTimeString() : "Not yet synced"}</p>
                    </div>
                </div>
            </FadeIn>

            {selectedPayroll && (
                <FadeIn delay={0.08}>
                    <div className="grid gap-4 rounded-xl border border-border bg-surface/20 p-4 md:grid-cols-4">
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Current Payroll</p>
                            <p className="mt-2 text-base font-semibold">Payroll {selectedPayroll.payroll_id.slice(-6)}</p>
                            <p className="mt-1 text-sm text-text-secondary">Cycle {selectedPayroll.cycle_index}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Budget</p>
                            <p className="mt-2 text-2xl font-semibold">${formatUsd(selectedPayroll.budget_usd_cents)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Spent</p>
                            <p className="mt-2 text-2xl font-semibold">${formatUsd(selectedPayroll.spent_usd_cents)}</p>
                            <p className="mt-1 text-sm text-text-secondary">Scheduled ${formatUsd(selectedPayroll.cycle_due_usd_cents)}</p>
                        </div>
                        <div>
                            <p className="text-xs uppercase tracking-[0.16em] text-text-secondary">Status</p>
                            <div className="mt-3 flex items-center gap-2">
                                <StatusBadge status={statusTone(selectedPayroll.status)}>{statusLabel(selectedPayroll.status)}</StatusBadge>
                            </div>
                            <p className="mt-2 text-sm text-text-secondary">USD Rate (Locked): {formatRate(selectedPayroll.microcredits_per_usd_cent)} / USD</p>
                        </div>
                    </div>
                </FadeIn>
            )}

            <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
                <FadeIn delay={0.1}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <DollarSign className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">1. Create Payroll</CardTitle>
                            </div>
                            <CardDescription>
                                Define a USD-denominated budget and choose who can operate payroll after policy is set.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Payroll Budget (USD)</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    placeholder="2500.00"
                                    value={budgetUsd}
                                    onChange={(event) => setBudgetUsd(event.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">USD Rate (Locked)</label>
                                <Input
                                    type="number"
                                    step="0.000001"
                                    min="0"
                                    placeholder="1.250000"
                                    value={rateCreditsPerUsd}
                                    onChange={(event) => setRateCreditsPerUsd(event.target.value)}
                                />
                                <p className="text-xs text-text-secondary">
                                    This rate is stored on-chain for the payroll and used each time payouts are executed privately.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Manager Address (optional)</label>
                                <Input
                                    placeholder={address || "aleo1..."}
                                    value={managerAddress}
                                    onChange={(event) => setManagerAddress(event.target.value)}
                                />
                                <p className="text-xs text-text-secondary">
                                    The owner sets payroll policy. A manager can run payroll later, but cannot change contributor rules.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm text-text-secondary">
                                Designed for USD-denominated payroll (future integration with USDCX/USAD).
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full"
                                onClick={() => { void handleCreatePayroll(); }}
                                disabled={txBusy || isLoading || !budgetUsd || !rateCreditsPerUsd}
                            >
                                Create Payroll
                            </Button>
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>

                <FadeIn delay={0.15}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Available Payrolls</CardTitle>
                            </div>
                            <CardDescription>
                                Choose the payroll you want to manage and review results.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {payrolls.length === 0 && (
                                <p className="text-sm text-text-secondary">
                                    No payrolls in the connected wallet yet.
                                </p>
                            )}
                            {payrolls.map((payroll) => (
                                <button
                                    key={payroll.id}
                                    type="button"
                                    onClick={() => setSelectedPayrollKey(payroll.payroll_id)}
                                    className={`w-full rounded-lg border p-4 text-left transition-colors ${
                                        selectedPayrollKey === payroll.payroll_id
                                            ? "border-accent bg-accent/5"
                                            : "border-border bg-surface/20 hover:border-border/80"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-medium">Payroll {payroll.payroll_id.slice(-6)}</p>
                                            <p className="mt-1 text-xs text-text-secondary">
                                                ${formatUsd(payroll.budget_usd_cents)} budget • ${formatUsd(payroll.spent_usd_cents)} spent
                                            </p>
                                        </div>
                                        <StatusBadge status={statusTone(payroll.status)}>{statusLabel(payroll.status)}</StatusBadge>
                                    </div>
                                </button>
                            ))}
                        </CardContent>
                    </SpotlightCard>
                </FadeIn>
            </div>

            {selectedPayroll && (
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <FadeIn delay={0.2}>
                        <SpotlightCard className="h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <Plus className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-base">2. Add Contributors</CardTitle>
                                </div>
                                <CardDescription>
                                    Set contributor payouts in USD and decide whether they recur in future payroll cycles.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary">Contributor Address</label>
                                    <Input
                                        placeholder="aleo1..."
                                        value={contributorAddress}
                                        onChange={(event) => setContributorAddress(event.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-medium text-text-secondary">Payout per Cycle (USD)</label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="750.00"
                                        value={payoutUsd}
                                        onChange={(event) => setPayoutUsd(event.target.value)}
                                    />
                                </div>
                                <label className="flex items-center gap-3 rounded-lg border border-border bg-surface/20 p-3 text-sm">
                                    <input
                                        type="checkbox"
                                        className="h-4 w-4"
                                        checked={recurring}
                                        onChange={(event) => setRecurring(event.target.checked)}
                                    />
                                    Carry this contributor into future payroll cycles
                                </label>
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm text-text-secondary">
                                    Current active commitments: ${formatUsd(selectedPayroll.active_commitment_usd_cents)} / ${formatUsd(selectedPayroll.budget_usd_cents)}
                                </div>
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm text-text-secondary">
                                    Example: A DAO pays 5 contributors monthly without exposing salaries.
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                {selectedPayroll.status !== 0 ? (
                                    <p className="w-full rounded-lg border border-border bg-surface/20 px-3 py-2 text-sm text-text-secondary">
                                        Cannot add contributors after payroll execution. Open next cycle to continue
                                    </p>
                                ) : (
                                    <Button
                                        className="w-full"
                                        onClick={() => { void handleAddContributor(); }}
                                        disabled={txBusy || isLoading || !canEditPayrollPolicy || !contributorAddress || !payoutUsd}
                                    >
                                        Add Contributor
                                    </Button>
                                )}
                                {!canEditPayrollPolicy && (
                                    <p className="text-xs text-text-secondary">
                                        Only the owner can define contributors and payouts. Managers are execution-only.
                                    </p>
                                )}
                                {canEditPayrollPolicy && selectedPayroll.status !== 0 && (
                                    <p className="text-xs text-text-secondary">
                                        New contributors can only be added while the cycle is OPEN.
                                    </p>
                                )}
                            </CardFooter>
                        </SpotlightCard>
                    </FadeIn>

                    <FadeIn delay={0.25}>
                        <SpotlightCard className="h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <Play className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-base">3. Run Payroll</CardTitle>
                                </div>
                                <CardDescription>
                                    Run a payroll cycle to pay contributors privately. The system automatically uses available private credits.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="rounded-lg border border-border bg-surface/20 p-3">
                                        <p className="text-xs text-text-secondary">Due Contributors</p>
                                        <p className="mt-1 text-xl font-semibold">{dueContributors.length}</p>
                                    </div>
                                    <div className="rounded-lg border border-border bg-surface/20 p-3">
                                        <p className="text-xs text-text-secondary">Total Due (USD)</p>
                                        <p className="mt-1 text-xl font-semibold">${formatUsd(selectedPayroll.remaining_cycle_usd_cents)}</p>
                                    </div>
                                </div>
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm">
                                    <p className="font-medium">Private Balance</p>
                                    <p className="mt-2 text-text-secondary">
                                        Available private balance: {formatCredits(availableMicrocredits)} across {credits.length} record(s).
                                    </p>
                                    <p className="mt-2 text-text-secondary">
                                        Estimated private balance needed for this payroll: {formatCredits(cycleRequiredMicrocredits)}. The system automatically uses available private credits and refreshes after each finalized step.
                                    </p>
                                </div>
                                <div className="space-y-2">
                                    {dueContributors.length === 0 ? (
                                        <p className="text-sm text-text-secondary">All current-cycle contributors are already paid.</p>
                                    ) : (
                                        dueContributors.map((contributor) => (
                                            <div key={contributor.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/20 px-3 py-2 text-sm">
                                                <div>
                                                    <p className="font-medium">{formatAddress(contributor.contributor, 10)}</p>
                                                    <p className="text-xs text-text-secondary">
                                                        {contributor.recurring ? "Recurring" : "One-time"}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p>${formatUsd(contributor.payout_usd_cents)}</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button
                                    className="w-full"
                                    onClick={() => { void handleRunPayroll(); }}
                                    disabled={
                                        txBusy ||
                                        isLoading ||
                                        !canOperatePayroll ||
                                        selectedPayroll.status !== 0 ||
                                        dueContributors.length === 0 ||
                                        !nextExecutionPlan
                                    }
                                >
                                    Run Payroll
                                </Button>
                                <div className="flex w-full gap-3">
                                    <Button
                                        className="flex-1"
                                        variant="secondary"
                                        onClick={() => { void handleCloseCycle(); }}
                                        disabled={txBusy || isLoading || !canOperatePayroll || selectedPayroll.status !== 1}
                                    >
                                        Close Cycle
                                    </Button>
                                    <Button
                                        className="flex-1"
                                        variant="outline"
                                        onClick={() => { void handleOpenNextCycle(); }}
                                        disabled={txBusy || isLoading || !canOperatePayroll || selectedPayroll.status !== 2}
                                    >
                                        Open Next Cycle
                                    </Button>
                                </div>
                                {!canOperatePayroll && (
                                    <p className="text-xs text-text-secondary">
                                        Switch to the active operator wallet to run payroll or move the cycle forward.
                                    </p>
                                )}
                                {canOperatePayroll && dueContributors.length > 0 && !nextExecutionPlan && (
                                    <p className="text-xs text-text-secondary">
                                        Add more private balance to the operator wallet, then Sync with Wallet and try again.
                                    </p>
                                )}
                            </CardFooter>
                        </SpotlightCard>
                    </FadeIn>
                </div>
            )}

            {selectedPayroll && (
                <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <FadeIn delay={0.3}>
                        <SpotlightCard className="h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <Users className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-base">4. View Results</CardTitle>
                                </div>
                                <CardDescription>
                                    Review who has been paid, who will recur next cycle, and what remains scheduled.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm">
                                    <p className="font-medium">Roles</p>
                                    <p className="mt-2 text-text-secondary">Treasury owner: {formatAddress(selectedPayroll.treasury_owner)}</p>
                                    <p className="text-text-secondary">Active operator: {formatAddress(selectedPayroll.owner)}</p>
                                    <p className="text-text-secondary">
                                        Manager: {managerConfigured ? formatAddress(selectedPayroll.manager) : "Not configured"}
                                    </p>
                                    {managerConfigured && (
                                        <p className="mt-2 text-xs text-text-secondary">
                                            Operator handoff moves the live payroll and contributor records to the next wallet. Switch wallets after the final sync.
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    {payrollContributors.length === 0 && (
                                        <p className="text-sm text-text-secondary">No contributors scheduled yet.</p>
                                    )}
                                    {payrollContributors.map((contributor) => (
                                        <div key={contributor.id} className="flex items-center justify-between rounded-lg border border-border bg-surface/20 px-3 py-2 text-sm">
                                            <div>
                                                <p className="font-medium">{formatAddress(contributor.contributor, 10)}</p>
                                                <p className="text-xs text-text-secondary">
                                                    {contributor.recurring ? "Recurring schedule" : "One-time payment"}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <StatusBadge status={contributorPaidThisCycle(contributor, selectedPayroll) ? "success" : contributor.active ? "pending" : "neutral"}>
                                                    {contributorPaidThisCycle(contributor, selectedPayroll)
                                                        ? "Paid this cycle"
                                                        : contributor.active
                                                            ? "Queued"
                                                            : "Completed"}
                                                </StatusBadge>
                                                <span>${formatUsd(contributor.payout_usd_cents)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                            <CardFooter>
                                <div className="w-full text-sm text-text-secondary">
                                    {paidThisCycle.length} contributor(s) paid in cycle {selectedPayroll.cycle_index}.
                                </div>
                            </CardFooter>
                        </SpotlightCard>
                    </FadeIn>

                    <FadeIn delay={0.35}>
                        <SpotlightCard className="h-full">
                            <CardHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    <ArrowRightLeft className="h-4 w-4 text-accent" />
                                    <CardTitle className="text-base">Owner and Manager</CardTitle>
                                </div>
                                <CardDescription>
                                    The owner defines payroll policy. The manager can execute payroll operations after handoff.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm text-text-secondary">
                                    <p className="font-medium text-text-primary">USD Rate (Locked)</p>
                                    <p className="mt-2">
                                        {formatRate(selectedPayroll.microcredits_per_usd_cent)} / USD
                                    </p>
                                </div>
                                <div className="rounded-lg border border-border bg-surface/20 p-3 text-sm text-text-secondary">
                                    <p className="font-medium text-text-primary">Use cases</p>
                                    <p className="mt-2">Built for private contributor payments first, with grants, bounty payouts, and team payroll following the same flow.</p>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => { void handleOperatorHandoff(); }}
                                    disabled={
                                        txBusy ||
                                        isLoading ||
                                        !managerConfigured
                                    }
                                >
                                    {selectedPayroll.owner === selectedPayroll.treasury_owner ? "Delegate Operations to Manager" : "Return Operations to Owner"}
                                </Button>
                                {!managerConfigured && (
                                    <p className="text-xs text-text-secondary">
                                        Set a manager when creating the payroll to enable operator handoff.
                                    </p>
                                )}
                            </CardFooter>
                        </SpotlightCard>
                    </FadeIn>
                </div>
            )}
        </div>
    );
}
