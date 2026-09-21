// ─── Double-entry chart of accounts ─────────────────────────────────────────
export const ACCOUNTS = {
  CASH_BANK: "Cash / Bank",
  CLIENT_REVENUE: "Client Revenue",
  CLIENT_ADVANCE: "Client Advance (Liability)",
  PARTNER_CAPITAL_A: "Partner Capital — Person A",
  PARTNER_CAPITAL_B: "Partner Capital — Person B",
  PARTNER_DRAWING_A: "Partner Drawing — Person A",
  PARTNER_DRAWING_B: "Partner Drawing — Person B",
  PARTNER_PAYABLE: "Partner Payable (inter-partner transfer)",
  EXP_HOSTING: "Hosting Expense",
  EXP_DOMAIN: "Domain Expense",
  EXP_SOFTWARE: "Software Subscription Expense",
  EXP_ADVERTISING: "Advertising Expense",
  EXP_EQUIPMENT: "Equipment Expense",
  EXP_BUSINESS: "Business Expense",
  EXP_REFUND: "Refund Given",
  EXP_OTHER: "Other Expense",
};

// Category → double-entry rule. Partner transfers are NEVER revenue.
const CATEGORY_RULES = {
  "Client Payment":          (t) => [{ account: "CASH_BANK", debit: t.amount, credit: 0 }, { account: "CLIENT_REVENUE", debit: 0, credit: t.amount }],
  "Client Advance":          (t) => [{ account: "CASH_BANK", debit: t.amount, credit: 0 }, { account: "CLIENT_ADVANCE", debit: 0, credit: t.amount }],
  "Personal Investment":     (t) => [{ account: "CASH_BANK", debit: t.amount, credit: 0 }, { account: t.fromPerson === "A" ? "PARTNER_CAPITAL_A" : "PARTNER_CAPITAL_B", debit: 0, credit: t.amount }],
  "Capital Return":          (t) => [{ account: t.toPerson === "A" ? "PARTNER_CAPITAL_A" : "PARTNER_CAPITAL_B", debit: t.amount, credit: 0 }, { account: "CASH_BANK", debit: 0, credit: t.amount }],
  "Salary/Withdrawal":       (t) => [{ account: t.toPerson === "A" ? "PARTNER_DRAWING_A" : "PARTNER_DRAWING_B", debit: t.amount, credit: 0 }, { account: "CASH_BANK", debit: 0, credit: t.amount }],
  "Transfer Between Partners":(t) => [{ account: "PARTNER_PAYABLE", debit: t.amount, credit: 0 }, { account: "CASH_BANK", debit: 0, credit: t.amount }],
  "Hosting":                 (t) => expense("EXP_HOSTING", t),
  "Domain":                  (t) => expense("EXP_DOMAIN", t),
  "Software Subscription":   (t) => expense("EXP_SOFTWARE", t),
  "Advertising":             (t) => expense("EXP_ADVERTISING", t),
  "Equipment":               (t) => expense("EXP_EQUIPMENT", t),
  "Business Expense":        (t) => expense("EXP_BUSINESS", t),
  "Refund":                  (t) => expense("EXP_REFUND", t),
  "Other":                   (t) => t.type === "CREDIT"
      ? [{ account: "CASH_BANK", debit: t.amount, credit: 0 }, { account: "CLIENT_REVENUE", debit: 0, credit: t.amount }]
      : expense("EXP_OTHER", t),
};

function expense(account, t) {
  return [{ account, debit: t.amount, credit: 0 }, { account: "CASH_BANK", debit: 0, credit: t.amount }];
}

export function entriesFor(txn) {
  const rule = CATEGORY_RULES[txn.category];
  if (!rule) throw new Error(`No double-entry rule for category "${txn.category}"`);
  return rule(txn);
}

// ─── Money helpers ───────────────────────────────────────────────────────────
export const inr = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

// ─── Derived financial state (single source of truth for the UI) ─────────────
export const EXPENSE_CATEGORIES = ["Business Expense", "Software Subscription", "Hosting", "Domain", "Advertising", "Equipment", "Refund", "Other"];
export const INVESTMENT_CATEGORIES = ["Personal Investment"];
export const REVENUE_CATEGORIES = ["Client Payment"];

