/**
 * Aleo Program Execution Script
 * 
 * This script executes functions on the deployed payroll_rishav_v3.aleo program.
 * Use this to test your contract after deployment.
 */

import { 
    Account, 
    AleoNetworkClient, 
    ProgramManager, 
    AleoKeyProvider,
    initThreadPool
} from '@provablehq/sdk';

// ============================================
// Configuration
// ============================================

const PRIVATE_KEY = "APrivateKey1zkp8X8TxoYtZFqyo34rxBubotDawenZkpPbfFDzkEHZWQRR";
const NETWORK_URL = "https://api.explorer.provable.com/v1";
const PROGRAM_ID = "payroll_rishav_v3.aleo";

// ============================================
// Helper Functions
// ============================================

async function setupProgramManager(): Promise<{ 
    programManager: ProgramManager; 
    account: Account;
    networkClient: AleoNetworkClient;
}> {
    await initThreadPool();
    
    const account = new Account({ privateKey: PRIVATE_KEY });
    const networkClient = new AleoNetworkClient(NETWORK_URL);
    const keyProvider = new AleoKeyProvider();
    keyProvider.useCache(true);
    
    const programManager = new ProgramManager(NETWORK_URL, keyProvider);
    programManager.setAccount(account);
    
    return { programManager, account, networkClient };
}

async function waitForTransaction(
    networkClient: AleoNetworkClient, 
    txId: string, 
    maxAttempts = 60
): Promise<boolean> {
    console.log(`⏳ Waiting for transaction ${txId.slice(0, 20)}...`);
    
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const tx = await networkClient.getTransaction(txId);
            if (tx) {
                console.log("✅ Transaction confirmed!");
                return true;
            }
        } catch (e) {
            process.stdout.write('.');
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log("\n⚠️  Transaction not confirmed within timeout");
    return false;
}

// ============================================
// Contract Functions
// ============================================

/**
 * Initialize a new payroll with a declared budget.
 * No credits are consumed — budget is internal accounting only.
 */
