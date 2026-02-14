// Record Types matching hello.aleo contract
export interface PayrollRecord {
    id: string;
    owner: string;
    total_budget: number;
    spent_budget: number;
    ciphertext: string;  // Raw encrypted record for transaction inputs
}

export interface ContributorRecord {
    id: string;
    owner: string;
    payroll_owner: string;
    contributor: string;
    payout: number;
    ciphertext: string;
}

export interface PaymentReceiptRecord {
    id: string;
    owner: string;
    contributor: string;
    amount: number;
    ciphertext: string;
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
    isLoading: boolean;
    error: string | null;
}

// Form Input Types
export interface InitPayrollInput {
    totalBudget: number;
}

export interface AddContributorInput {
    payrollRecordId: string;
    contributorAddress: string;
    payoutAmount: number;
}

export interface PayContributorInput {
    payrollRecordId: string;
    contributorRecordId: string;
}