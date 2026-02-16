import credits.aleo;

program payroll_rishav_v2.aleo {

    // =========================
    // Constructor (required for deployment)
    // =========================

    @custom
    async constructor() {
        assert_eq(true, true);
    }

    // =========================
    // Records
    // =========================

    record Payroll {
        owner: address,
        total_budget: u64,
        spent_budget: u64,
    }

    record Contributor {
        owner: address,
        payroll_owner: address,
        contributor: address,
        payout: u64,
        paid: bool,
    }

    record PaymentReceipt {
        owner: address,
        contributor: address,
        amount: u64,
    }

    // =========================
    // Initialize Payroll
    // =========================
    // Verifies deposit matches declared budget.
    // Does NOT store credit record.
    // Budget tracking is internal accounting.
    // Real credit movement happens at payout time.

    transition init_payroll(
        deposit: credits.aleo/credits,
        budget: u64
    ) -> Payroll {

        // Ensure caller owns deposit
        assert(deposit.owner == self.caller);

        // Ensure declared budget matches deposit
        assert(deposit.microcredits == budget);

        // Initialize payroll
        let payroll: Payroll = Payroll {
            owner: self.caller,
            total_budget: budget,
            spent_budget: 0u64,
        };

        return payroll;
    }

    // =========================
    // Add Contributor
    // =========================

    transition add_contributor(
        payroll: Payroll,
        contributor_address: address,
        payout_amount: u64
    ) -> (Payroll, Contributor) {

        // Ensure caller is payroll owner
        assert(self.caller == payroll.owner);

        // Ensure enough remaining budget
        let remaining: u64 = payroll.total_budget - payroll.spent_budget;
        assert(payout_amount <= remaining);

        // Payroll unchanged at this stage
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget,
        };

        // Create contributor record
        let contributor: Contributor = Contributor {
            owner: payroll.owner,
            payroll_owner: payroll.owner,
            contributor: contributor_address,
            payout: payout_amount,
            paid: false,
        };

        return (updated_payroll, contributor);
    }

    // =========================
    // Pay Contributor
    // =========================
    // Owner must supply exact funding credit.
    // Deterministic payout (derived from contributor record).
    // Uses transfer_private for real credit movement.

    transition pay_contributor(
        payroll: Payroll,
        contributor: Contributor,
        funding_credit: credits.aleo/credits
    ) -> (Payroll, Contributor, PaymentReceipt) {

        // Only payroll owner can execute
        assert(self.caller == payroll.owner);

        // Contributor must belong to payroll
        assert(contributor.payroll_owner == payroll.owner);

        // Prevent double payment
        assert(contributor.paid == false);

        // Funding credit must match payout exactly
        assert(funding_credit.microcredits == contributor.payout);

        // Ensure budget allows payout
        let remaining: u64 = payroll.total_budget - payroll.spent_budget;
        assert(contributor.payout <= remaining);

        // Perform private transfer
        credits.aleo/transfer_private(
            funding_credit,
            contributor.contributor,
            contributor.payout
        );

        // Update payroll accounting
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget + contributor.payout,
        };

        // Mark contributor as paid
        let updated_contributor: Contributor = Contributor {
            owner: contributor.owner,
            payroll_owner: contributor.payroll_owner,
            contributor: contributor.contributor,
            payout: contributor.payout,
            paid: true,
        };

        // Create receipt
        let receipt: PaymentReceipt = PaymentReceipt {
            owner: contributor.contributor,
            contributor: contributor.contributor,
            amount: contributor.payout,
        };

        return (updated_payroll, updated_contributor, receipt);
    }

    // =========================
    // Disclose Spent (Optional)
    // =========================

    transition disclose_spent(
        payroll: Payroll
    ) -> (Payroll, u64) {

        return (payroll, payroll.spent_budget);
    }
}