export function computeState(transactions, proofs) {
  const verified = transactions.filter((t) => t.status === "VERIFIED");

  const sumBy = (list, cats) => list.filter((t) => cats.includes(t.category)).reduce((s, t) => s + t.amount, 0);

  const investmentA = verified.filter((t) => t.category === "Personal Investment" && t.fromPerson === "A").reduce((s, t) => s + t.amount, 0);
  const investmentB = verified.filter((t) => t.category === "Personal Investment" && t.fromPerson === "B").reduce((s, t) => s + t.amount, 0);
  const totalInvested = investmentA + investmentB;

  const withdrawalsA = verified.filter((t) => t.category === "Salary/Withdrawal" && t.toPerson === "A").reduce((s, t) => s + t.amount, 0);
  const withdrawalsB = verified.filter((t) => t.category === "Salary/Withdrawal" && t.toPerson === "B").reduce((s, t) => s + t.amount, 0);

  const capitalReturnedA = verified.filter((t) => t.category === "Capital Return" && t.toPerson === "A").reduce((s, t) => s + t.amount, 0);
  const capitalReturnedB = verified.filter((t) => t.category === "Capital Return" && t.toPerson === "B").reduce((s, t) => s + t.amount, 0);
  const capitalReturned = capitalReturnedA + capitalReturnedB;

  const revenue = sumBy(verified, REVENUE_CATEGORIES);
  const expenses = sumBy(verified, EXPENSE_CATEGORIES);
  const netProfit = revenue - expenses;

  const totalCredits = verified.filter((t) => t.type === "CREDIT").reduce((s, t) => s + t.amount, 0);
  const totalDebits = verified.filter((t) => t.type === "DEBIT").reduce((s, t) => s + t.amount, 0);

  // Cash/bank ledger running balance from double entries
  let cash = 0;
  const cashFlow = transactions
    .slice()
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .map((t) => {
      const eff = entriesFor(t).filter((e) => e.account === "CASH_BANK").reduce((s, e) => s + e.debit - e.credit, 0);
      cash += eff;
      return { id: t.id, date: t.date, amount: eff, balance: cash, status: t.status };
    });

  // Monthly series (verified only)
  const months = {};
  verified.forEach((t) => {
    const m = t.date.slice(0, 7);
    months[m] = months[m] || { month: m, revenue: 0, expenses: 0, credits: 0, debits: 0 };
    if (REVENUE_CATEGORIES.includes(t.category)) months[m].revenue += t.amount;
    if (EXPENSE_CATEGORIES.includes(t.category)) months[m].expenses += t.amount;
    if (t.type === "CREDIT") months[m].credits += t.amount;
    if (t.type === "DEBIT") months[m].debits += t.amount;
  });
  const monthly = Object.values(months).sort((a, b) => a.month.localeCompare(b.month));

  // Reconciliation
  let ledgerDr = 0, ledgerCr = 0;
  transactions.forEach((t) => entriesFor(t).forEach((e) => { ledgerDr += e.debit; ledgerCr += e.credit; }));
  const verifiedIds = new Set(verified.map((t) => t.id));
  const txnProofCount = proofs.reduce((m, p) => ((m[p.txnId] = (m[p.txnId] || 0) + 1), m), {});
  const duplicateKeys = {};
  transactions.forEach((t) => {
    const k = [t.date, t.amount, t.category, t.fromPerson, t.toPerson].join("|");
    (duplicateKeys[k] = duplicateKeys[k] || []).push(t.id);
  });
  const duplicates = Object.values(duplicateKeys).filter((ids) => ids.length > 1);

  const reconciliation = {
    ledgerDr, ledgerCr,
    balanced: ledgerDr === ledgerCr,
    difference: Math.abs(ledgerDr - ledgerCr),
    unverifiedCount: transactions.filter((t) => t.status !== "VERIFIED" && t.status !== "REJECTED").length,
    missingProofs: transactions.filter((t) => t.status === "VERIFIED" && !(txnProofCount[t.id] > 0)).length,
    duplicateWarnings: duplicates,
    cashBalance: cash,
  };

  return {
    counts: {
      total: transactions.length,
      verified: verified.length,
      rejected: transactions.filter((t) => t.status === "REJECTED").length,
      pending: transactions.filter((t) => ["PENDING", "PROOF_UPLOADED", "UNDER_REVIEW"].includes(t.status)).length,
    },
    totals: {
      cashBalance: cash,
      totalCredits, totalDebits,
      totalInvested, investmentA, investmentB,
      revenue, expenses, netProfit,
      capitalReturned, capitalReturnedA, capitalReturnedB,
      withdrawalsA, withdrawalsB,
      netReturn: capitalReturned + netProfit,
      roiPct: totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0,
    },
    monthly, cashFlow, reconciliation,
  };
}
