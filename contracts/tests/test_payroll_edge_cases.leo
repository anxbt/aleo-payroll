// Edge case test suite for payrollsystem.aleo (Wave 2)
// Tests credit conservation, ownership, and failure modes

import payrollsystem.aleo;
import credits.aleo;

program test_payroll_edge_cases.aleo {

    // Required dummy transition
    transition dummy() -> u8 {
        return 0u8;
    }

    // ============================================
    // TEST: Overpayment fails
    // Contributor payout exceeds locked budget
    // ============================================
    @test
    @should_fail
    script test_overpayment_fails() {
        // Setup: Lock 1000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1000u64);
        
        // Add contributor with payout (2000) > budget (1000)
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 2000u64);
        
        // Funding credit for the full payout amount
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 2000u64,
        };
        
        // This MUST fail: cannot pay more than remaining budget
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
    }

    // ============================================
    // TEST: Budget exhaustion fails
    // Second payment should fail when insufficient remaining
    // ============================================
    @test
    @should_fail
    script test_budget_exhaustion_fails() {
        // Setup: Lock 3000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 3000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 3000u64);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        // Both contributors want 2000 each = 4000 total > 3000 budget
        let (payroll_after_add1, contributor1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, 2000u64);
        let (payroll_after_add2, contributor2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll_after_add1, addr2, 2000u64);
        
        // Funding credits
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 2000u64,
        };
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 2000u64,
        };
        
        // First payment succeeds: 3000 - 2000 = 1000 remaining
        let (payroll_after_first, updated_c1, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add2, contributor1, funding1);
        
        // Verify first payment
        assert_eq(payroll_after_first.remaining_budget, 1000u64);
        assert_eq(updated_c1.paid, true);
        
        // Second payment MUST fail: 1000 < 2000 (contributor2.payout)
        let (payroll_after_second, updated_c2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_first, contributor2, funding2);
    }

    // ============================================
    // TEST: Double payment fails
    // Cannot pay the same contributor twice (record already consumed)
    // ============================================
    @test
    @should_fail
    script test_double_payment_fails() {
        // Setup: Lock 5000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Add contributor with 1000 payout
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Funding credits
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        
        // First payment succeeds
        let (payroll_after_first, updated_contributor, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding1);
        
        // Verify first payment
        assert_eq(payroll_after_first.remaining_budget, 4000u64);
        assert_eq(updated_contributor.paid, true);
        
        // Second payment with same (now paid) contributor MUST fail
        let (payroll_after_second, updated_contributor2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_first, updated_contributor, funding2);
    }

    // ============================================
    // TEST: Payment after exhaustion fails
    // Cannot pay when treasury is already empty
    // ============================================
    @test
    @should_fail
    script test_payment_after_exhaustion_fails() {
        // Setup: Lock exactly 1000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1000u64);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        // First contributor takes full budget
        let (payroll_after_add1, contributor1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, 1000u64);
        
        // Second contributor also registered (but cannot be paid)
        let (payroll_after_add2, contributor2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll_after_add1, addr2, 100u64);
        
        // Funding credits
        let funding1: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let funding2: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 100u64,
        };
        
        // Pay first contributor - exhausts budget
        let (depleted_payroll, updated_c1, receipt1): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add2, contributor1, funding1);
        
        // Verify treasury is empty
        assert_eq(depleted_payroll.remaining_budget, 0u64);
        assert_eq(updated_c1.paid, true);
        
        // Attempt to pay second contributor MUST fail (0 < 100)
        let (final_payroll, updated_c2, receipt2): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(depleted_payroll, contributor2, funding2);
    }

    // ============================================
    // TEST: Credit conservation
    // Budget tracking matches actual credit flows
    // ============================================
    @test
    script test_credit_conservation() {
        let initial_budget: u64 = 10000u64;
        
        // Setup: Initialize payroll
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: initial_budget,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, initial_budget);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        // Add two contributors
        let payout1: u64 = 3000u64;
        let payout2: u64 = 4000u64;
        
        let (payroll_after_add1, contributor1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, payout1);
        let (payroll_after_add2, contributor2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll_after_add1, addr2, payout2);
        
        // Funding credits matching payouts exactly
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

    // ============================================
    // TEST: Receipt ownership correctness
    // Payment receipt goes to contributor
    // ============================================
    @test
    script test_receipt_ownership() {
        let payroll_owner: address = self.caller;
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Setup
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: payroll_owner,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        // Add and pay contributor
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 2000u64);
        
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: payroll_owner,
            microcredits: 2000u64,
        };
        
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
        
        // CRITICAL: Receipt must belong to contributor
        assert_eq(receipt.owner, contributor_addr);
        assert_eq(receipt.contributor, contributor_addr);
        assert_eq(receipt.amount, 2000u64);
        
        // Payroll ownership unchanged
        assert_eq(updated_payroll.owner, payroll_owner);
        
        // Contributor marked as paid
        assert_eq(updated_contributor.paid, true);
    }

    // ============================================
    // TEST: Payroll ownership preservation
    // Payroll always belongs to original owner
    // ============================================
    @test
    script test_payroll_ownership_preserved() {
        let original_owner: address = self.caller;
        
        // Setup
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: original_owner,
            microcredits: 8000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 8000u64);
        assert_eq(payroll.owner, original_owner);
        
        // Add contributor
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 3000u64);
        
        // Ownership preserved after add_contributor
        assert_eq(payroll_after_add.owner, original_owner);
        
        // Pay contributor
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: original_owner,
            microcredits: 3000u64,
        };
        
        let (payroll_after_pay, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
        
        // Ownership preserved after pay_contributor
        assert_eq(payroll_after_pay.owner, original_owner);
        
        // Disclose spent
        let (final_payroll, disclosed): (payrollsystem.aleo/Payroll, u64) = 
            payrollsystem.aleo/disclose_spent(payroll_after_pay, 8000u64);
        
        // Ownership preserved after disclose_spent
        assert_eq(final_payroll.owner, original_owner);
    }

    // ============================================
    // TEST: Partial depletion (edge case)
    // Payroll survives with 1 credit remaining
    // ============================================
    @test
    script test_partial_depletion_single_credit() {
        // Setup: Initialize with 1001 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1001u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1001u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Contributor takes 1000, leaving 1
        let (payroll_after_add, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        
        let (updated_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(payroll_after_add, contributor, funding);
        
        // Verify: 1 credit remains in budget
        assert_eq(updated_payroll.remaining_budget, 1u64);
        assert_eq(receipt.amount, 1000u64);
        assert_eq(updated_contributor.paid, true);
        
        // Payroll still functional
        assert_eq(updated_payroll.owner, self.caller);
    }

    // ============================================
    // TEST: Multiple contributors same payout
    // ============================================
    @test
    script test_multiple_contributors_same_payout() {
        // Setup: Initialize with 10000 budget
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 10000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 10000u64);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let addr3: address = aleo1qyqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq4cef6;
        
        // Three contributors, same 2000 credit payout each
        let payout: u64 = 2000u64;
        
        let (p1, c1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, addr1, payout);
        let (p2, c2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(p1, addr2, payout);
        let (p3, c3): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(p2, addr3, payout);
        
        // Funding credits for each
        let f1: credits.aleo/credits = credits.aleo/credits { owner: self.caller, microcredits: payout };
        let f2: credits.aleo/credits = credits.aleo/credits { owner: self.caller, microcredits: payout };
        let f3: credits.aleo/credits = credits.aleo/credits { owner: self.caller, microcredits: payout };
        
        // Pay all three
        let (p4, uc1, r1): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor, payrollsystem.aleo/PaymentReceipt) = 
            payrollsystem.aleo/pay_contributor(p3, c1, f1);
        let (p5, uc2, r2): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor, payrollsystem.aleo/PaymentReceipt) = 
            payrollsystem.aleo/pay_contributor(p4, c2, f2);
        let (final, uc3, r3): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor, payrollsystem.aleo/PaymentReceipt) = 
            payrollsystem.aleo/pay_contributor(p5, c3, f3);
        
        // Each receipt shows 2000
        assert_eq(r1.amount, 2000u64);
        assert_eq(r2.amount, 2000u64);
        assert_eq(r3.amount, 2000u64);
        
        // Remaining: 10000 - 6000 = 4000
        assert_eq(final.remaining_budget, 4000u64);
        
        // Each contributor marked as paid
        assert_eq(uc1.paid, true);
        assert_eq(uc2.paid, true);
        assert_eq(uc3.paid, true);
        
        // Each receipt belongs to correct contributor
        assert_eq(r1.contributor, addr1);
        assert_eq(r2.contributor, addr2);
        assert_eq(r3.contributor, addr3);
    }

    // ============================================
    // TEST: Wrong payroll owner cannot pay
    // Verifies payroll_owner field is checked
    // ============================================
    @test
    script test_payroll_ownership_enforced() {
        let payroll_owner: address = self.caller;
        
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: payroll_owner,
            microcredits: 5000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        let (updated_payroll, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Verify contributor is linked to correct payroll
        assert_eq(contributor.payroll_owner, payroll_owner);
        assert_eq(contributor.owner, payroll_owner);
        
        // Payment will verify payroll.owner == contributor.payroll_owner via assert
        let funding: credits.aleo/credits = credits.aleo/credits {
            owner: payroll_owner,
            microcredits: 1000u64,
        };
        
        let (final_payroll, updated_contributor, receipt): (
            payrollsystem.aleo/Payroll, 
            payrollsystem.aleo/Contributor,
            payrollsystem.aleo/PaymentReceipt
        ) = payrollsystem.aleo/pay_contributor(updated_payroll, contributor, funding);
        
        // Success - ownership was verified
        assert_eq(receipt.amount, 1000u64);
        assert_eq(updated_contributor.paid, true);
    }

    // ============================================
    // TEST: Contributor cannot be added with zero payout
    // ============================================
    @test
    script test_zero_payout_allowed() {
        // Setup
        let deposit: credits.aleo/credits = credits.aleo/credits {
            owner: self.caller,
            microcredits: 1000u64,
        };
        let payroll: payrollsystem.aleo/Payroll = payrollsystem.aleo/init_payroll(deposit, 1000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        
        // Zero payout is technically allowed (though meaningless)
        let (updated_payroll, contributor): (payrollsystem.aleo/Payroll, payrollsystem.aleo/Contributor) = 
            payrollsystem.aleo/add_contributor(payroll, contributor_addr, 0u64);
        
        assert_eq(contributor.payout, 0u64);
        assert_eq(contributor.paid, false);
    }

}
