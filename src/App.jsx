import { HashRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Sidebar } from "./components/Sidebar";
import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { Lancamentos } from "./pages/Lancamentos";

function AppLayout({ children }) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">{children}</main>
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
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Dashboard />
                </AppLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/lancamentos"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Lancamentos />
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  );
}
