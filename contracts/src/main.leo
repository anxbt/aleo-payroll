import credits.aleo;

program payroll_rishav_v5.aleo {

    @noupgrade
    async constructor() {}

    record Payroll {
        owner: address,
        treasury_owner: address,
        manager: address,
        payroll_id: field,
        budget_usd: u64,
        cycle_due_usd: u64,
        active_commitment_usd: u64,
        spent_usd: u64,
        microcredits_per_usd_cent: u64,
        cycle_index: u64,
        status: u8,
    }

    record Contributor {
        owner: address,
        payroll_id: field,
        contributor: address,
        payout_usd: u64,
        recurring: bool,
        active: bool,
        last_paid_cycle: u64,
    }

    record PaymentReceipt {
        owner: address,
        payroll_id: field,
        contributor: address,
        payout_usd: u64,
        amount_microcredits: u64,
        cycle_index: u64,
    }

    record CycleSummary {
        owner: address,
        payroll_id: field,
        cycle_index: u64,
        budget_usd: u64,
        spent_usd: u64,
        status: u8,
    }

    function active_after_payment(recurring: bool) -> bool {
        if recurring {
            return true;
        }

        return false;
    }

    function next_status(finalize_cycle: bool) -> u8 {
        if finalize_cycle {
            return 1u8;
        }

        return 0u8;
    }

    function next_commitment_after_pay(
        active_commitment_usd: u64,
        payout_usd: u64,
        recurring: bool
    ) -> u64 {
        if recurring {
            return active_commitment_usd;
        }

        return active_commitment_usd - payout_usd;
    }

    transition init_payroll(
        payroll_id: field,
        budget_usd: u64,
        microcredits_per_usd_cent: u64,
        manager: address
    ) -> Payroll {
        assert(budget_usd > 0u64);
        assert(microcredits_per_usd_cent > 0u64);

        let payroll: Payroll = Payroll {
            owner: self.caller,
            treasury_owner: self.caller,
            manager,
            payroll_id,
            budget_usd,
            cycle_due_usd: 0u64,
            active_commitment_usd: 0u64,
            spent_usd: 0u64,
            microcredits_per_usd_cent,
            cycle_index: 1u64,
            status: 0u8,
        };

        return payroll;
    }

    transition add_contributor(
        payroll: Payroll,
        contributor_address: address,
        payout_usd: u64,
        recurring: bool
    ) -> (Payroll, Contributor) {
        assert(self.caller == payroll.owner);
        assert(payroll.owner == payroll.treasury_owner);
        assert(payroll.status == 0u8);
        assert(payout_usd > 0u64);

        let next_active_commitment: u64 = payroll.active_commitment_usd + payout_usd;
        let next_cycle_due: u64 = payroll.cycle_due_usd + payout_usd;

        assert(next_active_commitment <= payroll.budget_usd);
        assert(next_cycle_due <= payroll.budget_usd);

        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: next_cycle_due,
            active_commitment_usd: next_active_commitment,
            spent_usd: payroll.spent_usd,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: payroll.status,
        };

        let contributor: Contributor = Contributor {
            owner: payroll.owner,
            payroll_id: payroll.payroll_id,
            contributor: contributor_address,
            payout_usd,
            recurring,
            active: true,
            last_paid_cycle: 0u64,
        };

        return (updated_payroll, contributor);
    }

    transition execute_payroll_batch_1(
        payroll: Payroll,
        c1: Contributor,
        f1: credits.aleo/credits,
        finalize_cycle: bool
    ) -> (Payroll, Contributor, PaymentReceipt) {
        assert(self.caller == payroll.owner);
        assert(payroll.status == 0u8);
        assert(c1.payroll_id == payroll.payroll_id);
        assert(c1.active == true);
        assert(c1.last_paid_cycle < payroll.cycle_index);

        let payout_1: u64 = c1.payout_usd * payroll.microcredits_per_usd_cent;
        assert(f1.microcredits >= payout_1);

        let next_spent: u64 = payroll.spent_usd + c1.payout_usd;
        assert(next_spent <= payroll.cycle_due_usd);

        if finalize_cycle {
            assert(next_spent == payroll.cycle_due_usd);
        } else {
            assert(next_spent < payroll.cycle_due_usd);
        }

        credits.aleo/transfer_private(f1, c1.contributor, payout_1);

        let next_active_commitment: u64 = next_commitment_after_pay(payroll.active_commitment_usd, c1.payout_usd, c1.recurring);

        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: next_active_commitment,
            spent_usd: next_spent,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: next_status(finalize_cycle),
        };

        let updated_c1: Contributor = Contributor {
            owner: c1.owner,
            payroll_id: c1.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            recurring: c1.recurring,
            active: active_after_payment(c1.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let receipt_1: PaymentReceipt = PaymentReceipt {
            owner: c1.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            amount_microcredits: payout_1,
            cycle_index: payroll.cycle_index,
        };

        return (updated_payroll, updated_c1, receipt_1);
    }

    transition execute_payroll_batch_2(
        payroll: Payroll,
        c1: Contributor,
        c2: Contributor,
        f1: credits.aleo/credits,
        f2: credits.aleo/credits,
        finalize_cycle: bool
    ) -> (Payroll, Contributor, Contributor, PaymentReceipt, PaymentReceipt) {
        assert(self.caller == payroll.owner);
        assert(payroll.status == 0u8);

        assert(c1.payroll_id == payroll.payroll_id);
        assert(c2.payroll_id == payroll.payroll_id);
        assert(c1.active == true);
        assert(c2.active == true);
        assert(c1.last_paid_cycle < payroll.cycle_index);
        assert(c2.last_paid_cycle < payroll.cycle_index);

        let payout_1: u64 = c1.payout_usd * payroll.microcredits_per_usd_cent;
        let payout_2: u64 = c2.payout_usd * payroll.microcredits_per_usd_cent;
        assert(f1.microcredits >= payout_1);
        assert(f2.microcredits >= payout_2);

        let next_spent: u64 = payroll.spent_usd + c1.payout_usd + c2.payout_usd;
        assert(next_spent <= payroll.cycle_due_usd);

        if finalize_cycle {
            assert(next_spent == payroll.cycle_due_usd);
        } else {
            assert(next_spent < payroll.cycle_due_usd);
        }

        credits.aleo/transfer_private(f1, c1.contributor, payout_1);
        credits.aleo/transfer_private(f2, c2.contributor, payout_2);

        let after_first_payment: u64 = next_commitment_after_pay(payroll.active_commitment_usd, c1.payout_usd, c1.recurring);
        let next_active_commitment: u64 = next_commitment_after_pay(after_first_payment, c2.payout_usd, c2.recurring);

        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: next_active_commitment,
            spent_usd: next_spent,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: next_status(finalize_cycle),
        };

        let updated_c1: Contributor = Contributor {
            owner: c1.owner,
            payroll_id: c1.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            recurring: c1.recurring,
            active: active_after_payment(c1.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let updated_c2: Contributor = Contributor {
            owner: c2.owner,
            payroll_id: c2.payroll_id,
            contributor: c2.contributor,
            payout_usd: c2.payout_usd,
            recurring: c2.recurring,
            active: active_after_payment(c2.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let receipt_1: PaymentReceipt = PaymentReceipt {
            owner: c1.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            amount_microcredits: payout_1,
            cycle_index: payroll.cycle_index,
        };

        let receipt_2: PaymentReceipt = PaymentReceipt {
            owner: c2.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c2.contributor,
            payout_usd: c2.payout_usd,
            amount_microcredits: payout_2,
            cycle_index: payroll.cycle_index,
        };

        return (updated_payroll, updated_c1, updated_c2, receipt_1, receipt_2);
    }

    transition execute_payroll_batch_3(
        payroll: Payroll,
        c1: Contributor,
        c2: Contributor,
        c3: Contributor,
        f1: credits.aleo/credits,
        f2: credits.aleo/credits,
        f3: credits.aleo/credits,
        finalize_cycle: bool
    ) -> (Payroll, Contributor, Contributor, Contributor, PaymentReceipt, PaymentReceipt, PaymentReceipt) {
        assert(self.caller == payroll.owner);
        assert(payroll.status == 0u8);

        assert(c1.payroll_id == payroll.payroll_id);
        assert(c2.payroll_id == payroll.payroll_id);
        assert(c3.payroll_id == payroll.payroll_id);
        assert(c1.active == true);
        assert(c2.active == true);
        assert(c3.active == true);
        assert(c1.last_paid_cycle < payroll.cycle_index);
        assert(c2.last_paid_cycle < payroll.cycle_index);
        assert(c3.last_paid_cycle < payroll.cycle_index);

        let payout_1: u64 = c1.payout_usd * payroll.microcredits_per_usd_cent;
        let payout_2: u64 = c2.payout_usd * payroll.microcredits_per_usd_cent;
        let payout_3: u64 = c3.payout_usd * payroll.microcredits_per_usd_cent;
        assert(f1.microcredits >= payout_1);
        assert(f2.microcredits >= payout_2);
        assert(f3.microcredits >= payout_3);

        let next_spent: u64 = payroll.spent_usd + c1.payout_usd + c2.payout_usd + c3.payout_usd;
        assert(next_spent <= payroll.cycle_due_usd);

        if finalize_cycle {
            assert(next_spent == payroll.cycle_due_usd);
        } else {
            assert(next_spent < payroll.cycle_due_usd);
        }

        credits.aleo/transfer_private(f1, c1.contributor, payout_1);
        credits.aleo/transfer_private(f2, c2.contributor, payout_2);
        credits.aleo/transfer_private(f3, c3.contributor, payout_3);

        let after_first_payment: u64 = next_commitment_after_pay(payroll.active_commitment_usd, c1.payout_usd, c1.recurring);
        let after_second_payment: u64 = next_commitment_after_pay(after_first_payment, c2.payout_usd, c2.recurring);
        let next_active_commitment: u64 = next_commitment_after_pay(after_second_payment, c3.payout_usd, c3.recurring);

        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: next_active_commitment,
            spent_usd: next_spent,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: next_status(finalize_cycle),
        };

        let updated_c1: Contributor = Contributor {
            owner: c1.owner,
            payroll_id: c1.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            recurring: c1.recurring,
            active: active_after_payment(c1.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let updated_c2: Contributor = Contributor {
            owner: c2.owner,
            payroll_id: c2.payroll_id,
            contributor: c2.contributor,
            payout_usd: c2.payout_usd,
            recurring: c2.recurring,
            active: active_after_payment(c2.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let updated_c3: Contributor = Contributor {
            owner: c3.owner,
            payroll_id: c3.payroll_id,
            contributor: c3.contributor,
            payout_usd: c3.payout_usd,
            recurring: c3.recurring,
            active: active_after_payment(c3.recurring),
            last_paid_cycle: payroll.cycle_index,
        };

        let receipt_1: PaymentReceipt = PaymentReceipt {
            owner: c1.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c1.contributor,
            payout_usd: c1.payout_usd,
            amount_microcredits: payout_1,
            cycle_index: payroll.cycle_index,
        };

        let receipt_2: PaymentReceipt = PaymentReceipt {
            owner: c2.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c2.contributor,
            payout_usd: c2.payout_usd,
            amount_microcredits: payout_2,
            cycle_index: payroll.cycle_index,
        };

        let receipt_3: PaymentReceipt = PaymentReceipt {
            owner: c3.contributor,
            payroll_id: payroll.payroll_id,
            contributor: c3.contributor,
            payout_usd: c3.payout_usd,
            amount_microcredits: payout_3,
            cycle_index: payroll.cycle_index,
        };

        return (updated_payroll, updated_c1, updated_c2, updated_c3, receipt_1, receipt_2, receipt_3);
    }

    transition close_cycle(
        payroll: Payroll
    ) -> (Payroll, CycleSummary) {
        assert(self.caller == payroll.owner);
        assert(payroll.status == 1u8);

        let closed_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: payroll.active_commitment_usd,
            spent_usd: payroll.spent_usd,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: 2u8,
        };

        let summary: CycleSummary = CycleSummary {
            owner: payroll.owner,
            payroll_id: payroll.payroll_id,
            cycle_index: payroll.cycle_index,
            budget_usd: payroll.budget_usd,
            spent_usd: payroll.spent_usd,
            status: 2u8,
        };

        return (closed_payroll, summary);
    }

    transition open_next_cycle(
        payroll: Payroll
    ) -> Payroll {
        assert(self.caller == payroll.owner);
        assert(payroll.status == 2u8);

        let next_payroll: Payroll = Payroll {
            owner: payroll.owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.active_commitment_usd,
            active_commitment_usd: payroll.active_commitment_usd,
            spent_usd: 0u64,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index + 1u64,
            status: 0u8,
        };

        return next_payroll;
    }

    transition disclose_cycle_spent(
        payroll: Payroll
    ) -> (Payroll, u64, u8) {
        return (payroll, payroll.spent_usd, payroll.status);
    }

    transition handoff_payroll_to_manager(
        payroll: Payroll
    ) -> Payroll {
        assert(self.caller == payroll.owner);
        assert(payroll.owner == payroll.treasury_owner);
        assert(payroll.manager != payroll.treasury_owner);

        let delegated_payroll: Payroll = Payroll {
            owner: payroll.manager,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: payroll.active_commitment_usd,
            spent_usd: payroll.spent_usd,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: payroll.status,
        };

        return delegated_payroll;
    }

    transition handoff_payroll_to_owner(
        payroll: Payroll
    ) -> Payroll {
        assert(self.caller == payroll.owner);
        assert(payroll.owner == payroll.manager);

        let returned_payroll: Payroll = Payroll {
            owner: payroll.treasury_owner,
            treasury_owner: payroll.treasury_owner,
            manager: payroll.manager,
            payroll_id: payroll.payroll_id,
            budget_usd: payroll.budget_usd,
            cycle_due_usd: payroll.cycle_due_usd,
            active_commitment_usd: payroll.active_commitment_usd,
            spent_usd: payroll.spent_usd,
            microcredits_per_usd_cent: payroll.microcredits_per_usd_cent,
            cycle_index: payroll.cycle_index,
            status: payroll.status,
        };

        return returned_payroll;
    }

    transition transfer_contributor_operator(
        contributor: Contributor,
        new_owner: address
    ) -> Contributor {
        assert(self.caller == contributor.owner);

        let updated_contributor: Contributor = Contributor {
            owner: new_owner,
            payroll_id: contributor.payroll_id,
            contributor: contributor.contributor,
            payout_usd: contributor.payout_usd,
            recurring: contributor.recurring,
            active: contributor.active,
            last_paid_cycle: contributor.last_paid_cycle,
        };

        return updated_contributor;
    }
}
