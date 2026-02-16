"use client";

import React, { FC, useMemo } from "react";
import { AleoWalletProvider } from "@provablehq/aleo-wallet-adaptor-react";
import { WalletModalProvider } from "@provablehq/aleo-wallet-adaptor-react-ui";
import { LeoWalletAdapter } from "@provablehq/aleo-wallet-adaptor-leo";
import { ShieldWalletAdapter } from "@provablehq/aleo-wallet-adaptor-shield";
import {
    DecryptPermission,
} from "@provablehq/aleo-wallet-adaptor-core";
import { Network } from "@provablehq/aleo-types";

// Default styles that can be overridden by your app
import "@provablehq/aleo-wallet-adaptor-react-ui/dist/styles.css";

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
            new LeoWalletAdapter(),
            new ShieldWalletAdapter(),
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
            network={Network.TESTNET}
            autoConnect
        >
            <WalletModalProvider>{children}</WalletModalProvider>
        </AleoWalletProvider>
    );
};
