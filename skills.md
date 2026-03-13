# Aleo Development — Lessons Learned & Pitfalls

> A complete log of every issue we hit while building **AleoPool** (`payroll_rishav_v3.aleo`).
> Use this as a reference for future Aleo projects so you don't waste hours on the same mistakes.

---

## Table of Contents

1. [Contract Deployment & Upgrades](#1-contract-deployment--upgrades)
2. [Leo Test Syntax & Constraints](#2-leo-test-syntax--constraints)
3. [Cross-Program `self.caller` Behavior](#3-cross-program-selfcaller-behavior)
4. [Identifier & Naming Rules](#4-identifier--naming-rules)
5. [External Record Construction in Tests](#5-external-record-construction-in-tests)
6. [Wallet Adapter: `requestRecords` Second Parameter](#6-wallet-adapter-requestrecords-second-parameter)
7. [Wallet Records Are Encrypted by Default](#7-wallet-records-are-encrypted-by-default)
8. [Credit Records Are Like Cash Bills, Not a Balance](#8-credit-records-are-like-cash-bills-not-a-balance)
9. [Batch Transactions Need Separate Record Inputs](#9-batch-transactions-need-separate-record-inputs)
10. [Deployment HTTP 522 Timeout](#10-deployment-http-522-timeout)
11. [Constructor Required for Deployment](#11-constructor-required-for-deployment)
12. [`@custom` vs `@noupgrade` Constructor](#12-custom-vs-noupgrade-constructor)
13. [Leo Test `script` Keyword Deprecation](#13-leo-test-script-keyword-deprecation)
14. [Spent Records Show Up in Wallet Queries](#14-spent-records-show-up-in-wallet-queries)
15. [`DecryptPermission` Affects Record Visibility](#15-decryptpermission-affects-record-visibility)

---

## 1. Contract Deployment & Upgrades

### The Problem
You **cannot deploy a program with the same name twice** on Aleo. Even if you change the code, re-running `leo deploy` with the same program name will fail.

### What We Expected
That we could redeploy `payroll_rishav_v2.aleo` after making changes (like changing function signatures).

### What Actually Happened
Aleo supports `leo upgrade` — but **only if all function signatures (input/output types) stay identical**. Our `init_payroll` changed from `(credits.aleo/credits, u64) -> Payroll` to just `(u64) -> Payroll`. The signature mismatch meant `upgrade` was impossible.

### The Fix
Rename the program. We went from `payroll_rishav_v2.aleo` → `payroll_rishav_v3.aleo` and did a fresh deploy. This required a global find-and-replace across **8 files**: `main.leo`, both test files, `program.json`, `aleo-service.ts`, `aleo-service types`, `aleo.ts`, and `execute.ts`.

### Rule to Remember
> **If you change any function's input or output types, you must deploy under a new program name.** Plan your function signatures carefully before first deploy.

---

## 2. Leo Test Syntax & Constraints

### The Problem
Leo tests have very specific syntax rules that aren't well-documented. We wasted hours with hallucinated test patterns.

### What Works (Leo 3.4.0)
```leo
import payroll_rishav_v3.aleo;

program test_payroll.aleo {
    transition dummy() -> u8 { return 0u8; }

    @test
    script test_something() {
        let result: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(100u64);
        assert_eq(result.total_budget, 100u64);
    }

    @test @should_fail
    script test_should_fail() {
        // This test passes if the code inside panics
        let p: payroll_rishav_v3.aleo/Payroll = payroll_rishav_v3.aleo/init_payroll(0u64); // budget must be > 0
    }
}
```

### Key Rules
- Test programs **must have a `transition dummy()`** — otherwise Leo errors on empty programs
- Tests use `@test script test_name()` (not `@test fn` — that's only in unreleased Leo master after PR #29159)
- `@should_fail` goes **before** the `script` keyword: `@test @should_fail script ...`
- You **must fully qualify** all types and calls: `payroll_rishav_v3.aleo/Payroll`, not just `Payroll`

---

## 3. Cross-Program `self.caller` Behavior

### The Problem
3 of our 14 tests failed because of `self.caller` mismatches.

### What We Expected
When our test program calls `payroll_rishav_v3.aleo/init_payroll()`, the `self.caller` inside `init_payroll` would be the **signer** (our wallet address).

### What Actually Happens
`self.caller` inside the called program = **the calling program's address** (i.e., `test_payroll.aleo`'s address), NOT the signer's address.

So when the test asserts `payroll.owner == self.caller`, it fails because:
- `payroll.owner` = `test_payroll.aleo`'s address (set by `init_payroll`'s `self.caller`)
- `self.caller` in the test script = the **signer**'s address

### The Fix
Remove `assert_eq(payroll.owner, self.caller)` from tests. The contract enforces ownership internally — tests can't verify it across program boundaries.

### Rule to Remember
> **`self.caller` in cross-program calls is the calling program's address, not the original signer.** Never assert `self.caller` matches across program boundaries in tests.

---

## 4. Identifier & Naming Rules

### The Problem
Leo identifiers have strict rules that cause cryptic compiler errors.

### Rules
- **Max 31 bytes** for identifiers — names like `test_overpayment_exceeds_budget_fails` will error with "identifier too long"
- **Must start with a letter** — no underscore-prefixed names like `_temp` or `_unused`
- Program names must match the pattern `[a-z][a-z0-9_]*` and be ≤ 31 chars

### Examples of Failures
```
❌ test_overpayment_exceeds_budget_fails    → too long (>31 bytes)
❌ _temp_var                                 → can't start with underscore
✅ test_overpay_fails                        → works
✅ temp_var                                   → works
```

---

## 5. External Record Construction in Tests

### The Problem
You **cannot construct records from external programs** inline in test code.

### What We Tried
```leo
// ❌ THIS DOES NOT WORK
let credit: credits.aleo/credits = credits.aleo/credits {
    owner: self.caller,
    microcredits: 5000u64,
};
```

### Why It Fails
Leo prohibits constructing records from imported programs. Records can only be created by the program that defines them (via its own transitions).

### The Fix
For `credits.aleo/credits` records, you can't create them in tests. Tests that need real credit records must be done as **integration tests** using `leo run` on devnet, not unit tests.

We restructured our contract so `init_payroll` only takes a `u64` budget (no credit record), and payment happens later in `pay_contributor` where the funding credit is a real wallet input.

### Rule to Remember
> **Never try to construct an external program's records in your code.** Only the defining program can create its records via transitions.

---

## 6. Wallet Adapter: `requestRecords` Second Parameter

### The Problem
Payroll records showed up in the dropdown but with "0.00 total, 0.00 remaining" — all fields were zero.

### What We Did Wrong
```typescript
// ❌ WRONG — second param is NOT "filter spent"
const records = await requestRecords(PROGRAM_ID, false);
```

### What the Parameter Actually Means
```typescript
requestRecords(program: string, includePlaintext?: boolean): Promise<unknown[]>
```

The second parameter is **`includePlaintext`** — it tells the wallet whether to **decrypt and include the plaintext** in the response. Passing `false` means: "don't decrypt" → you get encrypted ciphertext with no usable field values → all parsed numbers = 0.

### The Fix
```typescript
// ✅ CORRECT — request decrypted plaintext
const records = await requestRecords(PROGRAM_ID, true);
```

### Rule to Remember
> **Always pass `true` as the second argument to `requestRecords()`** unless you specifically want encrypted-only records.

---

## 7. Wallet Records Are Encrypted by Default

### The Problem
Even after fixing the `requestRecords` parameter, some records came back with empty `plaintext` and `data: undefined`.

### Why
The wallet returned `recordCiphertext` but no `recordPlaintext` or `data`. The records were still encrypted.

### The Fix
Use the wallet's `decrypt()` method as a fallback:
```typescript
const { requestRecords, decrypt } = useWallet();

// If plaintext is empty, decrypt the ciphertext manually
if (!plaintext && recordCiphertext && decrypt) {
    plaintext = await decrypt(recordCiphertext);
}
```

### Rule to Remember
> **Always add a `decrypt` fallback.** Don't assume `requestRecords` will return plaintext. The wallet's `DecryptPermission` setting and wallet implementation may require explicit decryption.

---

## 8. Credit Records Are Like Cash Bills, Not a Balance

### The Problem
We thought "having 34 credits" meant one balance we could draw from freely. But batch pay needed 2 separate credit records.

### How Aleo Credits Actually Work
Your balance is made up of **discrete record objects** — like physical bills:
- After receiving 20 credits: 1 record of 20
- After receiving 10 more: 2 records (20 + 10)
- After spending 15 from the 20-record: 1 record of 5 (change) + 1 record of 10 — still 2 records

Each transaction **consumes** input records and **produces** new output records (including change).

### Why This Matters
A transition that takes `f1: credits.aleo/credits, f2: credits.aleo/credits` needs **two distinct record objects**. You can't pass the same record twice, and you can't "partially spend" a record as two inputs.

### The Fix
Split records by sending credits to yourself (your own address), which creates 2 records from 1:
- Original: 1 record of 34 credits
- After self-send of 5: 1 record of 5 + 1 record of ~29 (minus fee)

---

## 9. Batch Transactions Need Separate Record Inputs

### The Problem
Batch pay contract takes N funding credits as separate inputs, but users typically only have 1 credit record.

### Contract Signature
```leo
transition batch_pay_2(
    payroll: Payroll,
    c1: Contributor,
    c2: Contributor,
    f1: credits.aleo/credits,  // needs its own record
    f2: credits.aleo/credits,  // needs a DIFFERENT record
) -> ...
```

### UX Challenge
Users don't know they need multiple records. The wallet shows a single "balance" number, hiding that it's one record.

### Potential Better Design (for future)
Take one large credit and split internally inside the transition, rather than requiring N separate inputs. This is a contract architecture decision to explore.

---

## 10. Deployment HTTP 522 Timeout

### The Problem
`leo deploy --broadcast` failed with an HTTP 522 error on first attempt.

### Why
The Aleo testnet node was temporarily unreachable (Cloudflare timeout). This is a network issue, not a code issue.

### The Fix
Just retry. The second attempt worked fine. Aleo testnet can be flaky.

### Rule to Remember
> **Always retry deployment at least 2-3 times before debugging.** Testnet has intermittent connectivity issues.

---

## 11. Constructor Required for Deployment

### The Problem
Programs won't deploy without a constructor.

### The Fix
Every Leo program needs a constructor:
```leo
@custom
async constructor() {
    assert_eq(true, true);
}
```

This is a no-op constructor that satisfies the deployment requirement.

---

## 12. `@custom` vs `@noupgrade` Constructor

### The Problem
Choosing the wrong constructor type locks you out of future upgrades.

### Options
| Decorator | Meaning |
|---|---|
| `@custom constructor()` | Allows future upgrades via `leo upgrade` (if signatures unchanged) |
| `@noupgrade constructor()` | **Permanently locks** the program — no upgrades ever |

### What We Used
`@custom` — so the program is theoretically upgradeable (though we hit the signature-change limit — see issue #1).

### Rule to Remember
> **Always use `@custom constructor()` during development.** Only switch to `@noupgrade` when the program is finalized for production.

---

## 13. Leo Test `script` Keyword Deprecation

### The Problem
Leo's `@test script` syntax works on Leo 3.4.0 but is deprecated.

### Current (Leo 3.4.0)
```leo
@test
script test_something() { ... }
```

### Future (Leo master, PR #29159)
```leo
@test
fn test_something() { ... }
```

The `script` keyword has been removed entirely in the latest Leo master. When Leo 3.5+ is released, all tests using `script` will break.

### Rule to Remember
> **Check your Leo version before writing tests.** The syntax is changing. Pin your Leo version in CI.

---

## 14. Spent Records Show Up in Wallet Queries

### The Problem
`requestRecords()` returns **all records including spent ones**. The `spent` field must be checked manually.

### The Fix
Always filter:
```typescript
records.filter(r => r.spent !== true && r.spent !== "true")
```

The `spent` field can be a boolean or a string depending on the wallet adapter version.

---

## 15. `DecryptPermission` Affects Record Visibility

### The Problem
With `DecryptPermission.UponRequest`, the wallet may prompt the user every time you call `requestRecords` or `decrypt`. This creates a bad UX with constant popups.

### Options
| Permission | Behavior |
|---|---|
| `UponRequest` | Asks user each time — secure but annoying |
| `AutoDecrypt` | Decrypts automatically — smooth UX, slightly less secure |
| `NoDecrypt` | Never decrypts — records come back encrypted only |

### What We Use
```typescript
<AleoWalletProvider
    decryptPermission={DecryptPermission.UponRequest}
    ...
>
```

### Rule to Remember
> **For dev/demo, consider `AutoDecrypt`.** For production, `UponRequest` is safer but plan your UI around the approval popups.

---

## Quick Reference: Common Leo Gotchas

| Gotcha | Rule |
|---|---|
| Can't redeploy same name | Rename program + update all references |
| Can't upgrade if signatures changed | Keep function signatures stable or deploy new name |
| `self.caller` in cross-program = calling program | Don't assert caller identity across program boundaries |
| Identifiers max 31 bytes | Keep names short |
| No underscore-prefix identifiers | Start names with a letter |
| Can't construct external records | Only the owning program creates its records |
| `requestRecords(prog, false)` = no plaintext | Always pass `true` for the second param |
| Credit records are discrete objects | Split records before batch transactions |
| Testnet is flaky | Retry deployments 2-3 times |
| Constructor required | Add `@custom async constructor()` |

---

*Last updated: March 9, 2026*
*Project: AleoPool — payroll_rishav_v3.aleo*
