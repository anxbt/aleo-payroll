/**
 * Aleo Program Execution Script
 *
 * Helper CLI for the confidential payroll lifecycle:
 * init -> add contributors -> run payroll -> close -> open next cycle.
 */

import {
    Account,
    AleoKeyProvider,
    AleoNetworkClient,
    ProgramManager,
    initThreadPool,
} from "@provablehq/sdk";

const PRIVATE_KEY = "APrivateKey1zkp8X8TxoYtZFqyo34rxBubotDawenZkpPbfFDzkEHZWQRR";
const NETWORK_URL = "https://api.explorer.provable.com/v1";
const PROGRAM_ID = "payroll_rishav_v4.aleo";

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

    for (let i = 0; i < maxAttempts; i += 1) {
        try {
            const tx = await networkClient.getTransaction(txId);
            if (tx) {
                console.log("✅ Transaction confirmed!");
                return true;
            }
        } catch {
            process.stdout.write(".");
            await new Promise((resolve) => setTimeout(resolve, 5000));
        }
    }

    console.log("\n⚠️ Transaction not confirmed within timeout");
    return false;
}

async function executeAndWait(
    functionName: string,
    inputs: string[],
    fee = 1.0
): Promise<string> {
    const { programManager, networkClient } = await setupProgramManager();
    const txId = await programManager.execute(PROGRAM_ID, functionName, inputs, fee, false);
    console.log(`✅ Transaction submitted: ${txId}`);
    await waitForTransaction(networkClient, txId);
    return txId;
}

async function initPayroll(
    payrollId: string,
    budgetUsdCents: number,
    microcreditsPerUsdCent: number,
    manager: string
) {
    console.log("\n🚀 Creating payroll...");
    console.log(`   Payroll ID: ${payrollId}`);
    console.log(`   Budget: ${budgetUsdCents} usd-cents`);
    console.log(`   Rate: ${microcreditsPerUsdCent} microcredits / usd-cent`);
    console.log(`   Manager: ${manager}`);

    return executeAndWait(
        "init_payroll",
        [`${payrollId}field`, `${budgetUsdCents}u64`, `${microcreditsPerUsdCent}u64`, manager]
    );
}

async function addContributor(
    payrollRecord: string,
    contributorAddress: string,
    payoutUsdCents: number,
    recurring: boolean
) {
    console.log("\n🚀 Adding contributor...");
    console.log(`   Contributor: ${contributorAddress.slice(0, 20)}...`);
    console.log(`   Payout: ${payoutUsdCents} usd-cents`);
    console.log(`   Recurring: ${recurring}`);

    return executeAndWait(
        "add_contributor",
        [payrollRecord, contributorAddress, `${payoutUsdCents}u64`, recurring ? "true" : "false"]
    );
}

async function runPayrollSingle(
    payrollRecord: string,
    contributorRecord: string,
    fundingCredit: string,
    finalizeCycle: boolean
) {
    console.log("\n🚀 Running payroll...");
    return executeAndWait(
        "execute_payroll_batch_1",
        [payrollRecord, contributorRecord, fundingCredit, finalizeCycle ? "true" : "false"]
    );
}

async function runPayrollPair(
    payrollRecord: string,
    contributorRecord1: string,
    contributorRecord2: string,
    fundingCredit1: string,
    fundingCredit2: string,
    finalizeCycle: boolean
) {
    console.log("\n🚀 Running payroll...");
    return executeAndWait(
        "execute_payroll_batch_2",
        [
            payrollRecord,
            contributorRecord1,
            contributorRecord2,
            fundingCredit1,
            fundingCredit2,
            finalizeCycle ? "true" : "false",
        ],
        1.5
    );
}

