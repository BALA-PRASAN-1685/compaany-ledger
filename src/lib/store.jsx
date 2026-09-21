import React, { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import seed from "./seed.json";
import { computeState } from "./ledger.js";

const LS_KEY = "ledgerlock-state-v1";
const LS_USER = "ledgerlock-user";

function load() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* corrupted -> reseed */ }
  return JSON.parse(JSON.stringify(seed));
}

const now = () => new Date().toISOString().slice(0, 16);

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

    case "RESET":
      localStorage.removeItem(LS_KEY);
      return JSON.parse(JSON.stringify(seed));

    default:
      return state;
  }
}

const StoreCtx = createContext(null);

export function StoreProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, undefined, load);

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  }, [state]);

  const currentUser = state.users.find((u) => u.id === state.currentUserId) || null;
  const derived = useMemo(() => computeState(state.transactions, state.proofs), [state.transactions, state.proofs]);

  const value = {
    state, dispatch, currentUser, derived,
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
