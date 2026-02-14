"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react"
import { useWalletModal } from "@demox-labs/aleo-wallet-adapter-reactui"
import { WalletAdapterNetwork, DecryptPermission } from "@demox-labs/aleo-wallet-adapter-base"

export function WalletConnect() {
    const { wallet, publicKey, disconnect, connected } = useWallet()
    const { setVisible } = useWalletModal()

    React.useEffect(() => {
        console.log("Wallet Connect State:", { connected, publicKey, wallet: wallet?.adapter.name });
    }, [connected, publicKey, wallet]);

    const formatAddress = (address: string) => {
        if (!address) return ""
        return `${address.slice(0, 6)}...${address.slice(-4)}`
    }

    if (connected && publicKey) {
        return (
            <Button variant="outline" onClick={() => disconnect()} className="font-mono text-xs">
                {formatAddress(publicKey)}
            </Button>
        )
    }

    return (
        <Button onClick={() => setVisible(true)}>
            Connect Wallet
        </Button>
    )
}
