"use client";

import Link from "next/link";
import { Shield, ArrowRight, Building2, Coins, Repeat, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DarkVeil } from "@/components/animations/dark-veil";
import { FadeIn } from "@/components/animations/fade-in";
import { SpotlightCard } from "@/components/animations/spotlight-card";
import { SplitText } from "@/components/animations/split-text";

const useCases = [
  {
    title: "DAO Payroll",
    description: "Pay contributors privately without exposing salary data or treasury activity onchain.",
    icon: Building2,
  },
  {
    title: "Grants And Bounties",
    description: "Use the same private payroll flow for grants, milestone payouts, and contributor bounties.",
    icon: Coins,
  },
  {
    title: "Recurring Cycles",
    description: "Carry approved contributors across payroll cycles so monthly payouts stay consistent and easy to run.",
    icon: Repeat,
  },
];

const faqs = [
  {
    question: "Why are payouts defined in USD?",
    answer: "Budgets and contributor payouts are set in USD terms, while the contract deterministically converts them at execution using the payroll's USD Rate (Locked). Designed for USD-denominated payroll (future integration with USDCX/USAD).",
  },
  {
    question: "How does the system stay confidential?",
    answer: "Aleo records keep contributor identities, private balance records, and amounts private while zero-knowledge execution enforces payroll rules.",
  },
  {
    question: "What does the manager role do?",
    answer: "The owner defines policy by creating payrolls and setting payouts. A manager can optionally run payroll operations later without changing those rules.",
  },
  {
    question: "How fast is the demo flow?",
    answer: "The happy path is under a minute: create payroll, add contributors, run payroll, and watch all contributors settle privately.",
  },
];

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full border-b border-border bg-background/90 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            <span className="text-base font-semibold tracking-tight">Confidential Payroll</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link className="text-sm text-text-secondary hover:text-text-primary transition-colors" href="#use-cases">
              Use cases
            </Link>
            <Link className="text-sm text-text-secondary hover:text-text-primary transition-colors" href="#workflow">
              Workflow
            </Link>
          </nav>
          <Link href="/app">
            <Button size="sm">Launch App</Button>
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <DarkVeil className="py-20 md:py-32">
          <div className="mx-auto max-w-2xl px-4 text-center md:px-6">
            <FadeIn delay={0.1}>
              <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl md:text-6xl">
                <SplitText text="Private Payroll for DAOs" />
              </h1>
            </FadeIn>
            <FadeIn delay={0.25}>
              <p className="mt-4 text-lg text-text-primary md:text-xl">
                Pay contributors in USD — without exposing salaries on-chain.
              </p>
            </FadeIn>
            <FadeIn delay={0.35}>
              <p className="mt-4 text-sm text-text-primary">
                Built on Aleo with zero-knowledge privacy.
              </p>
            </FadeIn>
            <FadeIn delay={0.5}>
              <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
                <Link href="/app">
                  <Button size="lg" className="px-8">
                    Run a Private Payroll <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <a href="https://github.com" target="_blank" rel="noreferrer">
                  <Button variant="outline" size="lg" className="px-8">
                    View Source
                  </Button>
                </a>
              </div>
            </FadeIn>
          </div>
        </DarkVeil>

        <section id="use-cases" className="border-y border-border bg-surface/20 py-20">
          <div className="mx-auto max-w-6xl px-4 md:px-6">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium text-accent">Use cases</p>
              <h2 className="text-3xl font-semibold tracking-tight">Built for real contributor payments</h2>
            </FadeIn>
            <div className="grid gap-6 md:grid-cols-3">
              {useCases.map((item, index) => {
                const Icon = item.icon;
                return (
                  <FadeIn key={item.title} delay={0.1 + index * 0.1}>
                    <SpotlightCard className="h-full">
                      <CardHeader>
                        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                          <Icon className="h-5 w-5 text-accent" />
                        </div>
                        <CardTitle>{item.title}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{item.description}</CardDescription>
                      </CardContent>
                    </SpotlightCard>
                  </FadeIn>
                );
              })}
            </div>
          </div>
        </section>

        <section id="workflow" className="py-20 md:py-28">
          <div className="mx-auto max-w-5xl px-4 md:px-6">
            <FadeIn className="mb-12 text-center">
              <p className="mb-2 text-sm font-medium text-accent">Workflow</p>
              <h2 className="text-3xl font-semibold tracking-tight">Create Payroll, Add Contributors, Run Payroll, View Results</h2>
            </FadeIn>
            <div className="grid gap-6 md:grid-cols-4">
              {[
                "Define a USD-denominated budget and lock the payroll's USD rate.",
                "Set contributor payouts in USD, with optional recurring payments.",
                "Run payroll to pay contributors privately from available private balance.",
                "View paid results immediately and move to the next cycle when ready.",
              ].map((step, index) => (
                <FadeIn key={step} delay={0.1 + index * 0.08}>
                  <SpotlightCard className="h-full">
                    <CardHeader>
                      <CardTitle>{index + 1}. Cycle step</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{step}</CardDescription>
                    </CardContent>
                  </SpotlightCard>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border bg-surface/20 py-20 md:py-28">
          <div className="mx-auto max-w-4xl px-4 md:px-6">
            <FadeIn className="mb-10 text-center">
              <p className="mb-2 text-sm font-medium text-accent">FAQ</p>
              <h2 className="text-3xl font-semibold tracking-tight">What teams need to know</h2>
            </FadeIn>
            <div className="space-y-4">
              {faqs.map((item) => (
                <FadeIn key={item.question}>
                  <details className="group rounded-xl border border-border bg-surface/40 px-5 py-4">
                    <summary className="flex cursor-pointer items-center justify-between text-left text-lg font-medium text-text-primary">
                      <span>{item.question}</span>
                      <span className="text-sm text-accent transition-transform duration-200 group-open:rotate-45">+</span>
                    </summary>
                    <p className="mt-3 leading-relaxed text-text-secondary">{item.answer}</p>
                  </details>
                </FadeIn>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-border py-20">
          <FadeIn className="mx-auto max-w-3xl px-4 text-center md:px-6">
            <Wallet className="mx-auto mb-4 h-10 w-10 text-accent" />
            <h2 className="mb-4 text-2xl font-semibold">Private payroll rails for real treasury work</h2>
            <p className="mb-8 text-text-secondary">
              Start with one DAO contributor payroll and extend the same flow to grants, bounties, and team operations.
            </p>
            <Link href="/app">
              <Button size="lg" className="px-10">
                Launch App
              </Button>
            </Link>
          </FadeIn>
        </section>
      </main>

      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-sm text-text-secondary md:px-6">
          Built on Aleo for private contributor payments, grants, and bounty execution.
        </div>
      </footer>
    </div>
  );
}
