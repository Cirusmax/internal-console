import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { isSupabaseConfigured } from "../lib/supabaseClient";
import logo from "../assets/logo.png";

export function Login() {
  const { user, signIn, signUp } = useAuth();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const action = mode === "signin" ? signIn : signUp;
    const { error: authError } = await action(email, password);

    if (authError) {
      setError(authError.message);
    } else if (mode === "signup") {
      setInfo("Conta criada! Verifique seu email para confirmar o acesso, se necessário, e faça login.");
      setMode("signin");
    }
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-card__brand">
          <img src={logo} alt="Almeida Advocacia" />
          <span>Finanças</span>
        </div>

        <h1 style={{ fontSize: "1.3rem" }}>{mode === "signin" ? "Entrar" : "Criar conta"}</h1>
        <p style={{ marginBottom: "1.2em" }}>
          {mode === "signin" ? "Acesse o controle financeiro do escritório." : "Crie seu acesso ao sistema."}
        </p>

        {!isSupabaseConfigured && (
          <div className="form-error">
            Supabase ainda não configurado. Preencha <code>.env.local</code> com as chaves do seu projeto (veja o README) antes de criar conta ou entrar.
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        {info && <div className="form-error" style={{ background: "var(--periwinkle-light)", color: "var(--navy)" }}>{info}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-field">
            <label htmlFor="password">Senha</label>
            <input
              id="password"
              type="password"
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? "Aguarde..." : mode === "signin" ? "Entrar" : "Criar conta"}
          </button>
        </form>

        <div className="login-toggle">
          {mode === "signin" ? (
            <>
              <span>Ainda não tem acesso?</span>
              <button onClick={() => setMode("signup")}>Criar conta</button>
            </>
          ) : (
            <>
              <span>Já tem conta?</span>
              <button onClick={() => setMode("signin")}>Entrar</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
