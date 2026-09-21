import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import { entriesFor, ACCOUNTS, inr } from "../lib/ledger.js";
import Badge, { STATUS_LABEL } from "../components/Badge.jsx";
import Timeline from "../components/Timeline.jsx";
import ProofList from "../components/ProofList.jsx";
import ProofUploader from "../components/ProofUploader.jsx";

export default function TransactionDetail() {
  const { id } = useParams();
  const { txnById, proofsFor, auditFor, currentUser, dispatch, derived } = useStore();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [verifyNote, setVerifyNote] = useState("");

  const t = txnById(id);
  if (!t) return <p className="muted">Transaction not found. <Link to="/transactions">Back to list</Link></p>;

  const proofs = proofsFor(id);
  const events = auditFor(id).slice().sort((a, b) => a.at.localeCompare(b.at));
  const entries = entriesFor(t);
  const cashEvent = derived.cashFlow.find((c) => c.id === id);
  const selfEntered = currentUser.id === t.enteredBy;
  const finalState = ["VERIFIED", "REJECTED"].includes(t.status);

  const fmt = (iso) => new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <p className="page-sub"><Link to="/transactions">← Transactions</Link></p>
      <h1 className="page-title">TRANSACTION #{t.id}</h1>
      <p className="page-sub">Version {t.version} · Recorded in the immutable audit trail — edits preserve prior versions.</p>

      <div className="panel">
        <div className="kv">
          <div><div className="k">Amount</div><div className="v">{inr(t.amount)}</div></div>
          <div><div className="k">Type</div><div className="v"><Badge kind={t.type}>{t.type}</Badge></div></div>
          <div><div className="k">From</div><div className="v">Person {t.fromPerson}</div></div>
          <div><div className="k">To</div><div className="v">Person {t.toPerson}</div></div>
          <div><div className="k">Category</div><div className="v">{t.category}</div></div>
          <div><div className="k">Entered by</div><div className="v">Person {t.enteredBy}</div></div>
          <div><div className="k">Entered at</div><div className="v">{fmt(t.createdAt)}</div></div>
          <div><div className="k">Verified by</div><div className="v">{t.verifiedBy ? `Person ${t.verifiedBy}` : "—"}</div></div>
          <div><div className="k">Verified at</div><div className="v">{t.verifiedBy ? fmt(t.updatedAt) : "—"}</div></div>
          <div><div className="k">Status</div><div className="v"><Badge kind={t.status}>{STATUS_LABEL[t.status]}</Badge></div></div>
          <div><div className="k">Payment method</div><div className="v">{t.paymentMethod}</div></div>
          <div><div className="k">Reference</div><div className="v mono">{t.referenceNo || "—"}</div></div>
          <div><div className="k">Balance after (cash/bank)</div><div className="v">{cashEvent ? inr(cashEvent.balance) : "—"}</div></div>
          <div><div className="k">Last modified</div><div className="v">{fmt(t.updatedAt)}</div></div>
        </div>
        {t.description && (
          <div style={{ marginTop: 14 }}>
            <div className="k">Description / reason</div>
            <div style={{ marginTop: 4 }}>{t.description}</div>
          </div>
        )}
        {t.notes && <div className="muted" style={{ marginTop: 8 }}>Notes: {t.notes}</div>}
      </div>

      {/* Verification workflow */}
      <div className="panel">
        <h3>Verification workflow — PENDING → PROOF UPLOADED → UNDER REVIEW → VERIFIED / REJECTED</h3>
        <div className="btn-row" style={{ marginBottom: 10 }}>
          <ProofUploader
            label="Upload proof"
            onUpload={(p) => dispatch({ type: "UPLOAD_PROOF", txnId: id, proof: { ...p, uploadedBy: currentUser.id } })}
          />
          {!finalState && t.status !== "UNDER_REVIEW" && (
            <button className="btn secondary" onClick={() => dispatch({ type: "SUBMIT_REVIEW", txnId: id, actor: currentUser.id })}>
              Submit for review
            </button>
          )}
          {!finalState && (
            <>
              <button
                className="btn success"
                disabled={selfEntered}
                title={selfEntered ? "You entered this transaction — the other partner must verify it." : "Mark as verified"}
                onClick={() => {
                  const notes = verifyNote.trim() || undefined;
                  setVerifyNote("");
                  dispatch({ type: "VERIFY", txnId: id, actor: currentUser.id, notes });
                }}
              >
                ✔ Verify
              </button>
              <button className="btn danger" onClick={() => setRejectOpen((v) => !v)}>✖ Reject</button>
            </>
          )}
          {finalState && <span className="muted">This transaction is {STATUS_LABEL[t.status].toLowerCase()} — no further action allowed.</span>}
        </div>
        {selfEntered && !finalState && (
          <div className="warn-box">You entered this transaction, so you cannot mark it as independently verified — verification must come from the other partner.</div>
        )}
        {!finalState && (
          <div className="field" style={{ maxWidth: 420 }}>
            <label>Verification note (optional)</label>
            <input value={verifyNote} onChange={(e) => setVerifyNote(e.target.value)} placeholder="e.g. matched with bank statement" />
          </div>
        )}
        {rejectOpen && (
          <div className="field" style={{ maxWidth: 420 }}>
            <label>Rejection reason (mandatory) *</label>
            <div className="btn-row">
              <input value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Why is this transaction rejected?" />
              <button
                className="btn danger"
                disabled={!rejectReason.trim()}
                onClick={() => { dispatch({ type: "REJECT", txnId: id, actor: currentUser.id, reason: rejectReason }); setRejectOpen(false); }}
              >
                Confirm rejection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Double-entry */}
      <div className="panel">
        <h3>Double-entry ledger effect</h3>
        <table>
          <thead><tr><th>Account</th><th style={{ textAlign: "right" }}>Debit</th><th style={{ textAlign: "right" }}>Credit</th></tr></thead>
          <tbody>
            {entries.map((e, i) => (
              <tr key={i}>
                <td>{ACCOUNTS[e.account] || e.account}</td>
                <td style={{ textAlign: "right" }}>{e.debit ? inr(e.debit) : ""}</td>
                <td style={{ textAlign: "right" }}>{e.credit ? inr(e.credit) : ""}</td>
              </tr>
            ))}
            <tr style={{ fontWeight: 700 }}>
              <td>Total</td>
              <td style={{ textAlign: "right" }}>{inr(entries.reduce((s, e) => s + e.debit, 0))}</td>
              <td style={{ textAlign: "right" }}>{inr(entries.reduce((s, e) => s + e.credit, 0))}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Proofs */}
      <div className="panel">
        <h3>Proof / evidence ({proofs.length})</h3>
        <ProofList txnId={id} proofs={proofs} />
      </div>

      {/* Audit timeline */}
      <div className="panel">
        <h3>Complete audit timeline ({events.length} events)</h3>
        <Timeline events={events} />
      </div>
    </>
  );
}
