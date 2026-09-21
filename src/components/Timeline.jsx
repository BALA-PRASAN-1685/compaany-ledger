import Badge, { STATUS_LABEL } from "./Badge.jsx";

function Diff({ previous, next }) {
  if (!previous && !next) return null;
  const prev = previous?.snapshot || previous;
  const nxt = next?.snapshot || next;
  const keys = prev && nxt
    ? Object.keys(nxt).filter((k) => ["status", "amount", "category", "description", "paymentMethod", "referenceNo", "date", "time", "fromPerson", "toPerson", "type"].includes(k) && String(prev[k]) !== String(nxt[k]))
    : Object.keys(nxt || {}).filter((k) => k === "status" || k === "amount");
  if (!keys.length && previous?.changed) {
    return (
      <div className="tl-diff">
        {Object.entries(previous.changed).map(([k, v]) => (
          <div key={k}><b>{k}:</b> <del>{String(v.from)}</del> → <ins>{String(v.to)}</ins></div>
        ))}
      </div>
    );
  }
  if (!keys.length) return null;
  return (
    <div className="tl-diff">
      {keys.map((k) => (
        <div key={k}>
          <b>{k}:</b>{" "}
          {prev && <del>{k === "status" && prev[k] ? STATUS_LABEL[prev[k]] : String(prev[k])}</del>}
          {prev && " → "}
          <ins>{k === "status" && nxt[k] ? STATUS_LABEL[nxt[k]] : String(nxt[k])}</ins>
        </div>
      ))}
    </div>
  );
}

export default function Timeline({ events }) {
  if (!events.length) return <p className="muted">No audit events yet.</p>;
  return (
    <div className="timeline">
      {events.map((e) => (
        <div key={e.id} className={`tl-item ${String(e.next?.status || e.next?.snapshot?.status || "").toLowerCase()}`}>
          <div className="tl-title">
            {e.action.replace(/_/g, " ")} — Person {e.actor}
          </div>
          <div className="tl-meta">
            {new Date(e.at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {e.id}
            {e.next?.status || e.next?.snapshot?.status ? (
              <> · <Badge kind={e.next.status || e.next.snapshot.status}>{STATUS_LABEL[e.next.status || e.next.snapshot.status]}</Badge></>
            ) : null}
          </div>
          {e.notes && <div className="tl-meta" style={{ marginTop: 4, color: "#334155" }}>📝 {e.notes}</div>}
          <Diff previous={e.previous} next={e.next} />
        </div>
      ))}
    </div>
  );
}
