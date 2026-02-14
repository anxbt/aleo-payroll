"use client"

import * as React from "react"
import { CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusBadge } from "@/components/ui/status-badge";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { FadeIn } from "@/components/animations/fade-in";
import { DecryptedText } from "@/components/animations/decrypted-text";
import { Send, Lock, Users } from "lucide-react";

type TransactionStatus = "idle" | "pending" | "success" | "error"

export default function DashboardPage() {
    const [amount, setAmount] = React.useState("")
    const [contributeStatus, setContributeStatus] = React.useState<TransactionStatus>("idle")
    const [distributeStatus, setDistributeStatus] = React.useState<TransactionStatus>("idle")

    // const handleContribute = async () => {
    //     if (!amount) return
    //     setContributeStatus("pending")
    //     await new Promise(resolve => setTimeout(resolve, 2000))
    //     setContributeStatus("success")
    //     setAmount("")
    //     setTimeout(() => setContributeStatus("idle"), 3000)
    // }

    const { initPayroll, payrollRecords, isLoading, error } = usePayrollContract();
 
 const handleInitPayroll = async () => {
   if (!amount) return;
   setStatus("pending");
   try {
     const txId = await initPayroll(Number(amount));
     // Poll for completion
     const result = await pollTransactionStatus(txId);
    setStatus(result.status === "finalized" ? "success" : "error");
   } catch (err) {
     setStatus("error");
   }
 };

    const handleDistribute = async () => {
        setDistributeStatus("pending")
        await new Promise(resolve => setTimeout(resolve, 2000))
        setDistributeStatus("success")
        setTimeout(() => setDistributeStatus("idle"), 3000)
    }

    return (
        <div className="space-y-8">
            <FadeIn>
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">
                        <DecryptedText text="Pool Dashboard" speed={40} />
                    </h1>
                    <p className="text-text-secondary">Manage your private contributions and distributions.</p>
                </div>
            </FadeIn>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Join Pool Card */}
                <FadeIn delay={0.1}>
                    <SpotlightCard className="h-full border-dashed">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Users className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Join Pool</CardTitle>
                            </div>
                            <CardDescription>
                                Initialize your participation in the private pool.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-text-secondary mb-4">
                                Generate a zero-knowledge proof to register without revealing your identity.
                            </p>
                            <Button className="w-full" variant="secondary">
                                Generate Proof
                            </Button>
                        </CardContent>
                    </SpotlightCard>
                </FadeIn>

                {/* Contribute Card */}
                <FadeIn delay={0.2}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Lock className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Contribute</CardTitle>
                            </div>
                            <CardDescription>
                                Add funds privately to the pool.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-text-secondary">Amount (Credits)</label>
                                <Input
                                    placeholder="0.00"
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                className="w-full"
                                onClick={handleContribute}
                                disabled={contributeStatus === "pending" || !amount}
                            >
                                {contributeStatus === "pending" ? "Processing..." : "Sign & Contribute"}
                            </Button>
                            {contributeStatus === "success" && (
                                <StatusBadge status="success">Contribution confirmed</StatusBadge>
                            )}
                            {contributeStatus === "error" && (
                                <StatusBadge status="error">Transaction failed</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>

                {/* Distribute Card */}
                <FadeIn delay={0.3}>
                    <SpotlightCard className="h-full">
                        <CardHeader>
                            <div className="flex items-center gap-2 mb-1">
                                <Send className="h-4 w-4 text-accent" />
                                <CardTitle className="text-base">Distribute</CardTitle>
                            </div>
                            <CardDescription>
                                Trigger distribution to pool members.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <p className="text-sm text-text-secondary">
                                Execute the distribution logic. Amounts are calculated privately based on pool shares.
                            </p>
                        </CardContent>
                        <CardFooter className="flex flex-col gap-3">
                            <Button
                                variant="secondary"
                                className="w-full"
                                onClick={handleDistribute}
                                disabled={distributeStatus === "pending"}
                            >
                                {distributeStatus === "pending" ? "Processing..." : "Execute Distribution"}
                            </Button>
                            {distributeStatus === "success" && (
                                <StatusBadge status="success">Distribution complete</StatusBadge>
                            )}
                            {distributeStatus === "error" && (
                                <StatusBadge status="error">Distribution failed</StatusBadge>
                            )}
                        </CardFooter>
                    </SpotlightCard>
                </FadeIn>
            </div>

            {/* Status Section */}
            <FadeIn delay={0.4}>
                <SpotlightCard className="bg-surface/50">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base">Transaction Status</CardTitle>
                            <StatusBadge status="neutral">Private</StatusBadge>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-text-secondary">
                            Transaction history and balances are intentionally hidden.
                            Only success or failure of your most recent action is shown above.
                        </p>
                    </CardContent>
                </SpotlightCard>
            </FadeIn>
        </div>
    );
}
