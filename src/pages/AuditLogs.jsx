import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useStore } from "../lib/store.jsx";
import Badge from "../components/Badge.jsx";

export default function AuditLogs() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const [actor, setActor] = useState("");
  const [action, setAction] = useState("");

  const rows = useMemo(() => {
    return state.auditEvents
      .filter((e) => {
        if (actor && e.actor !== actor) return false;
        if (action && e.action !== action) return false;
        if (q) {
          const hay = [e.id, e.txnId, e.action, e.notes, e.actor].join(" ").toLowerCase();
          if (!hay.includes(q.toLowerCase())) return false;
        }
        return true;
      })
      .sort((a, b) => b.at.localeCompare(a.at));
  }, [state.auditEvents, q, actor, action]);

  return (
    <>
      <h1 className="page-title">Audit Logs</h1>
      <p className="page-sub">Immutable history: {rows.length} events · edits preserve previous values, nothing is silently overwritten.</p>

      <div className="panel">
        <div className="filters" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
          <input placeholder="🔍 Search audit events…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={actor} onChange={(e) => setActor(e.target.value)}>
            <option value="">Actor (any)</option><option value="A">Person A</option><option value="B">Person B</option>
          </select>
          <select value={action} onChange={(e) => setAction(e.target.value)}>
            <option value="">Action (any)</option>
            {["CREATED", "UPDATED", "PROOF_UPLOADED", "STATUS_CHANGED", "VERIFIED", "REJECTED"].map((a) => <option key={a}>{a}</option>)}
          </select>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table>
            <thead><tr><th>Event</th><th>Transaction</th><th>Action</th><th>Actor</th><th>When</th><th>Change</th><th>Notes</th></tr></thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.id}>
                  <td className="mono">{e.id}</td>
                  <td className="mono"><Link to={`/transactions/${e.txnId}`}>{e.txnId}</Link></td>
                  <td><Badge kind={e.action === "VERIFIED" ? "VERIFIED" : e.action === "REJECTED" ? "REJECTED" : "neutral"}>{e.action}</Badge></td>
                  <td>Person {e.actor}</td>
                  <td className="mono">{new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
                  <td className="mono" style={{ fontSize: 12 }}>
                    {e.previous?.status && e.next?.status && e.previous.status !== e.next.status
                      ? `${e.previous.status} → ${e.next.status}`
                      : e.previous?.changed
                        ? Object.keys(e.previous.changed).join(", ") + " edited"
                        : "—"}
                  </td>
                  <td>{e.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
