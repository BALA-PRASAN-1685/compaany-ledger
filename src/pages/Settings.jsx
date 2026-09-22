import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.jsx";

export default function Settings() {
  const { state, currentUser, dispatch } = useStore();
  const nav = useNavigate();
  const [userId, setUserId] = useState("A");
  const [email, setEmail] = useState("btopnexus@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  const login = (e) => {
    e.preventDefault();
    const u = state.users.find((x) => x.id === userId);
    if (!u) return setError("Selected account not found.");
    if (u.email.toLowerCase() !== email.trim().toLowerCase() || u.pin !== password) {
      return setError("Invalid email or password. Use the selected account and password: btop@nexus");
    }
    dispatch({ type: "LOGIN", userId: u.id });
    nav("/");
  };

  return (
    <>
      <h1 className="page-title">Settings & Authentication</h1>
          <p className="page-sub">Shared records are loaded from Supabase. Transactions and audit history are stored remotely for both partners.</p>

      <div className="cards" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
        <div className="panel">
          <h3>{currentUser ? `Signed in as ${currentUser.name}` : "Sign in"}</h3>
          {currentUser ? (
            <div className="btn-row">
              <button className="btn secondary" onClick={() => { dispatch({ type: "LOGOUT" }); }}>Sign out</button>
            </div>
          ) : (
            <form onSubmit={login} className="grid" style={{ gridTemplateColumns: "1fr" }}>
              {error && <div className="warn-box">{error}</div>}
              <div className="field">
                <label>User</label>
                <select value={userId} onChange={(e) => setUserId(e.target.value)}>
                  {state.users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                </select>
              </div>
              <div className="field">
                <label>Email</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="btopnexus@gmail.com" />
              </div>
              <div className="field">
                <label>Password</label>
                <div className="password-control">
                  <input type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter a password" />
                  <button className="btn secondary small" type="button" onClick={() => setShowPassword((visible) => !visible)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <button className="btn" type="submit">Sign in</button>
            </form>
          )}
        </div>

        <div className="panel">
          <h3>Users & roles</h3>
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Role</th></tr></thead>
            <tbody>{state.users.map((u) => <tr key={u.id}><td className="mono">{u.id}</td><td>{u.name}</td><td>{u.role}</td></tr>)}</tbody>
          </table>
          <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
            Both partners can enter transactions; only the partner who did <b>not</b> enter a transaction can verify it.
            Verified transactions are immutable and can never be deleted.
          </p>
        </div>

        <div className="panel">
          <h3>Data</h3>
          <p className="muted" style={{ fontSize: 13 }}>
            Transactions, proofs, earnings, and audit events persist in the connected Supabase project. The reset action permanently deletes shared records.
          </p>
          <div className="btn-row">
            {!confirmReset ? (
              <button className="btn danger" onClick={() => setConfirmReset(true)}>Erase all shared records</button>
            ) : (
              <>
                <button className="btn danger" onClick={() => { dispatch({ type: "RESET" }); setConfirmReset(false); }}>
                  Yes — permanently erase records
                </button>
                <button className="btn secondary" onClick={() => setConfirmReset(false)}>Cancel</button>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
