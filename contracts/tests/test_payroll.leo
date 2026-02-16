// Test suite for payrollsystem.aleo (Wave 2)
// Tests credit verification, deterministic payouts, and payment tracking

import payrollsystem.aleo;
import credits.aleo;

program test_payroll.aleo {

    // Required dummy transition for test program
    transition dummy() -> u8 {
        return 0u8;
    }

    // Test: Initialize a new payroll with credit verification
    @test
    script test_init_payroll_with_credits() {
        // Create a credit record for exact budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 10000u64,
        };
        
        // Initialize payroll with credit verification
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 10000u64);
        
        // Verify payroll tracking
        assert_eq(payroll.remaining_budget, 10000u64);
        assert_eq(payroll.owner, self.caller);
    }

    // Test: Add a contributor with committed payout
    @test
    script test_add_contributor() {
        // Setup: Create payroll with 5000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        // Add contributor with committed payout of 1000
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (unchanged_payroll, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Verify contributor record
        assert_eq(contributor.payout, 1000u64);
        assert_eq(contributor.contributor, contributor_addr);
        assert_eq(contributor.payroll_owner, self.caller);
        assert_eq(contributor.paid, false);  // Not paid yet
        
        // Verify payroll unchanged
        assert_eq(unchanged_payroll.remaining_budget, 5000u64);
    }

    // Test: Pay contributor - deterministic payout with exact funding credit
    // Owner provides exact funding credit matching contributor.payout
    @test
    script test_pay_contributor() {
        // Setup payroll with 5000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        // Add contributor
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Create exact funding credit for payout (owner provides this)
        let funding_credit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        
        // Pay contributor (payout derived from contributor record, funding from owner)
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding_credit);
        
        // Verify payroll budget reduced
        assert_eq(updated_payroll.remaining_budget, 4000u64);
        
        // Verify contributor marked as paid
        assert_eq(updated_contributor.paid, true);
        
        // Verify receipt
        assert_eq(receipt.amount, 1000u64);
        assert_eq(receipt.contributor, contributor_addr);
    }

    // Test: Pay multiple contributors sequentially
    @test
    script test_pay_multiple_contributors() {
        // Setup payroll with 10000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 10000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 10000u64);
        
        // Add two contributors
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        let (payroll_after_add1, contributor1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, 2000u64);
        let (payroll_after_add2, contributor2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll_after_add1, addr2, 3000u64);
        
        // Funding credits (owner provides these at payment time)
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 2000u64,
        };
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 3000u64,
        };
        
        // Pay first contributor
        let (payroll_after_first, updated_c1, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add2, contributor1, funding1);
        
        assert_eq(payroll_after_first.remaining_budget, 8000u64);
        assert_eq(updated_c1.paid, true);
        
        // Pay second contributor
        let (payroll_after_second, updated_c2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_first, contributor2, funding2);
        
        assert_eq(payroll_after_second.remaining_budget, 5000u64);
        assert_eq(updated_c2.paid, true);
    }

    // Test: Disclose spent budget
    @test
    script test_disclose_spent() {
        // Setup payroll with 8000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 8000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 8000u64);
        
        // Add and pay contributor
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1500u64);
        
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1500u64,
        };
        
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
        
        // Disclose spent (original - remaining = 8000 - 6500 = 1500)
        let (final_payroll, disclosed): (payrollsystem.aleo/Payroll, u64) = 
            payrollsystem.aleo/disclose_spent(updated_payroll, 8000u64);
        
        assert_eq(disclosed, 1500u64);
        assert_eq(final_payroll.remaining_budget, 6500u64);
    }

    // Test: Should fail when contributor payout exceeds remaining budget
    @test
    @should_fail
    script test_pay_exceeds_budget() {
        // Setup payroll with only 1000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Add contributor with payout (2000) that exceeds total budget (1000)
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 2000u64);
        
        // This should fail: contributor.payout (2000) > payroll.remaining_budget (1000)
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 2000u64,
        };
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
    }

    // Test: Should fail when funding credit doesn't match payout
    @test
    @should_fail
    script test_funding_mismatch_fails() {
        // Setup payroll with 5000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Try to pay with wrong amount (1500 instead of 1000)
        let wrong_funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1500u64,
        };
        
        // This should fail: funding (1500) != contributor.payout (1000)
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, wrong_funding);
    }

    // Test: Double payment fails (contributor.paid == true)
    @test
    @should_fail
    script test_double_payment_fails() {
        // Setup payroll with 5000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Add contributor with 1000 payout
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // First payment
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let (payroll_after_first, updated_contributor, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding1);
        
        // Verify first payment marked contributor as paid
        assert_eq(updated_contributor.paid, true);
        
        // Second payment attempt with same contributor MUST fail
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let (payroll_after_second, updated_contributor2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_first, updated_contributor, funding2);
    }

    // Test: Payroll remains with zero budget after full depletion
    @test
    script test_payroll_survives_depletion() {
        // Setup payroll with exactly 1000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1000u64);
        
        // Add contributor for full amount
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Pay full amount
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        
        let (depleted_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
        
        // Payroll still exists but with zero budget
        assert_eq(depleted_payroll.remaining_budget, 0u64);
        assert_eq(depleted_payroll.owner, self.caller);
        assert_eq(updated_contributor.paid, true);
    }

    // Test: Credit conservation - total payout equals budget reduction
    @test
    script test_credit_conservation() {
        let initial_budget: u64 = 10000u64;
        
        // Setup
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: initial_budget,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, initial_budget);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        let payout1: u64 = 3000u64;
        let payout2: u64 = 4000u64;
        
        let (payroll_after_add1, contributor1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, payout1);
        let (payroll_after_add2, contributor2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll_after_add1, addr2, payout2);
        
        // Funding credits matching payouts
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: payout1,
        };
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: payout2,
        };
        
        // Pay both
        let (payroll_after_first, updated_c1, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add2, contributor1, funding1);
        
        let (final_payroll, updated_c2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_first, contributor2, funding2);
        
        // Verify budget conservation
        let remaining_budget: u64 = final_payroll.remaining_budget;
        let total_paid: u64 = payout1 + payout2;
        
        assert_eq(remaining_budget, initial_budget - total_paid);
        assert_eq(remaining_budget, 3000u64);
        assert_eq(receipt1.amount, payout1);
        assert_eq(receipt2.amount, payout2);
        assert_eq(updated_c1.paid, true);
        assert_eq(updated_c2.paid, true);
    }

}
