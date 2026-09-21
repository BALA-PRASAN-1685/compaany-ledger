import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import ProofUploader from "../components/ProofUploader.jsx";

const CATEGORIES = ["Client Payment", "Personal Investment", "Business Expense", "Software Subscription", "Hosting", "Domain", "Advertising", "Equipment", "Refund", "Client Advance", "Salary/Withdrawal", "Transfer Between Partners", "Capital Return", "Other"];
const METHODS = ["Bank Transfer", "UPI", "Credit Card", "Debit Card", "Cash", "PayPal", "Other"];

export default function AddTransaction() {
  const { dispatch, currentUser } = useStore();
  const nav = useNavigate();
  const [form, setForm] = useState({
    type: "CREDIT", amount: "", fromPerson: currentUser.id, toPerson: "BUSINESS",
    category: "Client Payment", description: "", date: new Date().toISOString().slice(0, 10),
    time: new Date().toTimeString().slice(0, 5), paymentMethod: "Bank Transfer",
    referenceNo: "", notes: "",
  });
  const [proofs, setProofs] = useState([]);
  const [error, setError] = useState("");

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    if (!form.amount || Number(form.amount) <= 0) return setError("Enter a valid amount greater than 0.");
    if (!form.description.trim()) return setError("Description / reason is required.");
    if (!form.date || !form.time) return setError("Date and time are required.");
    dispatch({ type: "ADD_TXN", txn: { ...form, amount: Number(form.amount), enteredBy: currentUser.id }, proofs });
    nav("/transactions");
  };

  return (
    <>
      <h1 className="page-title">Add Transaction</h1>
      <p className="page-sub">Entered as <b>{currentUser.name}</b> · New transactions always start as <b>PENDING</b> and require verification by the other partner.</p>

      {error && <div className="warn-box" onClick={() => setError("")}>{error}</div>}
      <div className="info-box">
        Accounting note: transfers between Person A and Person B are <b>never</b> recorded as business revenue, and partner
        investment is recorded as <b>Partner Capital</b> (a liability/capital account), not income.
      </div>

      <form className="panel" onSubmit={submit}>
        <div className="grid">
          <div className="field">
            <label>Transaction type *</label>
            <select value={form.type} onChange={set("type")}>
              <option value="CREDIT">Credit (money in)</option>
              <option value="DEBIT">Debit (money out)</option>
            </select>
          </div>
          <div className="field">
            <label>Amount (₹) *</label>
            <input type="number" min="1" step="1" value={form.amount} onChange={set("amount")} placeholder="e.g. 5000" />
          </div>
          <div className="field">
            <label>From (who paid/sent) *</label>
            <select value={form.fromPerson} onChange={set("fromPerson")}>
              <option value="A">Person A</option><option value="B">Person B</option>
              <option value="CLIENT">External Client</option><option value="BUSINESS">Business Account</option>
            </select>
          </div>
          <div className="field">
            <label>To (who received) *</label>
            <select value={form.toPerson} onChange={set("toPerson")}>
              <option value="BUSINESS">Business Account</option>
              <option value="A">Person A</option><option value="B">Person B</option>
              <option value="VENDOR">External Vendor</option><option value="CLIENT">External Client</option>
            </select>
          </div>
          <div className="field">
            <label>Category *</label>
            <select value={form.category} onChange={set("category")}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <div className="field">
            <label>Date *</label>
            <input type="date" value={form.date} onChange={set("date")} />
          </div>
          <div className="field">
            <label>Time *</label>
            <input type="time" value={form.time} onChange={set("time")} />
          </div>
          <div className="field">
            <label>Payment method *</label>
            <select value={form.paymentMethod} onChange={set("paymentMethod")}>{METHODS.map((m) => <option key={m}>{m}</option>)}</select>
          </div>
          <div className="field">
            <label>Reference / transaction number</label>
            <input value={form.referenceNo} onChange={set("referenceNo")} placeholder="UPI ref, invoice no, NEFT id…" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Description / reason *</label>
            <textarea rows={2} value={form.description} onChange={set("description")} placeholder="Why was this amount credited or debited?" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Additional notes</label>
            <input value={form.notes} onChange={set("notes")} placeholder="Optional internal notes" />
          </div>
          <div className="field" style={{ gridColumn: "1 / -1" }}>
            <label>Proof / evidence (screenshots, invoices, receipts)</label>
            <div className="btn-row" style={{ alignItems: "center" }}>
              <ProofUploader onUpload={(p) => setProofs((x) => [...x, p])} />
              <span className="muted" style={{ fontSize: 12.5 }}>
                {proofs.length ? proofs.map((p) => p.fileName).join(", ") : "No file selected — proofs can also be added later."}
              </span>
            </div>
          </div>
        </div>
        <div className="btn-row" style={{ marginTop: 16 }}>
          <button className="btn" type="submit">Save as PENDING</button>
          <button className="btn secondary" type="button" onClick={() => nav(-1)}>Cancel</button>
        </div>
      </form>
    </>
  );
}
