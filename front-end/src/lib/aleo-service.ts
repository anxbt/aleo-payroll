import { 
    Transaction, 
    WalletAdapterNetwork 
} from "@demox-labs/aleo-wallet-adapter-base";

// Contract Configuration
export const PROGRAM_ID = "payrollsystem.aleo";
export const NETWORK = WalletAdapterNetwork.Testnet;
export const DEFAULT_FEE = 1_000_000; // 1 credit = 1,000,000 microcredits

/**
 * Build transaction to initialize a new payroll
 * @param publicKey - The fee payer's address
 * @param totalBudget - Total budget in microcredits
 */
export function buildInitPayrollTransaction(
    publicKey: string, 
    totalBudget: number
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "init_payroll",
        [`${totalBudget}u64`],
        DEFAULT_FEE,
        false // public fee
    );
}

/**
 * Build transaction to add a contributor to a payroll
 * @param publicKey - The fee payer's address
 * @param payrollRecord - The encrypted payroll record ciphertext
 * @param contributor - The contributor's Aleo address
 * @param payout - The payout amount in microcredits
 */
export function buildAddContributorTransaction(
    publicKey: string,
    payrollRecord: string,
    contributor: string,
    payout: number
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "add_contributor",
        [payrollRecord, contributor, `${payout}u64`],
        DEFAULT_FEE,
        false
    );
}

/**
 * Build transaction to pay a contributor
 * @param publicKey - The fee payer's address
 * @param payrollRecord - The encrypted payroll record ciphertext
 * @param contributorRecord - The encrypted contributor record ciphertext
 */
export function buildPayContributorTransaction(
    publicKey: string,
    payrollRecord: string,
    contributorRecord: string
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "pay_contributor",
        [payrollRecord, contributorRecord],
        DEFAULT_FEE,
        false
    );
}

/**
 * Build transaction to disclose the spent budget
 * @param publicKey - The fee payer's address
 * @param payrollRecord - The encrypted payroll record ciphertext
 */
export function buildDiscloseSpentTransaction(
    publicKey: string,
    payrollRecord: string
): Transaction {
    return Transaction.createTransaction(
        publicKey,
        NETWORK,
        PROGRAM_ID,
        "disclose_spent",
        [payrollRecord],
        DEFAULT_FEE,
        false
    );
}

/**
 * Format microcredits to display credits
 */
export function formatCredits(microcredits: number): string {
    return (microcredits / 1_000_000).toFixed(6);
}

/**
 * Parse credits string to microcredits
 */
export function parseCredits(credits: string): number {
    return Math.floor(parseFloat(credits) * 1_000_000);
}

/**
 * Format an Aleo address for display
 */
export function formatAddress(address: string, chars: number = 6): string {
    if (!address) return "";
    return `${address.slice(0, chars)}...${address.slice(-4)}`;
}