import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/ledger.js";

export default function Returns() {
  const { derived } = useStore();
  const { totals } = derived;
  const T = totals;

  const line = (label, formula, value) => (
    <tr>
      <td style={{ width: "34%" }}><b>{label}</b></td>
      <td className="mono muted">{formula}</td>
      <td style={{ textAlign: "right", width: "18%" }}><b>{value}</b></td>
    </tr>
  );

  return (
    <>
      <h1 className="page-title">Returns / ROI</h1>
      <p className="page-sub">Every number below shows its calculation methodology — nothing is a black box.</p>

      <div className="cards">
        <div className="card"><div className="label">Total Capital Invested</div><div className="value">{inr(T.totalInvested)}</div><div className="hint">Sum of verified Personal Investment entries</div></div>
        <div className="card"><div className="label">Total Revenue</div><div className="value">{inr(T.revenue)}</div><div className="hint">Verified Client Payments only</div></div>
        <div className="card"><div className="label">Total Business Expenses</div><div className="value">{inr(T.expenses)}</div><div className="hint">All verified expense categories</div></div>
        <div className="card"><div className="label">Total Capital Returned</div><div className="value">{inr(T.capitalReturned)}</div><div className="hint">Verified Capital Return entries</div></div>
        <div className="card"><div className="label">Net Profit</div><div className="value" style={{ color: T.netProfit >= 0 ? "var(--green)" : "var(--red)" }}>{inr(T.netProfit)}</div><div className="hint">Revenue − Expenses</div></div>
        <div className="card"><div className="label">Net Return</div><div className="value">{inr(T.netReturn)}</div><div className="hint">Capital returned + Net profit</div></div>
        <div className="card"><div className="label">ROI</div><div className="value">{T.roiPct.toFixed(1)}%</div><div className="hint">Net profit ÷ Total invested × 100</div></div>
      </div>

      <div className="panel">
        <h3>Calculation methodology</h3>
        <table>
          <tbody>
            {line("Total Capital Invested", `A ${inr(T.investmentA)} + B ${inr(T.investmentB)}`, inr(T.totalInvested))}
            {line("Total Revenue", "Σ verified Client Payment amounts", inr(T.revenue))}
            {line("Total Business Expenses", "Σ verified expense-category amounts", inr(T.expenses))}
            {line("Net Profit", `${inr(T.revenue)} − ${inr(T.expenses)}`, inr(T.netProfit))}
            {line("Total Capital Returned", `A ${inr(T.capitalReturnedA)} + B ${inr(T.capitalReturnedB)}`, inr(T.capitalReturned))}
            {line("Net Return", `${inr(T.capitalReturned)} + ${inr(T.netProfit)}`, inr(T.netReturn))}
            {line("ROI %", `${inr(T.netProfit)} ÷ ${inr(T.totalInvested)} × 100`, T.roiPct.toFixed(2) + "%")}
          </tbody>
        </table>
      </div>

      <div className="info-box">
        <b>Distinctions enforced by the system:</b>
        <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
          <li>Revenue ≠ Profit — profit is revenue <i>minus</i> expenses.</li>
          <li>Investment ≠ Revenue — partner capital sits in a Partner Capital account, never in revenue.</li>
          <li>Partner Transfer ≠ Revenue — inter-partner transfers hit Partner Payable, not income.</li>
          <li>Capital Return ≠ Profit — returning invested capital is a balance-sheet movement, not earnings.</li>
        </ul>
      </div>
    </>
  );
}
