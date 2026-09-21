import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { computeState } from "./ledger.js";
import { supabase } from "./supabase.js";

const LS_USER = "ledgerlock-user";

const now = () => new Date().toISOString().slice(0, 16);

const emptyState = {
  meta: { system: "LedgerLock", version: "1.0.0", currency: "INR", txnCounter: 0 },
  users: [], transactions: [], proofs: [], earnings: [], auditEvents: [], currentUserId: null,
};

const DEFAULT_USERS = [
  { id: "A", name: "BALA PRASAN", email: "btopnexus@gmail.com", role: "PARTNER", pin: "btop@nexus" },
  { id: "B", name: "AKASH", email: "btopnexus@gmail.com", role: "PARTNER", pin: "btop@nexus" },
];

const fromTxn = (t) => ({
  id: t.id, type: t.type, amount: t.amount, fromPerson: t.from_person, toPerson: t.to_person,
  category: t.category, description: t.description, date: t.date, time: t.time,
  paymentMethod: t.payment_method, referenceNo: t.reference_no, status: t.status,
  enteredBy: t.entered_by, verifiedBy: t.verified_by, notes: t.notes,
  createdAt: t.created_at, updatedAt: t.updated_at, version: t.version,
});

const toTxn = (t) => ({
  id: t.id, type: t.type, amount: Number(t.amount), category: t.category,
  description: t.description || "", entered_by: t.enteredBy, from_person: t.fromPerson || null,
  to_person: t.toPerson || null, date: t.date, time: t.time || "00:00",
  payment_method: t.paymentMethod || null, reference_no: t.referenceNo || null,
  status: t.status, notes: t.notes || null, verified_by: t.verifiedBy || null,
  created_at: t.createdAt, updated_at: t.updatedAt, version: t.version,
});

const fromProof = (p) => ({
  id: p.id, txnId: p.txn_id, fileName: p.file_name, fileType: p.file_type,
  uploadedBy: p.uploaded_by, uploadedAt: p.uploaded_at, dataUrl: p.data_url,
});

const toProof = (p) => ({
  id: p.id, txn_id: p.txnId, file_name: p.fileName, file_type: p.fileType || null,
  uploaded_by: p.uploadedBy, uploaded_at: p.uploadedAt, data_url: p.dataUrl || null,
});

const fromAudit = (e) => ({ id: e.id, txnId: e.txn_id, actor: e.actor, action: e.action, at: e.at, previous: e.previous, next: e.next, notes: e.notes || "" });
const toAudit = (e) => ({ id: e.id, txn_id: e.txnId || null, actor: e.actor, action: e.action, at: e.at, previous: e.previous || null, next: e.next || null, notes: e.notes || null });
const fromEarning = (e) => ({ id: e.id, date: e.date, amount: e.amount, earnedBy: e.earned_by, enteredBy: e.entered_by, involved: e.involved || [], splitA: e.split_a, splitB: e.split_b, source: e.source, description: e.description, createdAt: e.created_at });
const toEarning = (e) => ({ id: e.id, date: e.date, amount: Number(e.amount), earned_by: e.earnedBy, entered_by: e.enteredBy, involved: e.involved || [], split_a: Number(e.splitA || 0), split_b: Number(e.splitB || 0), source: e.source || null, description: e.description || null, created_at: e.createdAt || new Date().toISOString() });

async function loadRemote() {
  const [meta, users, transactions, proofs, earnings, auditEvents] = await Promise.all([
    supabase.from("app_meta").select("*").maybeSingle(),
    supabase.from("app_users").select("*").order("id"),
    supabase.from("transactions").select("*").order("date", { ascending: true }).order("time", { ascending: true }),
    supabase.from("proofs").select("*"),
    supabase.from("earnings").select("*").order("date", { ascending: true }),
    supabase.from("audit_events").select("*").order("at", { ascending: true }),
  ]);
  const failed = [meta, users, transactions, proofs, earnings, auditEvents].find((result) => result.error);
  if (failed?.error) throw failed.error;
  const remoteUsers = (users.data || []).map((u) => ({ id: u.id, name: u.name, email: u.email, role: u.role, pin: u.pin }));
  if (!remoteUsers.length) {
    const { error } = await supabase.from("app_users").upsert(DEFAULT_USERS);
    if (error) throw error;
  }
  return {
    ...emptyState,
    meta: meta.data ? { ...meta.data, txnCounter: meta.data.txn_counter } : emptyState.meta,
    users: remoteUsers.length ? remoteUsers : DEFAULT_USERS,
    transactions: (transactions.data || []).map(fromTxn),
    proofs: (proofs.data || []).map(fromProof),
    earnings: (earnings.data || []).map(fromEarning),
    auditEvents: (auditEvents.data || []).map(fromAudit),
    currentUserId: localStorage.getItem(LS_USER),
  };
}

