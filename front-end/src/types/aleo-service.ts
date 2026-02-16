import { TransactionOptions } from "@provablehq/aleo-types";

// Re-export for convenience
export type { TransactionOptions };

// Service Configuration Types
export interface AleoServiceConfig {
    programId: string;
    defaultFee: number;
}

// Default Configuration
export const DEFAULT_CONFIG: AleoServiceConfig = {
    programId: "payroll_rishav_v2.aleo",
    defaultFee: 1_000_000, // 1 credit
};