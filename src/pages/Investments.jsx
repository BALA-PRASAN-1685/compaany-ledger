import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/ledger.js";

export default function Investments() {
  const { state, derived } = useStore();
  const { totals, counts } = derived;

  const rows = state.transactions
    .filter((t) => ["Personal Investment", "Capital Return", "Salary/Withdrawal"].includes(t.category))
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));

  const personCard = (pid, invested, returned, withdrawn) => (
    <div className="card" key={pid}>
      <div className="label">Person {pid}</div>
      <div className="value">{inr(invested)}</div>
      <div className="hint">Invested</div>
      <div className="hint" style={{ marginTop: 8 }}>Capital returned: <b>{inr(returned)}</b></div>
      <div className="hint">Withdrawals: <b>{inr(withdrawn)}</b></div>
      <div className="hint">Net exposure: <b>{inr(invested - returned - withdrawn)}</b></div>
    </div>
  );

  return (
    <>
      <h1 className="page-title">Investment Dashboard</h1>
      <p className="page-sub">Partner capital is tracked separately from revenue — investments are not income.</p>

      <div className="cards">
        {personCard("A", totals.investmentA, totals.capitalReturnedA, totals.withdrawalsA)}
        {personCard("B", totals.investmentB, totals.capitalReturnedB, totals.withdrawalsB)}
        <div className="card">
          <div className="label">Total Business Investment</div>
          <div className="value">{inr(totals.totalInvested)}</div>
          <div className="hint">A {inr(totals.investmentA)} · B {inr(totals.investmentB)}</div>
        </div>
        <div className="card">
          <div className="label">Capital Returned</div>
          <div className="value">{inr(totals.capitalReturned)}</div>
          <div className="hint">Returned to partners, not profit</div>
        </div>
        <div className="card">
          <div className="label">Revenue</div>
          <div className="value">{inr(totals.revenue)}</div>
          <div className="hint">Client payments only</div>
        </div>
        <div className="card">
          <div className="label">Net Profit</div>
          <div className="value">{inr(totals.netProfit)}</div>
          <div className="hint">Revenue − expenses</div>
        </div>
      </div>

      <div className="panel">
        <h3>Investment / return transaction history ({rows.length})</h3>
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Category</th><th>From → To</th><th>Description</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id}>
                <td className="mono">{t.id}</td>
                <td>{t.date}</td>
                <td>{t.category}</td>
                <td>Person {t.fromPerson} → Person {t.toPerson}</td>
                <td>{t.description}</td>
                <td style={{ textAlign: "right" }}>{inr(t.amount)}</td>
                <td>{t.status.replace(/_/g, " ")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="info-box">
        Inter-partner transfers ({counts.total - counts.verified - counts.rejected > 0 ? "some pending" : "all settled"}) are
        excluded from revenue and investment totals. Only verified transactions feed these numbers.
      </div>
    </>
  );
}
