import payroll_rishav_v5.aleo;

program test_payroll_edge_cases.aleo {

    transition dummy() -> u8 {
        return 0u8;
    }

    @test
    @should_fail
    script test_zero_budget_fails() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(200field, 0u64, 10000u64, self.caller);
    }

    @test
    @should_fail
    script test_zero_rate_fails() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(201field, 1000u64, 0u64, self.caller);
    }

    @test
    @should_fail
    script test_zero_payout_fails() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(202field, 5000u64, 10000u64, self.caller);

        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (updated_payroll, contributor): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, addr, 0u64, true);
    }

    @test
    @should_fail
    script test_open_next_requires_closed() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(203field, 5000u64, 10000u64, self.caller);

        let next_cycle: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/open_next_cycle(payroll);
    }

    @test
    @should_fail
    script test_budget_over_two_adds() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(204field, 2500u64, 10000u64, self.caller);

        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;

        let (payroll_1, contributor_1): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, addr1, 2000u64, true);
        let (payroll_2, contributor_2): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll_1, addr2, 1000u64, false);
    }

    @test
    script test_disclose_spent_fresh() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(205field, 10000u64, 10000u64, self.caller);

        let (same_payroll, spent, status): (payroll_rishav_v5.aleo/Payroll, u64, u8) =
            payroll_rishav_v5.aleo/disclose_cycle_spent(payroll);

        assert_eq(spent, 0u64);
        assert_eq(status, 0u8);
        assert_eq(same_payroll.cycle_index, 1u64);
    }

    @test
    script test_add_hits_budget_exactly() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(206field, 3000u64, 10000u64, self.caller);

        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;

        let (payroll_1, contributor_1): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, addr1, 1000u64, false);
        let (payroll_2, contributor_2): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll_1, addr2, 2000u64, true);

        assert_eq(payroll_2.cycle_due_usd, 3000u64);
        assert_eq(payroll_2.active_commitment_usd, 3000u64);
        assert_eq(contributor_1.recurring, false);
        assert_eq(contributor_2.recurring, true);
    }
}
