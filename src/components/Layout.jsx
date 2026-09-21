import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useStore } from "../lib/store.jsx";

const NAV = [
  ["/", "Dashboard"],
  ["/transactions", "Transactions"],
  ["/transactions/new", "Add Transaction"],
  ["/investments", "Investments"],
  ["/returns", "Returns / Profit"],
  ["/audit", "Audit Logs"],
  ["/proofs", "Proof Documents"],
  ["/reports", "Reports"],
  ["/settings", "Settings"],
];

export default function Layout() {
  const { currentUser, dispatch } = useStore();
  const nav = useNavigate();
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">🔒 LedgerLock</div>
        <nav>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              {label}
            </NavLink>
          ))}
        </nav>
        {currentUser && (
          <div className="user-chip">
            <b>{currentUser.name}</b> ({currentUser.role})
            <div style={{ marginTop: 6 }}>
              <button
                className="btn secondary small"
                onClick={() => { dispatch({ type: "LOGOUT" }); nav("/settings"); }}
              >
                Switch user
              </button>
            </div>
          </div>
        )}
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
