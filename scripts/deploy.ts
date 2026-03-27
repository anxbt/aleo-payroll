/**
 * Aleo Program Deployment Script
 *
 * Deploys the compiled Aleo program to the Aleo Testnet using the Provable SDK.
 *
 * SDK 0.9.18 API notes:
 *   - deploy(program, priorityFee, privateFee) — priorityFee is a TIP, not the base fee
 *   - buildDeploymentTransaction() + submitTransaction() is more reliable
 *   - The SDK calculates the base deployment fee automatically
 */

import {
    Account,
    AleoNetworkClient,
    ProgramManager,
    AleoKeyProvider,
    initThreadPool,
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

const PRIVATE_KEY = process.env.ALEO_PRIVATE_KEY || "";
const NETWORK_URL = process.env.ALEO_NETWORK_URL || "https://api.explorer.provable.com/v1";
const PROGRAM_PATH = "../contracts/build/main.aleo";
const DEPLOYMENT_RECORD_PATH = "../front-end/src/lib/deployment.ts";

// ============================================
// Main Deployment Function
// ============================================

async function deploy() {
    console.log("🚀 Aleo Program Deployment Script");
    console.log("=".repeat(50));

    try {
        if (!PRIVATE_KEY) {
            throw new Error("Missing ALEO_PRIVATE_KEY environment variable");
        }

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

        // Step 4: Initialize Key Provider
        console.log("\n🔐 Setting up key provider...");
        const keyProvider = new AleoKeyProvider();
        keyProvider.useCache(true);
        console.log("✅ Key provider initialized with caching enabled");

        // Step 5: Load the compiled program
        console.log("\n📄 Loading program...");
        const programPath = path.resolve(__dirname, PROGRAM_PATH);
        const program = fs.readFileSync(programPath, 'utf8');
        const programNameMatch = program.match(/program\s+(\w+\.aleo)/);
        const programName = programNameMatch ? programNameMatch[1] : 'unknown';
        console.log(`✅ Loaded program: ${programName}`);
        console.log(`   Size: ${program.length} bytes`);

        // Step 6: Check account balance
        console.log("\n💳 Checking account balance...");
        try {
            const balance = await networkClient.getAccount(account.address().to_string());
            console.log(`✅ Account balance: ${JSON.stringify(balance)}`);
        } catch (e) {
            console.log("⚠️  Could not fetch balance (account may not have public credits)");
        }

        // Step 7: Initialize Program Manager
        console.log("\n⚙️  Initializing Program Manager...");
        const programManager = new ProgramManager(NETWORK_URL, keyProvider);
        programManager.setAccount(account);
        console.log("✅ Program Manager ready");

        // Step 8: Build deployment transaction
        // NOTE: In SDK 0.9.18, the second parameter is "priorityFee" (a tip), NOT the base fee.
        // The SDK calculates the actual deployment cost automatically.
        const priorityFee = 0.0; // No additional tip needed
        console.log("\n🚀 Building deployment transaction...");
        console.log("   This may take several minutes (generating proofs for each function)...");
        console.log(`   Priority fee: ${priorityFee} credits`);

        const tx = await programManager.buildDeploymentTransaction(
            program,
            priorityFee,
            false // Use public fee
        );
        console.log("✅ Deployment transaction built!");

        // Step 9: Submit the transaction
        console.log("\n📡 Submitting transaction to the network...");
        const txId = await programManager.networkClient.submitTransaction(tx);
        console.log(`✅ Transaction submitted!`);
        console.log(`   Transaction ID: ${txId}`);

        // Step 10: Wait for confirmation
        console.log("\n⏳ Waiting for confirmation...");
        let confirmed = false;
        let attempts = 0;
        const maxAttempts = 60;

        while (!confirmed && attempts < maxAttempts) {
            try {
                const txResult = await networkClient.getTransaction(txId);
                if (txResult) {
                    console.log(`\n✅ Transaction confirmed!`);
                    console.log(`   Status: ${txResult.status || 'confirmed'}`);
                    confirmed = true;
                }
            } catch (e) {
                process.stdout.write('.');
                await new Promise(resolve => setTimeout(resolve, 5000));
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

        // Write deployment record for front-end
        const deploymentRecordPath = path.resolve(__dirname, DEPLOYMENT_RECORD_PATH);
        const deploymentRecord = `export const DEPLOYED_PROGRAM_ID = "${programName}";\nexport const DEPLOYMENT_TRANSACTION_ID = "${txId}";\nexport const DEPLOYMENT_NETWORK_URL = "${NETWORK_URL}";\nexport const DEPLOYMENT_EXPLORER_URL = "https://explorer.provable.com/transaction/${txId}";\n`;
        fs.writeFileSync(deploymentRecordPath, deploymentRecord, "utf8");
        console.log(`✅ Wrote deployment record to ${deploymentRecordPath}`);

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
