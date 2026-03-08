// Record Types matching payroll_rishav_v3.aleo contract (Wave 3)
// ARCHITECTURE:
// 1. init_payroll creates budget-tracking record (no credits consumed)
// 2. add_contributor reserves budget immediately (spent_budget incremented)
// 3. pay_contributor / batch_pay accepts funding_credit >= payout (change returned)
// 4. Contract enforces deterministic payout and prevents double payment

// Credits record from credits.aleo
export interface CreditRecord {
    id: string;
    owner: string;
    microcredits: number;
    ciphertext: string;   // encrypted record (record1...)
    plaintext: string;    // plaintext record string for transaction inputs
}

// Payroll record - internal budget tracking
// spent_budget includes committed (added) + paid contributors
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
    budget: number;  // Budget in microcredits
}

export interface AddContributorInput {
    payrollRecordId: string;
    contributorAddress: string;
    payoutAmount: number;  // Committed in the Contributor record
}

export interface PayContributorInput {
    payrollRecordId: string;
    contributorRecordId: string;
    fundingCreditId: string;  // Must have microcredits >= contributor.payout
}

export interface BatchPayInput {
    payrollRecordId: string;
    payments: Array<{
        contributorRecordId: string;
        fundingCreditId: string;
    }>;
}

export interface DiscloseSpentInput {
    payrollRecordId: string;
}
