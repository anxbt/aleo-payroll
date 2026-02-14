/**
 * Aleo Program Execution Script
 * 
 * This script executes functions on the deployed payrollsystem.aleo program.
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
const PROGRAM_ID = "payrollsystem.aleo";

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
 * Initialize a new payroll with a total budget
 */
async function initPayroll(totalBudget: number) {
    console.log("\n🚀 Executing init_payroll...");
    console.log(`   Total Budget: ${totalBudget} microcredits`);
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "init_payroll",
        [`${totalBudget}u64`],
        1.0, // Fee in credits
        false // Public fee
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Add a contributor to an existing payroll
 * Note: payrollRecord must be the encrypted record ciphertext from your wallet
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
 * Pay a contributor
 */
async function payContributor(payrollRecord: string, contributorRecord: string) {
    console.log("\n🚀 Executing pay_contributor...");
    
    const { programManager, networkClient } = await setupProgramManager();
    
    const txId = await programManager.execute(
        PROGRAM_ID,
        "pay_contributor",
        [payrollRecord, contributorRecord],
        1.0,
        false
    );
    
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    
    return txId;
}

/**
 * Disclose the total spent budget
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
            
        case "add-contributor":
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
            
        case "pay":
            // Example: npx tsx execute.ts pay <payroll_record> <contributor_record>
            const payroll = process.argv[3];
            const contributor = process.argv[4];
            
            if (!payroll || !contributor) {
                console.error("Usage: npx tsx execute.ts pay <payroll_record> <contributor_record>");
                process.exit(1);
            }
            await payContributor(payroll, contributor);
            break;
            
        case "disclose":
            // Example: npx tsx execute.ts disclose <payroll_record>
            const record = process.argv[3];
            
            if (!record) {
                console.error("Usage: npx tsx execute.ts disclose <payroll_record>");
                process.exit(1);
            }
            await discloseSpent(record);
            break;
            
        default:
            console.log(`
Usage:
  npx tsx execute.ts init <total_budget>
  npx tsx execute.ts add-contributor <payroll_record> <address> <payout>
  npx tsx execute.ts pay <payroll_record> <contributor_record>
  npx tsx execute.ts disclose <payroll_record>

Examples:
  npx tsx execute.ts init 1000000
  npx tsx execute.ts add-contributor "record1..." "aleo1..." 50000
            `);
    }
}

main().catch(console.error);
