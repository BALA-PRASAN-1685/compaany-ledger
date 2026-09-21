import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Transactions from "./pages/Transactions.jsx";
import AddTransaction from "./pages/AddTransaction.jsx";
import TransactionDetail from "./pages/TransactionDetail.jsx";
import Investments from "./pages/Investments.jsx";
import Returns from "./pages/Returns.jsx";
import AuditLogs from "./pages/AuditLogs.jsx";
import ProofDocuments from "./pages/ProofDocuments.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";
import { useStore } from "./lib/store.jsx";

function RequireAuth({ children }) {
  const { currentUser } = useStore();
  if (!currentUser) return <Navigate to="/settings" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/settings" element={<Settings />} />
      <Route
        element={
          <RequireAuth>
            <Layout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/new" element={<AddTransaction />} />
        <Route path="/transactions/:id" element={<TransactionDetail />} />
        <Route path="/investments" element={<Investments />} />
        <Route path="/returns" element={<Returns />} />
        <Route path="/audit" element={<AuditLogs />} />
        <Route path="/proofs" element={<ProofDocuments />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
