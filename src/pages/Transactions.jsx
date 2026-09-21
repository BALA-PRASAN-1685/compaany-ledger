import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { inr } from "../lib/ledger.js";
import Badge from "../components/Badge.jsx";

const CATEGORIES = ["Client Payment", "Personal Investment", "Business Expense", "Software Subscription", "Hosting", "Domain", "Advertising", "Equipment", "Refund", "Client Advance", "Salary/Withdrawal", "Transfer Between Partners", "Capital Return", "Other"];
const METHODS = ["Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cash", "PayPal", "Other"];

export default function Transactions() {
  const { state } = useStore();
  const [f, setF] = useState({ q: "", person: "", type: "", category: "", status: "", method: "", from: "", to: "", min: "", max: "" });
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const rows = useMemo(() => {
    return state.transactions
      .filter((t) => {
        if (f.person && t.fromPerson !== f.person && t.toPerson !== f.person) return false;
        if (f.type && t.type !== f.type) return false;
        if (f.category && t.category !== f.category) return false;
        if (f.status && t.status !== f.status) return false;
        if (f.method && t.paymentMethod !== f.method) return false;
        if (f.from && t.date < f.from) return false;
        if (f.to && t.date > f.to) return false;
        if (f.min && t.amount < Number(f.min)) return false;
        if (f.max && t.amount > Number(f.max)) return false;
        if (f.q) {
          const q = f.q.toLowerCase();
          const hay = [t.id, t.description, t.referenceNo, t.category, t.paymentMethod, t.notes].join(" ").toLowerCase();
          if (!hay.includes(q)) return false;
        }
        return true;
      })
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [state.transactions, f]);

  return (
    <>
      <h1 className="page-title">Transactions</h1>
      <p className="page-sub">{rows.length} of {state.transactions.length} transactions · <Link to="/transactions/new">+ Add transaction</Link></p>

      <div className="panel">
        <div className="filters">
          <input placeholder="🔍 Search ID, description, reference…" value={f.q} onChange={set("q")} />
          <select value={f.person} onChange={set("person")}><option value="">Person (any)</option><option value="A">Person A</option><option value="B">Person B</option></select>
          <select value={f.type} onChange={set("type")}><option value="">Type</option><option>CREDIT</option><option>DEBIT</option></select>
          <select value={f.category} onChange={set("category")}><option value="">Category</option>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          <select value={f.status} onChange={set("status")}><option value="">Status</option><option value="PENDING">Pending</option><option value="PROOF_UPLOADED">Proof Uploaded</option><option value="UNDER_REVIEW">Under Review</option><option value="VERIFIED">Verified</option><option value="REJECTED">Rejected</option></select>
          <select value={f.method} onChange={set("method")}><option value="">Payment method</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          <input type="date" value={f.from} onChange={set("from")} title="From date" />
          <input type="date" value={f.to} onChange={set("to")} title="To date" />
          <input type="number" placeholder="Min ₹" value={f.min} onChange={set("min")} />
          <input type="number" placeholder="Max ₹" value={f.max} onChange={set("max")} />
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead>
              <tr><th>ID</th><th>Date & Time</th><th>From → To</th><th>Category</th><th>Description</th><th>Method</th><th>Entered by</th><th>Verified by</th><th>Type</th><th style={{ textAlign: "right" }}>Amount</th><th>Status</th></tr>
            </thead>
            <tbody>
              {rows.map((t) => (
                <tr key={t.id}>
                  <td className="mono"><Link to={`/transactions/${t.id}`}>{t.id}</Link></td>
                  <td className="mono">{t.date} {t.time}</td>
                  <td>Person {t.fromPerson} → Person {t.toPerson}</td>
                  <td>{t.category}</td>
                  <td>{t.description}</td>
                  <td>{t.paymentMethod}</td>
                  <td>Person {t.enteredBy}</td>
                  <td>{t.verifiedBy ? `Person ${t.verifiedBy}` : "—"}</td>
                  <td><Badge kind={t.type}>{t.type}</Badge></td>
                  <td style={{ textAlign: "right" }} className={t.type === "CREDIT" ? "pos" : "neg"}>{inr(t.amount)}</td>
                  <td><Badge kind={t.status}>{t.status.replace(/_/g, " ")}</Badge></td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={11} className="muted">No transactions match these filters.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
