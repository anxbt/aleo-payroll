"use client"

import dynamic from "next/dynamic";
import Link from "next/link";
import { Shield } from "lucide-react";

const WalletConnect = dynamic(
    () => import("@/components/wallet-connect").then(mod => ({ default: mod.WalletConnect })),
    { ssr: false }
);

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex min-h-screen flex-col bg-background">
            <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/80 backdrop-blur-sm">
                <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4 md:px-6">
                    <Link href="/" className="flex items-center gap-2">
                        <Shield className="h-5 w-5 text-accent" />
                        <span className="font-semibold">AleoPool</span>
                    </Link>
                    <WalletConnect />
                </div>
            </header>
            <main className="flex-1 max-w-5xl mx-auto w-full py-8 px-4 md:px-6">
                {children}
            </main>
        </div>
    );
}
