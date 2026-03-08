import credits.aleo;

program payroll_rishav_v3.aleo {

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
    // Creates a payroll with a declared budget.
    // No credits are consumed — budget is internal accounting.
    // Real credit movement happens at payout time.

    transition init_payroll(
        budget: u64
    ) -> Payroll {

        // Budget must be positive
        assert(budget > 0u64);

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
    // Reserves payout from remaining budget immediately.
    // spent_budget is incremented at add-time to prevent overcommitment.

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

        // Reserve the committed payout in spent_budget
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget + payout_amount,
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
    // Owner supplies funding credit >= payout amount.
    // Deterministic payout (derived from contributor record).
    // Uses transfer_private for real credit movement.
    // Change from overfunded credit is returned to caller automatically.

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

        // Funding credit must be sufficient (change returned automatically)
        assert(funding_credit.microcredits >= contributor.payout);

        // Perform private transfer (change record returned to caller by credits.aleo)
        credits.aleo/transfer_private(
            funding_credit,
            contributor.contributor,
            contributor.payout
        );

        // Payroll accounting unchanged — budget was already reserved at add_contributor time
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget,
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
    // Batch Pay 2 Contributors
    // =========================
    // Pays exactly 2 contributors in a single transaction.
    // Each contributor needs its own funding credit (>= payout).
    // Inputs: 5 (1 payroll + 2 contributors + 2 funding credits)
    // Outputs: 5 explicit (1 payroll + 2 contributors + 2 receipts) + 2 change records from transfer_private = 7 total

    transition batch_pay_2(
        payroll: Payroll,
        c1: Contributor,
        c2: Contributor,
        f1: credits.aleo/credits,
        f2: credits.aleo/credits
    ) -> (Payroll, Contributor, Contributor, PaymentReceipt, PaymentReceipt) {

        // Only payroll owner can execute
        assert(self.caller == payroll.owner);

        // Contributors must belong to this payroll
        assert(c1.payroll_owner == payroll.owner);
        assert(c2.payroll_owner == payroll.owner);

        // Prevent double payment
        assert(c1.paid == false);
        assert(c2.paid == false);

        // Funding credits must be sufficient
        assert(f1.microcredits >= c1.payout);
        assert(f2.microcredits >= c2.payout);

        // Perform private transfers
        credits.aleo/transfer_private(f1, c1.contributor, c1.payout);
        credits.aleo/transfer_private(f2, c2.contributor, c2.payout);

        // Payroll accounting unchanged (budget reserved at add-time)
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget,
        };

        // Mark contributors as paid
        let paid_c1: Contributor = Contributor {
            owner: c1.owner,
            payroll_owner: c1.payroll_owner,
            contributor: c1.contributor,
            payout: c1.payout,
            paid: true,
        };

        let paid_c2: Contributor = Contributor {
            owner: c2.owner,
            payroll_owner: c2.payroll_owner,
            contributor: c2.contributor,
            payout: c2.payout,
            paid: true,
        };

        // Create receipts
        let r1: PaymentReceipt = PaymentReceipt {
            owner: c1.contributor,
            contributor: c1.contributor,
            amount: c1.payout,
        };

        let r2: PaymentReceipt = PaymentReceipt {
            owner: c2.contributor,
            contributor: c2.contributor,
            amount: c2.payout,
        };

        return (updated_payroll, paid_c1, paid_c2, r1, r2);
    }

    // =========================
    // Batch Pay 3 Contributors
    // =========================
    // Pays exactly 3 contributors in a single transaction.
    // Inputs: 7 (1 payroll + 3 contributors + 3 funding credits)
    // Outputs: 7 explicit (1 payroll + 3 contributors + 3 receipts) + 3 change records = 10 total

    transition batch_pay_3(
        payroll: Payroll,
        c1: Contributor,
        c2: Contributor,
        c3: Contributor,
        f1: credits.aleo/credits,
        f2: credits.aleo/credits,
        f3: credits.aleo/credits
    ) -> (Payroll, Contributor, Contributor, Contributor, PaymentReceipt, PaymentReceipt, PaymentReceipt) {

        // Only payroll owner can execute
        assert(self.caller == payroll.owner);

        // Contributors must belong to this payroll
        assert(c1.payroll_owner == payroll.owner);
        assert(c2.payroll_owner == payroll.owner);
        assert(c3.payroll_owner == payroll.owner);

        // Prevent double payment
        assert(c1.paid == false);
        assert(c2.paid == false);
        assert(c3.paid == false);

        // Funding credits must be sufficient
        assert(f1.microcredits >= c1.payout);
        assert(f2.microcredits >= c2.payout);
        assert(f3.microcredits >= c3.payout);

        // Perform private transfers
        credits.aleo/transfer_private(f1, c1.contributor, c1.payout);
        credits.aleo/transfer_private(f2, c2.contributor, c2.payout);
        credits.aleo/transfer_private(f3, c3.contributor, c3.payout);

        // Payroll accounting unchanged (budget reserved at add-time)
        let updated_payroll: Payroll = Payroll {
            owner: payroll.owner,
            total_budget: payroll.total_budget,
            spent_budget: payroll.spent_budget,
        };

        // Mark contributors as paid
        let paid_c1: Contributor = Contributor {
            owner: c1.owner,
            payroll_owner: c1.payroll_owner,
            contributor: c1.contributor,
            payout: c1.payout,
            paid: true,
        };

        let paid_c2: Contributor = Contributor {
            owner: c2.owner,
            payroll_owner: c2.payroll_owner,
            contributor: c2.contributor,
            payout: c2.payout,
            paid: true,
        };

        let paid_c3: Contributor = Contributor {
            owner: c3.owner,
            payroll_owner: c3.payroll_owner,
            contributor: c3.contributor,
            payout: c3.payout,
            paid: true,
        };

        // Create receipts
        let r1: PaymentReceipt = PaymentReceipt {
            owner: c1.contributor,
            contributor: c1.contributor,
            amount: c1.payout,
        };

        let r2: PaymentReceipt = PaymentReceipt {
            owner: c2.contributor,
            contributor: c2.contributor,
            amount: c2.payout,
        };

        let r3: PaymentReceipt = PaymentReceipt {
            owner: c3.contributor,
            contributor: c3.contributor,
            amount: c3.payout,
        };

        return (updated_payroll, paid_c1, paid_c2, paid_c3, r1, r2, r3);
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