async function initPayroll(totalBudget: number) {
    console.log("\n🚀 Executing init_payroll...");
    console.log(`   Total Budget: ${totalBudget} microcredits`);
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "init_payroll",
        [`${totalBudget}u64`],
        1.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Add a contributor to an existing payroll.
 * Budget is reserved immediately (spent_budget incremented at add-time).
 */
async function addContributor(
    payrollRecord: string, 
    contributorAddress: string, 
    payout: number
) {
    console.log("\n🚀 Executing add_contributor...");
    console.log(`   Contributor: ${contributorAddress.slice(0, 20)}...`);
    console.log(`   Payout: ${payout} microcredits`);
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "add_contributor",
        [payrollRecord, contributorAddress, `${payout}u64`],
        1.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Pay a single contributor.
 * Owner provides a funding credit >= payout. Change is returned automatically.
 */
async function payContributor(
    payrollRecord: string,
    contributorRecord: string,
    fundingCreditRecord: string
) {
    console.log("\n🚀 Executing pay_contributor...");
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "pay_contributor",
        [payrollRecord, contributorRecord, fundingCreditRecord],
        1.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Batch pay 2 contributors in a single transaction.
 */
async function batchPay2(
    payrollRecord: string,
    contributorRecord1: string,
    contributorRecord2: string,
    fundingCredit1: string,
    fundingCredit2: string
) {
    console.log("\n🚀 Executing batch_pay_2...");
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "batch_pay_2",
        [payrollRecord, contributorRecord1, contributorRecord2, fundingCredit1, fundingCredit2],
        1.5,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Batch pay 3 contributors in a single transaction.
 */
async function batchPay3(
    payrollRecord: string,
    contributorRecord1: string,
    contributorRecord2: string,
    contributorRecord3: string,
    fundingCredit1: string,
    fundingCredit2: string,
    fundingCredit3: string
) {
    console.log("\n🚀 Executing batch_pay_3...");
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "batch_pay_3",
        [
            payrollRecord,
            contributorRecord1, contributorRecord2, contributorRecord3,
            fundingCredit1, fundingCredit2, fundingCredit3
        ],
        2.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Disclose the total spent budget (voluntary transparency).
 */
async function discloseSpent(payrollRecord: string) {
    console.log("\n🚀 Executing disclose_spent...");
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "disclose_spent",
        [payrollRecord],
        1.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

// ============================================
// Main - Example Usage
// ============================================

async function main() {
    const command = process.argv[2];
    
    console.log("🔧 Aleo Program Execution Script");
    console.log("=".repeat(50));
    
    switch (command) {
        case "init":
            // Example: npx tsx execute.ts init 1000000
            const budget = parseInt(process.argv[3] || "1000000");
            await initPayroll(budget);
            break;
            
        case "add-contributor": {
            // Example: npx tsx execute.ts add-contributor <payroll_record> <address> <payout>
            const payrollRecord = process.argv[3];
            const address = process.argv[4];
            const payout = parseInt(process.argv[5] || "100000");
            
            if (!payrollRecord || !address) {
                console.error("Usage: npx tsx execute.ts add-contributor <payroll_record> <address> <payout>");
                process.exit(1);
            }
            await addContributor(payrollRecord, address, payout);
            break;
        }
            
        case "pay": {
            // Example: npx tsx execute.ts pay <payroll_record> <contributor_record> <funding_credit>
            const payroll = process.argv[3];
            const contributor = process.argv[4];
            const funding = process.argv[5];
            
            if (!payroll || !contributor || !funding) {
                console.error("Usage: npx tsx execute.ts pay <payroll_record> <contributor_record> <funding_credit>");
                process.exit(1);
            }
            await payContributor(payroll, contributor, funding);
            break;
        }

        case "batch-pay-2": {
            // Example: npx tsx execute.ts batch-pay-2 <payroll> <c1> <c2> <f1> <f2>
            const args = process.argv.slice(3);
            if (args.length < 5) {
                console.error("Usage: npx tsx execute.ts batch-pay-2 <payroll> <c1> <c2> <f1> <f2>");
                process.exit(1);
            }
            await batchPay2(args[0], args[1], args[2], args[3], args[4]);
            break;
        }

        case "batch-pay-3": {
            // Example: npx tsx execute.ts batch-pay-3 <payroll> <c1> <c2> <c3> <f1> <f2> <f3>
            const args = process.argv.slice(3);
            if (args.length < 7) {
                console.error("Usage: npx tsx execute.ts batch-pay-3 <payroll> <c1> <c2> <c3> <f1> <f2> <f3>");
                process.exit(1);
            }
            await batchPay3(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            break;
        }
            
        case "disclose": {
            // Example: npx tsx execute.ts disclose <payroll_record>
            const record = process.argv[3];
            
            if (!record) {
                console.error("Usage: npx tsx execute.ts disclose <payroll_record>");
                process.exit(1);
            }
            await discloseSpent(record);
            break;
        }
            
        default:
            console.log(`
Usage:
  npx tsx execute.ts init <total_budget>
  npx tsx execute.ts add-contributor <payroll_record> <address> <payout>
  npx tsx execute.ts pay <payroll_record> <contributor_record> <funding_credit>
  npx tsx execute.ts batch-pay-2 <payroll> <c1> <c2> <f1> <f2>
  npx tsx execute.ts batch-pay-3 <payroll> <c1> <c2> <c3> <f1> <f2> <f3>
  npx tsx execute.ts disclose <payroll_record>

Examples:
  npx tsx execute.ts init 1000000
  npx tsx execute.ts add-contributor "record1..." "aleo1..." 50000
  npx tsx execute.ts pay "payroll_rec..." "contributor_rec..." "credit_rec..."
            `);
    }
}

main().catch(console.error);
