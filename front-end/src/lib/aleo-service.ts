import { 
    TransactionOptions
} from "@provablehq/aleo-types";

// Contract Configuration
export const PROGRAM_ID = "payroll_rishav_v3.aleo";
export const DEFAULT_FEE = 1_000_000; // 1 credit = 1,000,000 microcredits

/**
 * Build transaction to initialize a new payroll
 * No credits are consumed — this only creates a budget-tracking record.
 * @param budget - The budget amount in microcredits
 */
export function buildInitPayrollTransaction(
    budget: number
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "init_payroll",
        inputs: [`${budget}u64`],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

/**
 * Build transaction to add a contributor to a payroll
 * Budget is reserved immediately (spent_budget incremented).
 * @param payrollRecord - The payroll record plaintext/ciphertext
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
 * Build transaction to pay a single contributor
 * Funding credit must have microcredits >= contributor.payout.
 * Change is returned to caller automatically by credits.aleo.
 * 
 * @param payrollRecord - The payroll record plaintext/ciphertext
 * @param contributorRecord - The contributor record plaintext/ciphertext
 * @param fundingCredit - The credit record to fund the payout (amount >= contributor.payout)
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
 * Build transaction to batch-pay 2 contributors in a single transaction.
 * Each contributor needs its own funding credit (>= payout).
 */
export function buildBatchPay2Transaction(
    payrollRecord: string,
    c1Record: string,
    c2Record: string,
    f1Credit: string,
    f2Credit: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "batch_pay_2",
        inputs: [payrollRecord, c1Record, c2Record, f1Credit, f2Credit],
        fee: DEFAULT_FEE,
        privateFee: false
    };
}

/**
 * Build transaction to batch-pay 3 contributors in a single transaction.
 * Each contributor needs its own funding credit (>= payout).
 */
export function buildBatchPay3Transaction(
    payrollRecord: string,
    c1Record: string,
    c2Record: string,
    c3Record: string,
    f1Credit: string,
    f2Credit: string,
    f3Credit: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "batch_pay_3",
        inputs: [payrollRecord, c1Record, c2Record, c3Record, f1Credit, f2Credit, f3Credit],
        fee: DEFAULT_FEE,
        privateFee: false
    };
}

/**
 * Build transaction to disclose the spent budget
 * @param payrollRecord - The payroll record plaintext/ciphertext
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
