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
                <SplitText text="Private contribution pools on" />
                <br />
                <span className="text-accent">
                  <DecryptedText text="Aleo" speed={80} />
                </span>
              </h1>
            </FadeIn>
            <FadeIn delay={0.4}>
              <p className="mx-auto max-w-2xl text-text-secondary text-lg md:text-xl mb-10">
                Pool funds and distribute assets with zero-knowledge verification.
                Contributions, allocations, and identities remain private by default.
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
                    Every transaction is verified using zero-knowledge proofs.
                    This allows the network to confirm validity without revealing
                    any sensitive information about amounts, recipients, or participants.
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
                Zero-knowledge privacy in three steps
              </h2>
            </FadeIn>
            <div className="grid md:grid-cols-3 gap-6">
              <FadeIn delay={0.1}>
                <SpotlightCard className="h-full">
                  <CardHeader>
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center mb-3">
                      <Lock className="h-5 w-5 text-accent" />
                    </div>
                    <CardTitle>1. Contribute privately</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Deposit funds into the pool. Your identity and amount remain hidden from public view.
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
                    <CardTitle>2. Verify with ZK proofs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Zero-knowledge proofs validate transitions without exposing any underlying data.
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
                    <CardTitle>3. Distribute privately</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription>
                      Trigger distributions to pool members. Allocations stay encrypted on-chain.
                    </CardDescription>
                  </CardContent>
                </SpotlightCard>
              </FadeIn>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 border-t border-border">
          <FadeIn className="max-w-3xl mx-auto px-4 md:px-6 text-center">
            <h2 className="text-2xl font-semibold mb-4">Ready to contribute privately?</h2>
            <p className="text-text-secondary mb-8">
              Join the pool and experience true financial privacy on Aleo.
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
