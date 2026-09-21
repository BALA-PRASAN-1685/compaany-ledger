import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import ProofList from "../components/ProofList.jsx";

export default function ProofDocuments() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [txnId, setTxnId] = useState("");

  const proofs = useMemo(() => {
    return state.proofs.filter((p) => {
      if (txnId && p.txnId !== txnId) return false;
      if (q && !`${p.fileName} ${p.txnId} ${p.uploadedBy}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [state.proofs, q, txnId]);

  const verifiedWithoutProof = state.transactions.filter(
    (t) => t.status === "VERIFIED" && !state.proofs.some((p) => p.txnId === t.id)
  );

  return (
    <>
      <h1 className="page-title">Proof Documents</h1>
      <p className="page-sub">{proofs.length} proof file(s) on record. Originals are stored unmodified.</p>

      {verifiedWithoutProof.length > 0 && (
        <div className="warn-box">
          ⚠️ {verifiedWithoutProof.length} verified transaction(s) have no proof attached:
          {" "}{verifiedWithoutProof.map((t) => (<Link key={t.id} to={`/transactions/${t.id}`} className="mono"> {t.id}</Link>))}
        </div>
      )}

      <div className="panel">
        <div className="filters" style={{ gridTemplateColumns: "2fr 1fr" }}>
          <input placeholder="🔍 Search by file name, uploader…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={txnId} onChange={(e) => setTxnId(e.target.value)}>
            <option value="">All transactions</option>
            {state.transactions.map((t) => <option key={t.id} value={t.id}>{t.id}</option>)}
          </select>
        </div>
        <ProofList proofs={proofs} />
      </div>
    </>
  );
}
