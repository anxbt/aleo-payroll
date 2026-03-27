import { TransactionOptions } from "@provablehq/aleo-types";
import { DEPLOYED_PROGRAM_ID } from "@/lib/deployment";

export const PROGRAM_ID = DEPLOYED_PROGRAM_ID;
export const DEFAULT_FEE = 1_000_000;

export function buildInitPayrollTransaction(
    payrollId: string,
    budgetUsdCents: number,
    microcreditsPerUsdCent: number,
    manager: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "init_payroll",
        inputs: [
            `${payrollId}field`,
            `${budgetUsdCents}u64`,
            `${microcreditsPerUsdCent}u64`,
            manager,
        ],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildAddContributorTransaction(
    payrollRecord: string,
    contributor: string,
    payoutUsdCents: number,
    recurring: boolean
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "add_contributor",
        inputs: [payrollRecord, contributor, `${payoutUsdCents}u64`, recurring ? "true" : "false"],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildRunPayrollTransaction(
    payrollRecord: string,
    contributorRecords: string[],
    fundingCredits: string[],
    finalizeCycle: boolean
): TransactionOptions {
    if (contributorRecords.length !== fundingCredits.length) {
        throw new Error("Run Payroll requires the same number of contributors and private balance records.");
    }

    if (contributorRecords.length < 1 || contributorRecords.length > 3) {
        throw new Error("Run Payroll could not prepare the next payout set.");
    }

    const functionName =
        contributorRecords.length === 1
            ? "execute_payroll_batch_1"
            : contributorRecords.length === 2
                ? "execute_payroll_batch_2"
                : "execute_payroll_batch_3";

    return {
        program: PROGRAM_ID,
        function: functionName,
        inputs: [...[payrollRecord, ...contributorRecords, ...fundingCredits], finalizeCycle ? "true" : "false"],
        fee: contributorRecords.length === 3 ? DEFAULT_FEE * 2 : contributorRecords.length === 2 ? DEFAULT_FEE * 1.5 : DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildCloseCycleTransaction(payrollRecord: string): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "close_cycle",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildOpenNextCycleTransaction(payrollRecord: string): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "open_next_cycle",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildDiscloseCycleSpentTransaction(payrollRecord: string): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "disclose_cycle_spent",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildHandoffPayrollToManagerTransaction(payrollRecord: string): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "handoff_payroll_to_manager",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildHandoffPayrollToOwnerTransaction(payrollRecord: string): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "handoff_payroll_to_owner",
        inputs: [payrollRecord],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function buildTransferContributorOperatorTransaction(
    contributorRecord: string,
    newOwner: string
): TransactionOptions {
    return {
        program: PROGRAM_ID,
        function: "transfer_contributor_operator",
        inputs: [contributorRecord, newOwner],
        fee: DEFAULT_FEE,
        privateFee: false,
    };
}

export function formatCredits(microcredits: number): string {
    return (microcredits / 1_000_000).toFixed(6);
}

export function parseCredits(credits: string): number {
    return Math.floor(parseFloat(credits) * 1_000_000);
}

export function formatUsd(cents: number): string {
    return (cents / 100).toFixed(2);
}

export function parseUsdToCents(value: string): number {
    return Math.round(parseFloat(value || "0") * 100);
}

export function formatRate(microcreditsPerUsdCent: number): string {
    const creditsPerUsd = (microcreditsPerUsdCent * 100) / 1_000_000;
    return creditsPerUsd.toFixed(6);
}

export function parseCreditsPerUsdToMicrocreditsPerCent(value: string): number {
    return Math.round((parseFloat(value || "0") * 1_000_000) / 100);
}

export function formatAddress(address: string, chars = 6): string {
    if (!address) return "";
    return `${address.slice(0, chars)}...${address.slice(-4)}`;
}

export function generatePayrollId(): string {
    const random = Math.floor(Math.random() * 10_000);
    return `${Date.now()}${String(random).padStart(4, "0")}`;
}
