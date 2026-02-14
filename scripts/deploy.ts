/**
 * Aleo Program Deployment Script
 * 
 * This script deploys the payrollsystem.aleo program to the Aleo Testnet
 * using the Provable SDK (similar to how Hardhat/Foundry works for EVM).
 * 
 * Key Concepts:
 * - Account: Uses your private key to sign transactions
 * - AleoKeyProvider: Caches proving/verifying keys (NOT your private key!)
 * - ProgramManager: Handles deployment and execution
 * - AleoNetworkClient: Communicates with Aleo nodes
 */

import { 
    Account, 
    AleoNetworkClient, 
    ProgramManager, 
    AleoKeyProvider,
    initThreadPool,
    ProgramManagerBase
} from '@provablehq/sdk';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// ES Module fix for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// Configuration
// ============================================

const PRIVATE_KEY = "APrivateKey1zkp8X8TxoYtZFqyo34rxBubotDawenZkpPbfFDzkEHZWQRR";
const NETWORK_URL = "https://api.explorer.provable.com/v1"; // Testnet endpoint
const PROGRAM_PATH = "../contracts/build/main.aleo";

// ============================================
// Main Deployment Function
// ============================================

async function deploy() {
    console.log("🚀 Aleo Program Deployment Script");
    console.log("=".repeat(50));

    try {
        // Step 1: Initialize WebAssembly thread pool
        console.log("\n📦 Initializing WebAssembly...");
        await initThreadPool();
        console.log("✅ WebAssembly initialized");

        // Step 2: Create Account from private key
        console.log("\n🔑 Setting up account...");
        const account = new Account({ privateKey: PRIVATE_KEY });
        console.log(`✅ Account address: ${account.address().to_string()}`);

        // Step 3: Initialize Network Client
        console.log("\n🌐 Connecting to Aleo Testnet...");
        const networkClient = new AleoNetworkClient(NETWORK_URL);
        console.log(`✅ Connected to: ${NETWORK_URL}`);

        // Step 4: Initialize Key Provider (for caching proving/verifying keys)
        // NOTE: This is different from your private key!
        // AleoKeyProvider caches cryptographic keys needed to build proofs
        console.log("\n🔐 Setting up key provider...");
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        console.log("✅ Key provider initialized with caching enabled");

        // Step 5: Load the compiled program
        console.log("\n📄 Loading program...");
        const programPath = path.resolve(__dirname, PROGRAM_PATH);
        const program = fs.readFileSync(programPath, 'utf8');
        
        // Extract program name
        const programNameMatch = program.match(/program\s+(\w+\.aleo)/);
        const programName = programNameMatch ? programNameMatch[1] : 'unknown';
        console.log(`✅ Loaded program: ${programName}`);
        console.log(`   Size: ${program.length} bytes`);

        // Step 6: Estimate deployment fee
        console.log("\n💰 Estimating deployment fee...");
        const imports = await networkClient.getProgramImports(program);
        const estimatedFee = ProgramManagerBase.estimateDeploymentFee(program, imports);
        console.log(`✅ Estimated fee: ${estimatedFee} microcredits (${Number(estimatedFee) / 1_000_000} credits)`);

        // Step 7: Check account balance
        console.log("\n💳 Checking account balance...");
        try {
            // Get public balance
            const balance = await networkClient.getAccount(account.address().to_string());
            console.log(`✅ Account balance: ${JSON.stringify(balance)}`);
        } catch (e) {
            console.log("⚠️  Could not fetch balance (account may not have public credits)");
        }

        // Step 8: Initialize Program Manager
        console.log("\n⚙️  Initializing Program Manager...");
        const programManager = new ProgramManager(NETWORK_URL, keyProvider);
        programManager.setAccount(account);
        console.log("✅ Program Manager ready");

        // Step 9: Deploy the program
        console.log("\n🚀 Deploying program to Aleo Testnet...");
        console.log("   This may take several minutes...");
        
        // Set fee (in credits, not microcredits)
        // Minimum fee is ~16.52 credits for this program
        const feeInCredits = 20.0; // 20 credits for deployment (with buffer)
        
        const txId = await programManager.deploy(
            program,
            feeInCredits,
            false // Use public fee (set to true for private fee with record)
        );
        
        console.log(`\n✅ Deployment transaction submitted!`);
        console.log(`   Transaction ID: ${txId}`);

        // Step 10: Wait for confirmation
        console.log("\n⏳ Waiting for confirmation...");
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 60; // 5 minutes max wait

        while (!confirmed && attempts < maxAttempts) {
            try {
                const tx = await networkClient.getTransaction(txId);
                if (tx) {
                    console.log(`\n✅ Transaction confirmed!`);
                    console.log(`   Status: ${tx.status || 'confirmed'}`);
                    confirmed = true;
                }
            } catch (e) {
                // Transaction not yet confirmed
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
                attempts++;
            }
        }

        if (!confirmed) {
            console.log("\n⚠️  Transaction not yet confirmed. Check explorer for status.");
        }

        // Step 11: Verify deployment
        console.log("\n🔍 Verifying deployment...");
        try {
            const deployedProgram = await networkClient.getProgram(programName);
            if (deployedProgram) {
                console.log(`✅ Program "${programName}" successfully deployed!`);
            }
        } catch (e) {
            console.log(`⚠️  Could not verify deployment yet. Check explorer.`);
        }

        console.log("\n" + "=".repeat(50));
        console.log("📋 Deployment Summary");
        console.log("=".repeat(50));
        console.log(`Program Name:    ${programName}`);
        console.log(`Transaction ID:  ${txId}`);
        console.log(`Explorer URL:    https://explorer.provable.com/transaction/${txId}`);
        console.log(`Program URL:     https://explorer.provable.com/program/${programName}`);
        console.log("=".repeat(50));

    } catch (error) {
        console.error("\n❌ Deployment failed!");
        console.error(error);
        process.exit(1);
    }
}

// Run deployment
deploy().then(() => {
    console.log("\n✨ Done!");
    process.exit(0);
}).catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});
