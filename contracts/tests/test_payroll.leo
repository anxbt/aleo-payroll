import payroll_rishav_v5.aleo;

program test_payroll.aleo {

    transition dummy() -> u8 {
        return 0u8;
    }

    @test
    script test_init_payroll() {
        let payroll_id: field = 100field;
        let manager: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;

        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(payroll_id, 100000u64, 10000u64, manager);

        assert_eq(payroll.payroll_id, payroll_id);
        assert_eq(payroll.budget_usd, 100000u64);
        assert_eq(payroll.cycle_due_usd, 0u64);
        assert_eq(payroll.active_commitment_usd, 0u64);
        assert_eq(payroll.spent_usd, 0u64);
        assert_eq(payroll.microcredits_per_usd_cent, 10000u64);
        assert_eq(payroll.cycle_index, 1u64);
        assert_eq(payroll.status, 0u8);
        assert_eq(payroll.manager, manager);
    }

    @test
    script test_add_updates_commitment() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(101field, 5000u64, 10000u64, self.caller);

        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (updated_payroll, contributor): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, contributor_addr, 1250u64, false);

        assert_eq(updated_payroll.cycle_due_usd, 1250u64);
        assert_eq(updated_payroll.active_commitment_usd, 1250u64);
        assert_eq(updated_payroll.spent_usd, 0u64);
        assert_eq(contributor.payout_usd, 1250u64);
        assert_eq(contributor.recurring, false);
        assert_eq(contributor.active, true);
        assert_eq(contributor.last_paid_cycle, 0u64);
    }

    @test
    script test_multi_add_accumulates() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(102field, 10000u64, 10000u64, self.caller);

        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;

        let (payroll_1, contributor_1): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, addr1, 2000u64, true);

        let (payroll_2, contributor_2): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll_1, addr2, 3000u64, false);

        assert_eq(payroll_1.cycle_due_usd, 2000u64);
        assert_eq(payroll_2.cycle_due_usd, 5000u64);
        assert_eq(payroll_2.active_commitment_usd, 5000u64);
        assert_eq(contributor_1.recurring, true);
        assert_eq(contributor_2.recurring, false);
    }

    @test
    script test_disclose_spent_init() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(103field, 8000u64, 15000u64, self.caller);

        let (same_payroll, spent, status): (payroll_rishav_v5.aleo/Payroll, u64, u8) =
            payroll_rishav_v5.aleo/disclose_cycle_spent(payroll);

        assert_eq(spent, 0u64);
        assert_eq(status, 0u8);
        assert_eq(same_payroll.budget_usd, 8000u64);
    }

    @test
    script test_handoff_payroll_to_manager() {
        let manager: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(104field, 9000u64, 10000u64, manager);

        let delegated_payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/handoff_payroll_to_manager(payroll);

        assert_eq(delegated_payroll.manager, manager);
        assert(delegated_payroll.owner != delegated_payroll.treasury_owner);
    }

    @test
    @should_fail
    script test_add_exceeds_budget() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(105field, 1000u64, 10000u64, self.caller);

        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (updated_payroll, contributor): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(payroll, addr, 2000u64, false);
    }

    @test
    @should_fail
    script test_close_requires_exec() {
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(106field, 3000u64, 9000u64, self.caller);

        let (closed_payroll, summary): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/CycleSummary) =
            payroll_rishav_v5.aleo/close_cycle(payroll);
    }

    @test
    @should_fail
    script test_delegate_blocks_owner_ops() {
        let manager: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        let payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/init_payroll(107field, 7000u64, 10000u64, manager);

        let delegated_payroll: payroll_rishav_v5.aleo/Payroll =
            payroll_rishav_v5.aleo/handoff_payroll_to_manager(payroll);

        let addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (updated_payroll, contributor): (payroll_rishav_v5.aleo/Payroll, payroll_rishav_v5.aleo/Contributor) =
            payroll_rishav_v5.aleo/add_contributor(delegated_payroll, addr, 500u64, true);
    }
}
