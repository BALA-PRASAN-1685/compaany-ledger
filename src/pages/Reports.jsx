import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/ledger.js";
import { downloadCSV, downloadJSON } from "../lib/export.js";

export default function Reports() {
  const { state, derived } = useStore();
  const { totals, counts, reconciliation } = derived;

  const txnRows = state.transactions.map((t) => ({
    id: t.id, date: t.date, time: t.time, type: t.type, amount: t.amount, category: t.category,
    from: t.fromPerson, to: t.toPerson, description: t.description, paymentMethod: t.paymentMethod,
    referenceNo: t.referenceNo, enteredBy: t.enteredBy, verifiedBy: t.verifiedBy || "", status: t.status,
    createdAt: t.createdAt, updatedAt: t.updatedAt, version: t.version,
  }));

  const auditRows = state.auditEvents.map((e) => ({
    eventId: e.id, txnId: e.txnId, actor: e.actor, action: e.action, at: e.at,
    previousStatus: e.previous?.status || "", newStatus: e.next?.status || "", notes: e.notes,
  }));

  // Evidence report: references only, no embedded images (spec: do not embed sensitive proofs in exports)
  const evidenceRows = state.proofs.map((p) => ({
    proofId: p.id, txnId: p.txnId, fileName: p.fileName, fileType: p.fileType,
    uploadedBy: p.uploadedBy, uploadedAt: p.uploadedAt,
    previewAvailableInApp: p.dataUrl ? "yes" : "no (placeholder)",
  }));

  const exportPDF = () => window.print();

  return (
    <>
      <h1 className="page-title">Reports & Exports</h1>
      <p className="page-sub">Spreadsheet exports contain data only. Proof images are never embedded — use the separate evidence report for references, or print to PDF for the full report.</p>

      <div className="panel">
        <h3>Export</h3>
        <div className="btn-row">
          <button className="btn" onClick={() => downloadCSV("transactions.csv", txnRows)}>⬇ Transactions (CSV)</button>
          <button className="btn" onClick={() => downloadCSV("audit-log.csv", auditRows)}>⬇ Audit log (CSV)</button>
          <button className="btn" onClick={() => downloadCSV("evidence-report.csv", evidenceRows)}>⬇ Evidence report (CSV, references only)</button>
          <button className="btn secondary" onClick={() => downloadJSON("full-backup.json", state)}>⬇ Full data backup (JSON)</button>
          <button className="btn success" onClick={exportPDF}>🖨 Print / PDF financial report</button>
        </div>
        <p className="muted" style={{ fontSize: 12, marginTop: 10 }}>
          Tip: open the printed report's destination and choose “Save as PDF”. Excel can open all CSV files directly.
        </p>
      </div>

      {/* Print-friendly report */}
      <div className="panel" id="print-report">
        <h3>Financial Report — {new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}</h3>

        <h3 style={{ marginTop: 16 }}>1. Business summary</h3>
        <table><tbody>
          <tr><td>Total transactions</td><td style={{ textAlign: "right" }}>{counts.total}</td></tr>
          <tr><td>Verified / Pending / Rejected</td><td style={{ textAlign: "right" }}>{counts.verified} / {counts.pending} / {counts.rejected}</td></tr>
          <tr><td>Cash / bank balance (ledger-derived)</td><td style={{ textAlign: "right" }}>{inr(totals.cashBalance)}</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>2. Investment summary</h3>
        <table><tbody>
          <tr><td>Person A investment</td><td style={{ textAlign: "right" }}>{inr(totals.investmentA)}</td></tr>
          <tr><td>Person B investment</td><td style={{ textAlign: "right" }}>{inr(totals.investmentB)}</td></tr>
          <tr><td><b>Total invested</b></td><td style={{ textAlign: "right" }}><b>{inr(totals.totalInvested)}</b></td></tr>
          <tr><td>Capital returned</td><td style={{ textAlign: "right" }}>{inr(totals.capitalReturned)}</td></tr>
          <tr><td>Withdrawals — A / B</td><td style={{ textAlign: "right" }}>{inr(totals.withdrawalsA)} / {inr(totals.withdrawalsB)}</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>3. Revenue summary</h3>
        <table><tbody>
          <tr><td>Total revenue (client payments)</td><td style={{ textAlign: "right" }}>{inr(totals.revenue)}</td></tr>
          <tr><td>Partner transfers in revenue</td><td style={{ textAlign: "right" }}>₹0 (excluded by design)</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>4. Expense summary</h3>
        <table><tbody>
          <tr><td>Total business expenses</td><td style={{ textAlign: "right" }}>{inr(totals.expenses)}</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>5. Debit / credit summary</h3>
        <table><tbody>
          <tr><td>Total verified credits</td><td style={{ textAlign: "right" }}>{inr(totals.totalCredits)}</td></tr>
          <tr><td>Total verified debits</td><td style={{ textAlign: "right" }}>{inr(totals.totalDebits)}</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>6. Partner-wise contribution</h3>
        <table><tbody>
          <tr><td>Person A share of capital</td><td style={{ textAlign: "right" }}>{totals.totalInvested ? ((totals.investmentA / totals.totalInvested) * 100).toFixed(1) : 0}%</td></tr>
          <tr><td>Person B share of capital</td><td style={{ textAlign: "right" }}>{totals.totalInvested ? ((totals.investmentB / totals.totalInvested) * 100).toFixed(1) : 0}%</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>7. Profit & return</h3>
        <table><tbody>
          <tr><td>Net profit (revenue − expenses)</td><td style={{ textAlign: "right" }}>{inr(totals.netProfit)}</td></tr>
          <tr><td>Net return (returned capital + profit)</td><td style={{ textAlign: "right" }}>{inr(totals.netReturn)}</td></tr>
          <tr><td>ROI (profit ÷ invested)</td><td style={{ textAlign: "right" }}>{totals.roiPct.toFixed(2)}%</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>8. Reconciliation</h3>
        <table><tbody>
          <tr><td>Ledger debits = credits?</td><td style={{ textAlign: "right" }}>{reconciliation.balanced ? "✅ Reconciled" : "⚠️ Difference of " + inr(reconciliation.difference)}</td></tr>
          <tr><td>Total ledger debits</td><td style={{ textAlign: "right" }}>{inr(reconciliation.ledgerDr)}</td></tr>
          <tr><td>Total ledger credits</td><td style={{ textAlign: "right" }}>{inr(reconciliation.ledgerCr)}</td></tr>
          <tr><td>Unverified transactions</td><td style={{ textAlign: "right" }}>{reconciliation.unverifiedCount}</td></tr>
          <tr><td>Verified without proof</td><td style={{ textAlign: "right" }}>{reconciliation.missingProofs}</td></tr>
          <tr><td>Duplicate warnings</td><td style={{ textAlign: "right" }}>{reconciliation.duplicateWarnings.length}</td></tr>
        </tbody></table>

        <h3 style={{ marginTop: 16 }}>9. Transaction table</h3>
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Category</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {state.transactions.map((t) => (
              <tr key={t.id}>
                <td>{t.id}</td><td>{t.date}</td><td>{t.type}</td><td>{t.category}</td><td>{t.description}</td>
                <td style={{ textAlign: "right" }}>{inr(t.amount)}</td><td>{t.status.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h3 style={{ marginTop: 16 }}>10. Audit history summary</h3>
        <p>{state.auditEvents.length} audit events. Full log exported via “Audit log (CSV)”.</p>

        <h3 style={{ marginTop: 16 }}>11. Attached proof references</h3>
        <table>
          <thead><tr><th>Proof</th><th>Transaction</th><th>File</th><th>Uploaded by</th><th>At</th></tr></thead>
          <tbody>
            {state.proofs.map((p) => (
              <tr key={p.id}><td>{p.id}</td><td>{p.txnId}</td><td>{p.fileName}</td><td>Person {p.uploadedBy}</td><td>{p.uploadedAt}</td></tr>
            ))}
          </tbody>
        </table>
        <p className="muted" style={{ fontSize: 12 }}>Proof images are referenced, not embedded, in data exports. View full evidence inside the app on each transaction's detail page.</p>
      </div>
    </>
  );
}
