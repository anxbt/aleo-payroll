import { 
    TransactionOptions
} from "@provablehq/aleo-types";

// Contract Configuration
export const PROGRAM_ID = "payroll_rishav_v2.aleo";
export const DEFAULT_FEE = 1_000_000; // 1 credit = 1,000,000 microcredits

/**
 * Build transaction to initialize a new payroll
 * Note: The credit record amount must exactly match the budget
 * @param creditRecord - The credit record to verify (ciphertext) - must match budget exactly
 * @param budget - The budget amount in microcredits (must equal credit amount)
 */
export function buildInitPayrollTransaction(
    creditRecord: string,
    budget: number
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "init_payroll",
        inputs: [creditRecord, `${budget}u64`],
        fee: DEFAULT_FEE,
        privateFee: false,
        recordIndices: [0],  // input[0] is a credits.aleo/credits record
    };
}

/**
 * Build transaction to add a contributor to a payroll
 * @param payrollRecord - The encrypted payroll record ciphertext
 * @param contributor - The contributor's Aleo address
 * @param payout - The payout amount in microcredits (committed in Contributor record)
 */
export function buildAddContributorTransaction(
    payrollRecord: string,
    contributor: string,
    payout: number
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "add_contributor",
        inputs: [payrollRecord, contributor, `${payout}u64`],
        fee: DEFAULT_FEE,
        privateFee: false
    };
}

/**
 * Build transaction to pay a contributor
 * Uses deterministic payout from contributor record (contributor.payout)
 * Owner must provide exact funding credit matching the payout amount
 * 
 * @param payrollRecord - The encrypted payroll record ciphertext
 * @param contributorRecord - The encrypted contributor record ciphertext
 * @param fundingCredit - The credit record to fund the payout (amount must EXACTLY match contributor.payout)
 */
export function buildPayContributorTransaction(
    payrollRecord: string,
    contributorRecord: string,
    fundingCredit: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "pay_contributor",
        inputs: [payrollRecord, contributorRecord, fundingCredit],
        fee: DEFAULT_FEE,
        privateFee: false
    };
}

/**
 * Build transaction to disclose the spent budget
 * @param payrollRecord - The encrypted payroll record ciphertext
 */
export function buildDiscloseSpentTransaction(
    payrollRecord: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "disclose_spent",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false
    };
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