async function runPayrollTrio(
    payrollRecord: string,
    contributorRecord1: string,
    contributorRecord2: string,
    contributorRecord3: string,
    fundingCredit1: string,
    fundingCredit2: string,
    fundingCredit3: string,
    finalizeCycle: boolean
) {
    console.log("\n🚀 Running payroll...");
    return executeAndWait(
        "execute_payroll_batch_3",
        [
            payrollRecord,
            contributorRecord1,
            contributorRecord2,
            contributorRecord3,
            fundingCredit1,
            fundingCredit2,
            fundingCredit3,
            finalizeCycle ? "true" : "false",
        ],
        2.0
    );
}

async function closeCycle(payrollRecord: string) {
    console.log("\n🚀 Closing cycle...");
    return executeAndWait("close_cycle", [payrollRecord]);
}

async function openNextCycle(payrollRecord: string) {
    console.log("\n🚀 Opening next cycle...");
    return executeAndWait("open_next_cycle", [payrollRecord]);
}

async function discloseSpent(payrollRecord: string) {
    console.log("\n🚀 Disclosing cycle status...");
    return executeAndWait("disclose_cycle_spent", [payrollRecord]);
}

async function handoffPayrollToManager(payrollRecord: string) {
    console.log("\n🚀 Delegating payroll to manager...");
    return executeAndWait("handoff_payroll_to_manager", [payrollRecord]);
}

async function handoffPayrollToOwner(payrollRecord: string) {
    console.log("\n🚀 Returning payroll to owner...");
    return executeAndWait("handoff_payroll_to_owner", [payrollRecord]);
}

async function transferContributorOperator(contributorRecord: string, newOwner: string) {
    console.log("\n🚀 Updating contributor operator...");
    return executeAndWait("transfer_contributor_operator", [contributorRecord, newOwner]);
}

