export interface CreditRecord {
    id: string;
    owner: string;
    microcredits: number;
    ciphertext: string;
    plaintext: string;
}

export type PayrollStatusCode = 0 | 1 | 2;

export interface PayrollRecord {
    id: string;
    owner: string;
    treasury_owner: string;
    manager: string;
    payroll_id: string;
    budget_usd_cents: number;
    cycle_due_usd_cents: number;
    active_commitment_usd_cents: number;
    spent_usd_cents: number;
    microcredits_per_usd_cent: number;
    cycle_index: number;
    status: PayrollStatusCode;
    remaining_cycle_usd_cents: number;
    ciphertext: string;
    plaintext: string;
}

export interface ContributorRecord {
    id: string;
    owner: string;
    payroll_id: string;
    contributor: string;
    payout_usd_cents: number;
    recurring: boolean;
    active: boolean;
    last_paid_cycle: number;
    ciphertext: string;
    plaintext: string;
}

export interface PaymentReceiptRecord {
    id: string;
    owner: string;
    payroll_id: string;
    contributor: string;
    payout_usd_cents: number;
    amount_microcredits: number;
    cycle_index: number;
    ciphertext: string;
    plaintext: string;
}

export interface CycleSummaryRecord {
    id: string;
    owner: string;
    payroll_id: string;
    cycle_index: number;
    budget_usd_cents: number;
    spent_usd_cents: number;
    status: PayrollStatusCode;
    ciphertext: string;
    plaintext: string;
}

export type TransactionStatus =
    | "Pending"
    | "Proving"
    | "Broadcasting"
    | "Finalized"
    | "Accepted"
    | "Failed"
    | "Rejected"
    | "Timeout";

export interface TransactionResult {
    transactionId: string;
    status: TransactionStatus;
    outputs?: string[];
    error?: string;
}

export interface PayrollState {
    payrolls: PayrollRecord[];
    contributors: ContributorRecord[];
    receipts: PaymentReceiptRecord[];
    summaries: CycleSummaryRecord[];
    credits: CreditRecord[];
    isLoading: boolean;
    error: string | null;
}

export interface InitPayrollInput {
    payrollId: string;
    budgetUsdCents: number;
    microcreditsPerUsdCent: number;
    manager: string;
}

export interface AddContributorInput {
    payrollRecordId: string;
    contributorAddress: string;
    payoutUsdCents: number;
    recurring: boolean;
}

export interface RunPayrollInput {
    payrollRecordId: string;
    contributorRecordIds: string[];
    fundingCreditIds: string[];
    finalizeCycle: boolean;
}
