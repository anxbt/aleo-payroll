"use client"

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Shield, Send, Lock, ArrowRight } from "lucide-react";
import { DecryptedText } from "@/components/animations/decrypted-text";
import { FadeIn } from "@/components/animations/fade-in";
import { SplitText } from "@/components/animations/split-text";
import { DarkVeil } from "@/components/animations/dark-veil";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { Cubes } from "@/components/animations/cubes";

export default function Home() {
  const faqs = [
    {
      question: "How does the pool stay confidential?",
      answer:
        "All contributions and payouts are wrapped in zero-knowledge proofs. Amounts and participant identities remain encrypted while proofs attest to budget compliance.",
    },
    {
      question: "Which wallets can I use?",
      answer:
        "We support Shield today and are adding other Aleo-compatible wallets next. Connect, fund, and sign proofs without exposing plaintext data.",
    },
    {
      question: "Can contributors audit payouts?",
      answer:
        "Yes. Contributors see proof outputs and spent notes tied to their commitments, so they can confirm distributions without revealing allocations publicly.",
    },
    {
      question: "What happens if the pool is underfunded?",
      answer:
        "Payout proofs enforce the budget cap. If deposits are insufficient, distributions fail gracefully until commitments are fully funded.",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
          <div className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-accent" />
            <span className="text-base font-semibold tracking-tight">AleoPool</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link className="text-sm text-text-secondary hover:text-text-primary transition-colors" href="#features">
              Features
            </Link>
            <Link className="text-sm text-text-secondary hover:text-text-primary transition-colors" href="#how-it-works">
              How it works
            </Link>
          </nav>
          <Link href="/app">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section with Dark Veil */}
        <DarkVeil className="py-20 md:py-32">
          <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
            <FadeIn delay={0.1}>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl mb-6">
                <SplitText text="Confidential Payroll Infrastructure" />
                <br />
                <span className="text-accent">
                  <DecryptedText text="on Aleo" speed={80} />
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.4}>
              <p className="mx-auto max-w-2xl text-text-secondary text-lg md:text-xl mb-10">
                Define payout commitments, enforce budget constraints, and execute private credit transfers — without revealing contributor identities or allocation amounts.
              </p>
            </FadeIn>
            <FadeIn delay={0.6}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/app">
                  <Button size="lg" className="px-8">
                    Launch App <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link href="https://github.com" target="_blank">
                  <Button variant="outline" size="lg" className="px-8">
                    View Source
                  </Button>
                </Link>
              </div>
            </FadeIn>
          </div>
        </DarkVeil>

        {/* ZK Visualization Section */}
        <section className="py-20 border-y border-border bg-surface/30">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <FadeIn direction="left">
                <Cubes />
              </FadeIn>
              <FadeIn direction="right">
                <div className="text-center md:text-left">
                  <p className="text-sm text-accent font-medium mb-2">Zero-Knowledge Proofs</p>
                  <h2 className="text-2xl font-semibold tracking-tight mb-4">
                    <DecryptedText text="Cryptographic Privacy" speed={60} />
                  </h2>
                  <p className="text-text-secondary">
                    Zero-knowledge proofs enforce pool rules while keeping contributors, recipients, and amounts opaque to the network. Only validity — not details — is broadcast.
                  </p>
                </div>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* 3-Step Explanation */}
        <section id="how-it-works" className="py-20 md:py-28">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <FadeIn className="text-center mb-12">
              <p className="text-sm text-accent font-medium mb-2">How it works</p>
              <h2 className="text-3xl font-semibold tracking-tight">
                Ship payroll with private proofs
              </h2>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              <FadeIn delay={0.1}>
                <SpotlightCard className="h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Lock className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>1. Define commitments</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Set recipients, lock budgets, and encode rules into commitments that govern each payout.
                    </CardDescription>
                  </CardContent>
                </SpotlightCard>
              </FadeIn>
              <FadeIn delay={0.2}>
                <SpotlightCard className="h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Shield className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>2. Fund privately</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Contributors deposit credits into the pool. Balances stay shielded while proofs track obligations.
                    </CardDescription>
                  </CardContent>
                </SpotlightCard>
              </FadeIn>
              <FadeIn delay={0.3}>
                <SpotlightCard className="h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Send className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>3. Prove and pay out</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Generate proofs showing releases respect budgets. Recipients receive encrypted records; the network only sees validity.
                    </CardDescription>
                  </CardContent>
                </SpotlightCard>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-20 md:py-28 border-t border-border bg-surface/20">
          <div className="max-w-4xl mx-auto px-4 md:px-6">
            <FadeIn className="text-center mb-10">
              <p className="text-sm text-accent font-medium mb-2">FAQ</p>
              <h2 className="text-3xl font-semibold tracking-tight">What to know before you fund</h2>
            </FadeIn>
            <div className="space-y-4">
              {faqs.map((item) => (
                <FadeIn key={item.question}>
                  <details className="group border border-border rounded-xl bg-surface/40 px-5 py-4 transition-colors">
                    <summary className="flex cursor-pointer items-center justify-between text-left text-lg font-medium text-text-primary">
                      <span>{item.question}</span>
                      <span className="text-sm text-accent transition-transform duration-200 group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 text-text-secondary leading-relaxed">{item.answer}</p>
                  </details>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-border">
          <FadeIn className="max-w-3xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Move payroll to private rails</h2>
            <p className="text-text-secondary mb-8">
              Launch a pool, fund it with shielded credits, and release payouts with cryptographic assurance on Aleo.
            </p>
            <Link href="/app">
              <Button size="lg" className="px-10">
                Launch App
              </Button>
            </Link>
          </FadeIn>
        </section>
      </main>

      <footer className="py-8 border-t border-border">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center">
          <p className="text-sm text-text-secondary">
            Built on Aleo. Privacy by default. Wave 1.
          </p>
        </div>
      </footer>
    </div>
  );
}