async function persist(next, action) {
  const table = (name, rows) => supabase.from(name).upsert(rows);
  if (["ADD_TXN", "EDIT_TXN", "VERIFY", "REJECT", "SUBMIT_REVIEW"].includes(action.type)) {
    const txn = next.transactions.find((t) => t.id === action.txnId || (action.type === "ADD_TXN" && t.id === next.transactions[next.transactions.length - 1].id));
    if (txn) {
      const { error } = await table("transactions", [toTxn(txn)]);
      if (error) throw error;
    }
  }
  if (action.type === "ADD_TXN" || action.type === "UPLOAD_PROOF") {
    const added = action.type === "ADD_TXN"
      ? next.proofs.filter((p) => !action.previousProofIds?.includes(p.id) && p.txnId === next.transactions[next.transactions.length - 1].id)
      : next.proofs.filter((p) => p.txnId === action.txnId).slice(-1);
    if (added.length) { const { error } = await table("proofs", added.map(toProof)); if (error) throw error; }
  }
  if (action.type !== "LOGIN" && action.type !== "LOGOUT" && action.type !== "RESET") {
    const newEvents = next.auditEvents.slice(action.previousAuditCount || 0);
    if (newEvents.length) { const { error } = await table("audit_events", newEvents.map(toAudit)); if (error) throw error; }
  }
  if (action.type === "ADD_TXN" || action.type === "UPDATE_SETTINGS") {
    const { error } = await table("app_meta", [{ id: 1, system: next.meta.system, version: next.meta.version, currency: next.meta.currency, txn_counter: next.meta.txnCounter }]);
    if (error) throw error;
  }
  if (action.type === "ADD_EARNING") {
    const earning = next.earnings[next.earnings.length - 1];
    const { error } = await table("earnings", [toEarning(earning)]);
    if (error) throw error;
  }
  if (action.type === "DELETE_EARNING") {
    const { error } = await supabase.from("earnings").delete().eq("id", action.id);
    if (error) throw error;
  }
}

async function clearRemote() {
  for (const name of ["audit_events", "proofs", "transactions", "earnings"]) {
    const { error } = await supabase.from(name).delete().not("id", "is", null);
    if (error && name !== "earnings") throw error;
  }
  const { error } = await supabase.from("app_meta").upsert([{ id: 1, system: "LedgerLock", version: "1.0.0", currency: "INR", txn_counter: 0 }]);
  if (error) throw error;
}

function audit(state, txnId, actor, action, previous, next, notes) {
  const evt = {
    id: `EVT-${String(state.auditEvents.length + 1).padStart(4, "0")}`,
    txnId, actor, action, at: now(), previous: previous || null, next: next || null, notes: notes || "",
  };
  return { ...state, auditEvents: [...state.auditEvents, evt] };
}

function nextTxnId(meta) {
  const n = (meta.txnCounter || 0) + 1;
  return { id: `TXN-${String(n).padStart(6, "0")}`, counter: n };
}

