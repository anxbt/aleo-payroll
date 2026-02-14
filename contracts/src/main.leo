
program payrollsystem.aleo {

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
}

record PaymentReceipt {
    owner: address,
    contributor: address,
    amount: u64,
}

// Caller becomes owner, sets spent_budget=0
transition init_payroll(total_budget: u64) -> Payroll {
    return Payroll {
        owner: self.caller,
        total_budget: total_budget,
        spent_budget: 0u64,
    };
}

// Can be called by payroll owner
transition add_contributor(
    payroll: Payroll,
    contributor: address,
    payout: u64
) -> (Payroll, Contributor) {
    // Return the payroll back to owner and create a contributor record
    let new_payroll: Payroll = Payroll {
        owner: payroll.owner,
        total_budget: payroll.total_budget,
        spent_budget: payroll.spent_budget,
    };
    
    let new_contributor: Contributor = Contributor {
        owner: payroll.owner,
        payroll_owner: payroll.owner,
        contributor: contributor,
        payout: payout,
    };
    
    return (new_payroll, new_contributor);
}

// Pay a contributor and update the spent budget
transition pay_contributor(
    payroll: Payroll,
    contributor: Contributor
) -> (Payroll, PaymentReceipt) {
    // Enforce budget constraint
    assert(payroll.spent_budget + contributor.payout <= payroll.total_budget);
    
    let updated_payroll: Payroll = Payroll {
        owner: payroll.owner,
        total_budget: payroll.total_budget,
        spent_budget: payroll.spent_budget + contributor.payout,
    };
    
    let receipt: PaymentReceipt = PaymentReceipt {
        owner: contributor.contributor,
        contributor: contributor.contributor,
        amount: contributor.payout,
    };
    
    return (updated_payroll, receipt);
}

// Reveals total spent, but not who and how much was paid
transition disclose_spent(payroll: Payroll) -> (Payroll, u64) {
    let new_payroll: Payroll = Payroll {
        owner: payroll.owner,
        total_budget: payroll.total_budget,
        spent_budget: payroll.spent_budget,
    };
    return (new_payroll, payroll.spent_budget);
}
}
