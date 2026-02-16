"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@provablehq/aleo-wallet-adaptor-react"
import { WalletMultiButton } from "@provablehq/aleo-wallet-adaptor-react-ui"

export function WalletConnect() {
    const { wallet, address, disconnect, connected } = useWallet()

    const formatAddress = (addr: string) => {
        if (!addr) return ""
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`
    }

    if (connected && address) {
        return (
            <Button variant="outline" onClick={() => disconnect()} className="font-mono text-xs">
                {formatAddress(address)}
            </Button>
        )
    }

    return (
        <WalletMultiButton />
    )
}
