// The 'test_hello' test program.
import hello.aleo;

program test_hello.aleo {

    // Required dummy transition for test program
    transition dummy() -> u8 {
        return 0u8;
    }

    // Test: Initialize a new payroll with a total budget
    @test
    script test_init_payroll() {
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(10000u64);
        // Payroll should be created with spent_budget = 0
        assert_eq(payroll.total_budget, 10000u64);
        assert_eq(payroll.spent_budget, 0u64);
    }

    // Test: Add a contributor to a payroll
    @test
    script test_add_contributor() {
        // First init a payroll
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(5000u64);
        
        // Add a contributor with a payout of 1000
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (unused_payroll, contributor): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        assert_eq(contributor.payout, 1000u64);
        assert_eq(contributor.contributor, contributor_addr);
    }

    // Test: Pay a contributor and verify budget is updated
    @test
    script test_pay_contributor() {
        // Init payroll with 5000 budget
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(5000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, contributor_addr, 1000u64);
        
        // Pay the contributor
        let (updated_payroll, receipt): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = hello.aleo/pay_contributor(payroll_after_add, contributor);
        
        // Verify spent_budget increased by payout amount
        assert_eq(updated_payroll.spent_budget, 1000u64);
        assert_eq(updated_payroll.total_budget, 5000u64);
        
        // Verify receipt
        assert_eq(receipt.amount, 1000u64);
        assert_eq(receipt.contributor, contributor_addr);
    }

    // Test: Pay multiple contributors sequentially
    @test
    script test_pay_multiple_contributors() {
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(10000u64);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        let (payroll_after_add1, contributor1): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, addr1, 2000u64);
        let (payroll_after_add2, contributor2): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll_after_add1, addr2, 3000u64);
        
        // Pay first contributor
        let (payroll_after_first, receipt1): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = 
        hello.aleo/pay_contributor(payroll_after_add2, contributor1);
        assert_eq(payroll_after_first.spent_budget, 2000u64);
        
        // Pay second contributor using updated payroll
        let (payroll_after_second, receipt2): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = 
        hello.aleo/pay_contributor(payroll_after_first, contributor2);
        assert_eq(payroll_after_second.spent_budget, 5000u64);
    }

    // Test: Disclose spent budget (public output)
    @test
    script test_disclose_spent() {
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(8000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let (payroll_after_add, contributor): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, contributor_addr, 1500u64);
        
        let (updated_payroll, receipt): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = hello.aleo/pay_contributor(payroll_after_add, contributor);
        
        // Disclose spent amount (reveals total spent but not who/how much per person)
        let (final_payroll, disclosed): (hello.aleo/Payroll, u64) = hello.aleo/disclose_spent(updated_payroll);
        assert_eq(disclosed, 1500u64);
    }

    // Test: Should fail when payment exceeds remaining budget
    @test
    @should_fail
    script test_pay_exceeds_budget() {
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(1000u64);
        
        let contributor_addr: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        // Contributor payout (2000) exceeds total budget (1000)
        let (payroll_after_add, contributor): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, contributor_addr, 2000u64);
        
        // This should fail: spent_budget (0) + payout (2000) > total_budget (1000)
        let (updated_payroll, receipt): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = hello.aleo/pay_contributor(payroll_after_add, contributor);
    }

    // Test: Should fail when cumulative payments exceed budget
    @test
    @should_fail
    script test_cumulative_exceeds_budget() {
        let payroll: hello.aleo/Payroll = hello.aleo/init_payroll(3000u64);
        
        let addr1: address = aleo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq3ljyzc;
        let addr2: address = aleo1qgqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqanmpl0;
        
        let (payroll_after_add1, contributor1): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll, addr1, 2000u64);
        let (payroll_after_add2, contributor2): (hello.aleo/Payroll, hello.aleo/Contributor) = hello.aleo/add_contributor(payroll_after_add1, addr2, 2000u64);
        
        // First payment succeeds (spent: 0 + 2000 = 2000 <= 3000)
        let (payroll_after_first, receipt1): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = hello.aleo/pay_contributor(payroll_after_add2, contributor1);
        
        // Second payment should fail (spent: 2000 + 2000 = 4000 > 3000)
        let (payroll_after_second, receipt2): (hello.aleo/Payroll, hello.aleo/PaymentReceipt) = hello.aleo/pay_contributor(payroll_after_first, contributor2);
    }

}
