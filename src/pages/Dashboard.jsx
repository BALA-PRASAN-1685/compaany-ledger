import { Link } from "react-router-dom";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart, Pie, Cell, LineChart, Line, ComposedChart,
} from "recharts";
import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/ledger.js";
import Badge from "../components/Badge.jsx";

const COLORS = ["#2563eb", "#16a34a", "#d97706", "#dc2626"];

export default function Dashboard() {
  const { state, derived } = useStore();
  const { totals, counts, monthly, reconciliation } = derived;

  const stats = [
    ["Current Balance (Cash/Bank)", inr(totals.cashBalance), "From double-entry ledger"],
    ["Total Credits (Verified)", inr(totals.totalCredits), `${counts.verified} verified txns`],
    ["Total Debits (Verified)", inr(totals.totalDebits), ""],
    ["Total Investment", inr(totals.totalInvested), `A: ${inr(totals.investmentA)} · B: ${inr(totals.investmentB)}`],
    ["Total Revenue", inr(totals.revenue), "Client payments only"],
    ["Total Expenses", inr(totals.expenses), ""],
    ["Net Profit", inr(totals.netProfit), "Revenue − Expenses"],
    ["Net Return", inr(totals.netReturn), "Capital returned + profit"],
    ["ROI", totals.roiPct.toFixed(1) + "%", "Net profit ÷ invested"],
    ["Pending Verification", counts.pending, "Needs partner review"],
    ["Verified", counts.verified, ""],
    ["Rejected", counts.rejected, ""],
  ];

  const contrib = [
    { name: "Person A", value: totals.investmentA },
    { name: "Person B", value: totals.investmentB },
  ];

  const recent = state.transactions.slice().sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 6);

  return (
    <>
      <h1 className="page-title">Financial Dashboard</h1>
      <p className="page-sub">Live, double-entry reconciled view of the business. Verified transactions only feed the totals.</p>

      <div className="cards">
        {stats.map(([label, value, hint]) => (
          <div className="card" key={label}>
            <div className="label">{label}</div>
            <div className="value">{value}</div>
            {hint && <div className="hint">{hint}</div>}
          </div>
        ))}
      </div>

      <div className={`${reconciliation.balanced ? "ok-box" : "warn-box"}`}>
        {reconciliation.balanced
          ? `✅ Reconciled: total debits ${inr(reconciliation.ledgerDr)} = total credits ${inr(reconciliation.ledgerCr)} across all ledger entries.`
          : `⚠️ Ledger out of balance by ${inr(reconciliation.difference)} (Dr ${inr(reconciliation.ledgerDr)} ≠ Cr ${inr(reconciliation.ledgerCr)}).`}
        {" "}Unverified: {reconciliation.unverifiedCount} · Verified without proof: {reconciliation.missingProofs} · Duplicate groups: {reconciliation.duplicateWarnings.length}
      </div>

      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(340px,1fr))" }}>
        <div className="panel">
          <h3>Monthly Credits vs Debits</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={monthly}>
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="credits" name="Credits" fill="#16a34a" /><Bar dataKey="debits" name="Debits" fill="#dc2626" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3>Monthly Revenue vs Expenses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={monthly}>
              <XAxis dataKey="month" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#2563eb" /><Bar dataKey="expenses" name="Expenses" fill="#d97706" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3>Partner Contributions</h3>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={contrib} dataKey="value" nameKey="name" label={({ name, value }) => `${name}: ${inr(value)}`} outerRadius={85}>
                {contrib.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v) => inr(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="panel">
          <h3>Cash Flow (cumulative cash/bank balance)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={derived.cashFlow.filter((c) => c.status === "VERIFIED")}>
              <XAxis dataKey="date" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v) => inr(v)} />
              <Line type="monotone" dataKey="balance" name="Balance" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel">
        <h3>Recent Transactions</h3>
        <table>
          <thead><tr><th>ID</th><th>Date</th><th>Description</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th></tr></thead>
          <tbody>
            {recent.map((t) => (
              <tr key={t.id}>
                <td className="mono"><Link to={`/transactions/${t.id}`}>{t.id}</Link></td>
                <td>{t.date}</td>
                <td>{t.description}</td>
                <td><Badge kind={t.type}>{t.type}</Badge></td>
                <td style={{ textAlign: "right" }} className={t.type === "CREDIT" ? "pos" : "neg"}>{t.type === "CREDIT" ? "+" : "−"}{inr(t.amount)}</td>
                <td><Badge kind={t.status}>{t.status.replace(/_/g, " ")}</Badge></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
