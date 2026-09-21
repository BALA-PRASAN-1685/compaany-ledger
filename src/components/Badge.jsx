export const STATUS_LABEL = {
  PENDING: "Pending",
  PROOF_UPLOADED: "Proof Uploaded",
  UNDER_REVIEW: "Under Review",
  VERIFIED: "Verified",
  REJECTED: "Rejected",
};

export default function Badge({ kind, children }) {
  return <span className={`badge ${String(kind).toLowerCase()}`}>{children}</span>;
}
