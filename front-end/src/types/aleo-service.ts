import { WalletAdapterNetwork, Transaction } from "@demox-labs/aleo-wallet-adapter-base";

// Re-export for convenience
export { WalletAdapterNetwork, Transaction };

// Service Configuration Types
export interface AleoServiceConfig {
    programId: string;
    network: WalletAdapterNetwork;
    defaultFee: number;
}

// Transaction Builder Function Types
export type TransactionBuilder = (
    publicKey: string,
    ...args: (string | number)[]
) => Transaction;

// Default Configuration
export const DEFAULT_CONFIG: AleoServiceConfig = {
    programId: "payrollsystem.aleo",
    network: WalletAdapterNetwork.Testnet,
    defaultFee: 1_000_000, // 1 credit
};