function reducer(state, action) {
  switch (action.type) {
    case "LOGIN":
      return { ...state, currentUserId: action.userId };
    case "LOGOUT":
      return { ...state, currentUserId: null };

    case "ADD_TXN": {
      const { id, counter } = nextTxnId(state.meta);
      const t = {
        ...action.txn, id, status: "PENDING", verifiedBy: null,
        createdAt: now(), updatedAt: now(), version: 1,
      };
      let s = { ...state, transactions: [...state.transactions, t], meta: { ...state.meta, txnCounter: counter } };
      s = audit(s, id, t.enteredBy, "CREATED", null, { status: "PENDING", amount: t.amount }, "Transaction entered");
      if (action.proofs?.length) {
        const proofs = action.proofs.map((p, i) => ({
          id: `PRF-${String(state.proofs.length + i + 1).padStart(4, "0")}`,
          txnId: id, uploadedBy: t.enteredBy, uploadedAt: now(), ...p,
        }));
        s = { ...s, proofs: [...s.proofs, ...proofs] };
        s = audit(s, id, t.enteredBy, "PROOF_UPLOADED", { status: "PENDING" }, { status: "PROOF_UPLOADED" }, `${proofs.length} proof(s) attached at entry`);
        s = {
          ...s,
          transactions: s.transactions.map((x) => (x.id === id ? { ...x, status: "PROOF_UPLOADED", updatedAt: now() } : x)),
        };
      }
      return s;
    }

    case "UPLOAD_PROOF": {
      const { txnId, proof } = action;
      const p = {
        id: `PRF-${String(state.proofs.length + 1).padStart(4, "0")}`,
        txnId, uploadedBy: proof.uploadedBy, uploadedAt: now(), ...proof,
      };
      let s = { ...state, proofs: [...state.proofs, p] };
      const txn = s.transactions.find((t) => t.id === txnId);
      if (txn && txn.status === "PENDING") {
        s = { ...s, transactions: s.transactions.map((t) => (t.id === txnId ? { ...t, status: "PROOF_UPLOADED", updatedAt: now() } : t)) };
        s = audit(s, txnId, proof.uploadedBy, "PROOF_UPLOADED", { status: "PENDING" }, { status: "PROOF_UPLOADED" }, "Proof attached");
      } else {
        s = audit(s, txnId, proof.uploadedBy, "PROOF_UPLOADED", { status: txn?.status }, { status: txn?.status }, "Additional proof attached");
      }
      return s;
    }

    case "SUBMIT_REVIEW": {
      const txn = state.transactions.find((t) => t.id === action.txnId);
      if (!txn || txn.status === "VERIFIED" || txn.status === "REJECTED") return state;
      let s = { ...state, transactions: state.transactions.map((t) => (t.id === action.txnId ? { ...t, status: "UNDER_REVIEW", updatedAt: now() } : t)) };
      s = audit(s, action.txnId, action.actor, "STATUS_CHANGED", { status: txn.status }, { status: "UNDER_REVIEW" }, action.notes || "Moved to under review");
      return s;
    }

    case "VERIFY": {
      const txn = state.transactions.find((t) => t.id === action.txnId);
      // RULE: the person who entered a transaction can NEVER verify their own entry.
      if (!txn || txn.enteredBy === action.actor) return state;
      if (txn.status === "VERIFIED" || txn.status === "REJECTED") return state;
      let s = { ...state, transactions: state.transactions.map((t) => (t.id === action.txnId ? { ...t, status: "VERIFIED", verifiedBy: action.actor, updatedAt: now() } : t)) };
      s = audit(s, action.txnId, action.actor, "VERIFIED", { status: txn.status }, { status: "VERIFIED" }, action.notes || "Verified against proof and records");
      return s;
    }

    case "REJECT": {
      const txn = state.transactions.find((t) => t.id === action.txnId);
      if (!txn || txn.status === "VERIFIED" || txn.status === "REJECTED") return state;
      if (!action.reason?.trim()) return state; // rejection reason is mandatory
      let s = { ...state, transactions: state.transactions.map((t) => (t.id === action.txnId ? { ...t, status: "REJECTED", updatedAt: now() } : t)) };
      s = audit(s, action.txnId, action.actor, "REJECTED", { status: txn.status }, { status: "REJECTED" }, `Reason: ${action.reason}`);
      return s;
    }

    case "EDIT_TXN": {
      const txn = state.transactions.find((t) => t.id === action.txnId);
      if (!txn) return state;
      if (txn.status === "VERIFIED") return state; // verified records are immutable
      const changed = {};
      Object.keys(action.changes).forEach((k) => {
        if (String(txn[k]) !== String(action.changes[k])) changed[k] = { from: txn[k], to: action.changes[k] };
      });
      const updated = { ...txn, ...action.changes, version: txn.version + 1, updatedAt: now() };
      let s = { ...state, transactions: state.transactions.map((t) => (t.id === action.txnId ? updated : t)) };
      s = audit(s, action.txnId, action.actor, "UPDATED", { snapshot: txn, changed }, { snapshot: updated }, action.notes || "Transaction edited");
      return s;
    }

    case "UPDATE_SETTINGS":
      return { ...state, meta: { ...state.meta, ...action.patch } };

    case "ADD_EARNING":
      return { ...state, earnings: [...state.earnings, { ...action.earning, id: action.earning.id || `ERN-${Date.now()}`, createdAt: new Date().toISOString() }] };

    case "DELETE_EARNING":
      return { ...state, earnings: state.earnings.filter((earning) => earning.id !== action.id) };

    case "RESET":
      return { ...emptyState, users: state.users, currentUserId: state.currentUserId };

    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    loadRemote().then(setState).catch((e) => setError(e.message || "Unable to load Supabase data.")).finally(() => setLoading(false));
  }, []);

  const dispatch = async (action) => {
    const previous = state;
    const enriched = { ...action, previousAuditCount: previous.auditEvents.length, previousProofIds: previous.proofs.map((p) => p.id) };
    const next = reducer(previous, enriched);
    setState(next);
    try {
      if (action.type === "LOGIN") localStorage.setItem(LS_USER, action.userId);
      if (action.type === "LOGOUT") localStorage.removeItem(LS_USER);
      if (action.type === "RESET") await clearRemote();
      else await persist(next, enriched);
    } catch (e) {
      setError(e.message || "Unable to save to Supabase.");
      setState(previous);
    }
  };

  const currentUser = state.users.find((u) => u.id === state.currentUserId) || null;
  const derived = useMemo(() => computeState(state.transactions, state.proofs), [state.transactions, state.proofs]);

  const value = {
    state, dispatch, currentUser, derived, loading, error,
    users: state.users,
    txnById: (id) => state.transactions.find((t) => t.id === id),
    proofsFor: (txnId) => state.proofs.filter((p) => p.txnId === txnId),
    auditFor: (txnId) => state.auditEvents.filter((e) => e.txnId === txnId),
  };
  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  return useContext(StoreCtx);
}
