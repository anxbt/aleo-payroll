"use client";

import React, { FC, useMemo } from "react";
import { WalletProvider as AleoWalletProvider } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletModalProvider } from "@demox-labs/aleo-wallet-adapter-reactui";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import {
    DecryptPermission,
    WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";

// Default styles that can be overridden by your app
import "@demox-labs/aleo-wallet-adapter-reactui/styles.css";

interface WalletProviderProps {
    children: React.ReactNode;
}

export const WalletProvider: FC<WalletProviderProps> = ({ children }) => {
    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
        setMounted(true);
    }, []);

    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: "Aleo Private Pool",
            }),
        ],
        []
    );

    if (!mounted) {
        return <>{children}</>;
    }

    return (
        <AleoWalletProvider
            wallets={wallets}
            decryptPermission={DecryptPermission.UponRequest}
            network={WalletAdapterNetwork.Testnet}
            autoConnect
        >
            <WalletModalProvider>{children}</WalletModalProvider>
        </AleoWalletProvider>
    );
};
