// Record Types matching payrollsystem.aleo contract (Wave 2)
// ARCHITECTURE NOTE: True credit custody inside records is impossible in Leo
// because records cannot contain external records. This architecture uses:
// 1. Credit verification at init (consume credit, verify amount, track budget)
// 2. Owner-provided exact funding at payment time (funding_credit amount must match contributor.payout)
// 3. Contract enforces deterministic payout and prevents double payment

// Credits record from credits.aleo
export interface CreditRecord {
    id: string;
    owner: string;
    microcredits: number;
    ciphertext: string;   // encrypted record (record1...)
    plaintext: string;    // plaintext record string for transaction inputs
}

// Payroll record - internal budget tracking only
// The actual credits are not stored (Leo limitation)
export interface PayrollRecord {
    id: string;
    owner: string;
    total_budget: number;
    spent_budget: number;
    remaining_budget: number; // computed: total_budget - spent_budget
    ciphertext: string;
    plaintext: string;
}

// Contributor record with committed payout and payment status
export interface ContributorRecord {
    id: string;
    owner: string;
    payroll_owner: string;
    contributor: string;
    payout: number;  // Committed payout amount (deterministic)
    paid: boolean;   // Payment status to prevent double payment
    ciphertext: string;
    plaintext: string;
}

export interface PaymentReceiptRecord {
    id: string;
    owner: string;
    contributor: string;
    amount: number;
    ciphertext: string;
    plaintext: string;
}

// Transaction Types
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

// UI State Types
export interface PayrollState {
    payrolls: PayrollRecord[];
    contributors: ContributorRecord[];
    receipts: PaymentReceiptRecord[];
    credits: CreditRecord[];
    isLoading: boolean;
    error: string | null;
}

// Form Input Types
export interface InitPayrollInput {
    creditRecordId: string;  // Credit record to verify (amount must match budget)
    budget: number;          // Must exactly match credit amount
}

export interface AddContributorInput {
    payrollRecordId: string;
    contributorAddress: string;
    payoutAmount: number;  // Committed in the Contributor record
}

export interface PayContributorInput {
    payrollRecordId: string;
    contributorRecordId: string;
    fundingCreditId: string;  // Must EXACTLY match contributor.payout
}

export interface DiscloseSpentInput {
    payrollRecordId: string;
    originalBudget: number;  // Required to calculate spent amount
}
