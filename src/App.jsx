import { useEffect, useRef } from "react";
import { HashRouter, Outlet, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Lancamentos } from "./pages/Lancamentos";
import { Recorrentes } from "./pages/Recorrentes";
import { Atividade } from "./pages/Atividade";
import { Clientes } from "./pages/Clientes";
import { Backup } from "./pages/Backup";
import { generateRecurringTransactions } from "./lib/generateRecurringTransactions";
import { ReleaseAnnouncement } from "./components/ReleaseAnnouncement";

function AppLayout() {
  const hasGenerated = useRef(false);

  useEffect(() => {
    if (hasGenerated.current) return;
    hasGenerated.current = true;
    generateRecurringTransactions();
  }, []);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        <Outlet />
      </main>
      <ReleaseAnnouncement />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancamentos" element={<Lancamentos />} />
            <Route path="/clientes" element={<Clientes />} />
            <Route path="/recorrentes" element={<Recorrentes />} />
            <Route path="/atividade" element={<Atividade />} />
            <Route path="/backup" element={<Backup />} />
          </Route>
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
