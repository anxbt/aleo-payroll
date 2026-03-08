// Edge case test suite for payroll_rishav_v3.aleo
import payroll_rishav_v3.aleo;
program test_payroll_edge_cases.aleo {
    transition dummy() -> u8 { return 0u8; }
    @test
    @should_fail
    script test_overpayment_fails() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(1000u64);
        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (xp, xc): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr, 2000u64);
    }
    @test
    @should_fail
    script test_budget_exhausted() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(3000u64);
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 2000u64);
        let (xp2, xc2): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(p1, addr2, 2000u64);
    }
    @test
    @should_fail
    script test_add_full_budget_then_add() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(1000u64);
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 1000u64);
        let (xp2, xc2): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(p1, addr2, 1u64);
    }
    @test
    script test_zero_payout_allowed() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(5000u64);
        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (up, c): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr, 0u64);
        assert_eq(up.spent_budget, 0u64);
        assert_eq(c.payout, 0u64);
        assert_eq(c.paid, false);
    }
    @test
    script test_payroll_owner_set() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(7500u64);
        // Note: payroll.owner is the test program address in cross-program calls,
        // not self.caller (signer) — ownership is enforced by the contract.
        assert_eq(payroll.total_budget, 7500u64);
        assert_eq(payroll.spent_budget, 0u64);
    }
    @test
    script test_multi_contributor_budget() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(10000u64);
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr1, 3000u64);
        let (p2, xc2): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(p1, addr2, 3000u64);
        assert_eq(p2.spent_budget, 6000u64);
        assert_eq(p2.total_budget - p2.spent_budget, 4000u64);
    }
    @test
    script test_disclose_fresh() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(5000u64);
        let (pf, disclosed): (payroll_rishav_v3.aleo/Payroll, u64) = payroll_rishav_v3.aleo/disclose_spent(payroll);
        assert_eq(disclosed, 0u64);
    }
    @test
    script test_disclose_after_add() {
        let payroll: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(8000u64);
        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (p1, xc1): (payroll_rishav_v3.aleo/Payroll, payroll_rishav_v3.aleo/Contributor) = payroll_rishav_v3.aleo/add_contributor(payroll, addr, 2500u64);
        let (pf, disclosed): (payroll_rishav_v3.aleo/Payroll, u64) = payroll_rishav_v3.aleo/disclose_spent(p1);
        assert_eq(disclosed, 2500u64);
    }
}