async function main() {
    const command = process.argv[2];

    console.log("🔧 Confidential Payroll Execution Script");
    console.log("=".repeat(50));

    switch (command) {
        case "init": {
            const payrollId = process.argv[3];
            const budgetUsdCents = parseInt(process.argv[4] || "0", 10);
            const microcreditsPerUsdCent = parseInt(process.argv[5] || "0", 10);
            const manager = process.argv[6] || "aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc";
            if (!payrollId || !budgetUsdCents || !microcreditsPerUsdCent) {
                console.error("Usage: npx tsx execute.ts init <payroll_id> <budget_usd_cents> <microcredits_per_usd_cent> [manager]");
                process.exit(1);
            }
            await initPayroll(payrollId, budgetUsdCents, microcreditsPerUsdCent, manager);
            break;
        }
        case "add-contributor": {
            const payrollRecord = process.argv[3];
            const contributorAddress = process.argv[4];
            const payoutUsdCents = parseInt(process.argv[5] || "0", 10);
            const recurring = (process.argv[6] || "false").toLowerCase() === "true";
            if (!payrollRecord || !contributorAddress || !payoutUsdCents) {
                console.error("Usage: npx tsx execute.ts add-contributor <payroll_record> <address> <payout_usd_cents> [recurring]");
                process.exit(1);
            }
            await addContributor(payrollRecord, contributorAddress, payoutUsdCents, recurring);
            break;
        }
        case "run-payroll-1": {
            const [payrollRecord, contributorRecord, fundingCredit, finalizeCycle = "false"] = process.argv.slice(3);
            if (!payrollRecord || !contributorRecord || !fundingCredit) {
                console.error("Usage: npx tsx execute.ts run-payroll-1 <payroll> <contributor> <private_balance_record> [finalize]");
                process.exit(1);
            }
            await runPayrollSingle(payrollRecord, contributorRecord, fundingCredit, finalizeCycle === "true");
            break;
        }
        case "run-payroll-2": {
            const [payrollRecord, contributorRecord1, contributorRecord2, fundingCredit1, fundingCredit2, finalizeCycle = "false"] = process.argv.slice(3);
            if (!payrollRecord || !contributorRecord1 || !contributorRecord2 || !fundingCredit1 || !fundingCredit2) {
                console.error("Usage: npx tsx execute.ts run-payroll-2 <payroll> <c1> <c2> <private_balance_1> <private_balance_2> [finalize]");
                process.exit(1);
            }
            await runPayrollPair(payrollRecord, contributorRecord1, contributorRecord2, fundingCredit1, fundingCredit2, finalizeCycle === "true");
            break;
        }
        case "run-payroll-3": {
            const [payrollRecord, contributorRecord1, contributorRecord2, contributorRecord3, fundingCredit1, fundingCredit2, fundingCredit3, finalizeCycle = "false"] = process.argv.slice(3);
            if (!payrollRecord || !contributorRecord1 || !contributorRecord2 || !contributorRecord3 || !fundingCredit1 || !fundingCredit2 || !fundingCredit3) {
                console.error("Usage: npx tsx execute.ts run-payroll-3 <payroll> <c1> <c2> <c3> <private_balance_1> <private_balance_2> <private_balance_3> [finalize]");
                process.exit(1);
            }
            await runPayrollTrio(
                payrollRecord,
                contributorRecord1,
                contributorRecord2,
                contributorRecord3,
                fundingCredit1,
                fundingCredit2,
                fundingCredit3,
                finalizeCycle === "true"
            );
            break;
        }
        case "close": {
            const payrollRecord = process.argv[3];
            if (!payrollRecord) {
                console.error("Usage: npx tsx execute.ts close <payroll_record>");
                process.exit(1);
            }
            await closeCycle(payrollRecord);
            break;
        }
        case "open-next": {
            const payrollRecord = process.argv[3];
            if (!payrollRecord) {
                console.error("Usage: npx tsx execute.ts open-next <payroll_record>");
                process.exit(1);
            }
            await openNextCycle(payrollRecord);
            break;
        }
        case "disclose": {
            const payrollRecord = process.argv[3];
            if (!payrollRecord) {
                console.error("Usage: npx tsx execute.ts disclose <payroll_record>");
                process.exit(1);
            }
            await discloseSpent(payrollRecord);
            break;
        }
        case "handoff-manager": {
            const payrollRecord = process.argv[3];
            if (!payrollRecord) {
                console.error("Usage: npx tsx execute.ts handoff-manager <payroll_record>");
                process.exit(1);
            }
            await handoffPayrollToManager(payrollRecord);
            break;
        }
        case "handoff-owner": {
            const payrollRecord = process.argv[3];
            if (!payrollRecord) {
                console.error("Usage: npx tsx execute.ts handoff-owner <payroll_record>");
                process.exit(1);
            }
            await handoffPayrollToOwner(payrollRecord);
            break;
        }
        case "transfer-contributor": {
            const contributorRecord = process.argv[3];
            const newOwner = process.argv[4];
            if (!contributorRecord || !newOwner) {
                console.error("Usage: npx tsx execute.ts transfer-contributor <contributor_record> <new_owner>");
                process.exit(1);
            }
            await transferContributorOperator(contributorRecord, newOwner);
            break;
        }
        default:
            console.log(`
Usage:
  npx tsx execute.ts init <payroll_id> <budget_usd_cents> <microcredits_per_usd_cent> [manager]
  npx tsx execute.ts add-contributor <payroll_record> <address> <payout_usd_cents> [recurring]
  npx tsx execute.ts run-payroll-1 <payroll> <contributor> <private_balance_record> [finalize]
  npx tsx execute.ts run-payroll-2 <payroll> <c1> <c2> <private_balance_1> <private_balance_2> [finalize]
  npx tsx execute.ts run-payroll-3 <payroll> <c1> <c2> <c3> <private_balance_1> <private_balance_2> <private_balance_3> [finalize]
  npx tsx execute.ts close <payroll_record>
  npx tsx execute.ts open-next <payroll_record>
  npx tsx execute.ts disclose <payroll_record>
  npx tsx execute.ts handoff-manager <payroll_record>
  npx tsx execute.ts handoff-owner <payroll_record>
  npx tsx execute.ts transfer-contributor <contributor_record> <new_owner>
            `);
    }
}

main().catch(console.error);
