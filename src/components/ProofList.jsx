import { useStore } from "../lib/store.jsx";

export default function ProofList({ txnId, proofs }) {
  const { txnById } = useStore();
  return (
    <>
      <div className="warn-box">
        ⚠️ Screenshots and proofs are <b>supporting evidence only</b>. They are not independently
        verified financial records — verification requires partner review of the actual bank/payment records.
      </div>
      {proofs.length === 0 ? (
        <p className="muted">No proof attached yet for this transaction.</p>
      ) : (
        <div className="proof-grid">
          {proofs.map((p) => (
            <div className="proof-card" key={p.id}>
              {p.dataUrl && p.fileType?.startsWith("image/") ? (
                <a href={p.dataUrl} target="_blank" rel="noreferrer">
                  <img src={p.dataUrl} alt={p.fileName} />
                </a>
              ) : (
                <div style={{ height: 130, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9" }}>
                  <span className="muted" style={{ fontSize: 34 }}>📄</span>
                </div>
              )}
              <div className="body">
                <b title={p.fileName}>{p.fileName}</b>
                <div>Uploaded by: Person {p.uploadedBy}</div>
                <div>{new Date(p.uploadedAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</div>
                <div className="mono">{p.txnId}</div>
                {p.dataUrl ? (
                  <a className="mono" href={p.dataUrl} target="_blank" rel="noreferrer" download={p.fileName}>⬇ Download original</a>
                ) : (
                  <div className="muted">No preview (sample/placeholder)</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {txnId && (
        <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Linked transaction: <span className="mono">{txnId}</span>
          {txnById(txnId) ? ` — ${txnById(txnId).description}` : ""}
        </p>
      )}
    </>
  );
}
