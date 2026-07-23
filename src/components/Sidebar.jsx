import { NavLink } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import logo from "../assets/logo.png";

export function Sidebar() {
  const { user, signOut } = useAuth();

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <img src={logo} alt="Almeida Advocacia" />
        <span>Finanças</span>
      </div>

      <nav className="sidebar__nav">
        <NavLink to="/" end className={({ isActive }) => (isActive ? "active" : "")}>
          Dashboard
        </NavLink>
        <NavLink to="/lancamentos" className={({ isActive }) => (isActive ? "active" : "")}>
          Lançamentos
        </NavLink>
      </nav>

      <div className="sidebar__footer">
        <p className="sidebar__user">{user?.email}</p>
        <button className="btn btn--ghost btn--sm btn--block" onClick={() => signOut()}>
          Sair
        </button>
      </div>
    </aside>
  );
}
