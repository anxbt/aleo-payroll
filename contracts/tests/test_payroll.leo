// Test suite for payroll_rishav_v3.aleo (Wave 3)
// Covers budget accounting, contributor registration, and failure modes.
// Note: pay_contributor / batch_pay_* tests require real credits.aleo records
// and are covered by integration tests (leo run / devnet).

import payroll_rishav_v3.aleo;

program test_payroll.aleo {

    // Required dummy transition for test program
    transition dummy() -> u8 {
        return 0u8;
    }

    // Test: Initialize a new payroll (no credit consumed)
    @test
    script test_init_payroll() {
        // Initialize payroll — just declares budget, no credit consumed
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(10000u64);
        
        // Verify payroll tracking
        assert_eq(payroll.total_budget, 10000u64);
        assert_eq(payroll.spent_budget, 0u64);
        // Note: payroll.owner is the test program address (cross-program caller),
        // not self.caller (signer) — ownership is enforced by the contract itself.
    }

    // Test: Add contributor — budget reserved at add-time
    @test
    script test_add_contributor() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (updated_payroll, contributor): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = 
            payroll_rishav_v3.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Verify contributor record
        assert_eq(contributor.payout, 1000u64);
        assert_eq(contributor.contributor, contributor_addr);
        assert_eq(contributor.paid, false);
        
        // Verify payroll — spent_budget incremented at add-time
        assert_eq(updated_payroll.spent_budget, 1000u64);
        assert_eq(updated_payroll.total_budget, 5000u64);
    }

    // Test: Multiple adds accumulate spent_budget correctly
    @test
    script test_multi_add_budget() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(10000u64);

        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;

        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 2000u64);
        assert_eq(p1.spent_budget, 2000u64);

        let (p2, xc2): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(p1, addr2, 3000u64);
        assert_eq(p2.spent_budget, 5000u64);

        // Remaining = total - spent
        assert_eq(p2.total_budget - p2.spent_budget, 5000u64);
    }

    // Test: disclose_spent returns current spent_budget
    @test
    script test_disclose_spent_initial() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(8000u64);

        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 1500u64);

        // Disclose — should return committed spent_budget (1500)
        let (pf, disclosed): (payroll_rishav_v3.aleo/Payroll, u64) =
            payroll_rishav_v3.aleo/disclose_spent(p1);

        assert_eq(disclosed, 1500u64);
    }

    // (pay_contributor / batch_pay tests require real credits.aleo/credits records
    //  which cannot be constructed inline — see integration test notes above)

    // Test: Should fail when payout > remaining budget (caught at add-time)
    @test
    @should_fail
    script test_add_exceeds_budget() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(1000u64);
        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        // Payout 2000 > total_budget 1000 — must fail
        let (xp, xc): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(payroll, addr, 2000u64);
    }

    // Test: Second add exhausts budget correctly
    @test
    @should_fail
    script test_second_add_exhausts() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(3000u64);
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        // First add 2000 — OK
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 2000u64);
        // Second add 2000 > remaining (1000) — must fail
        let (xp2, xc2): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) =
            payroll_rishav_v3.aleo/add_contributor(p1, addr2, 2000u64);
    }

}
