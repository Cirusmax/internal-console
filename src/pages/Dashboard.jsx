import { useMemo } from "react";
import { useTransactions } from "../lib/useTransactions";
import { StatCard } from "../components/StatCard";
import { MonthlyChart } from "../components/MonthlyChart";
import { CategoryChart } from "../components/CategoryChart";

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "short" });

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

export function Dashboard() {
  const { transactions, loading, error } = useTransactions();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);

    let saldo = 0;
    let receitasMes = 0;
    let despesasMes = 0;

    for (const t of transactions) {
      const value = Number(t.amount);
      saldo += t.type === "receita" ? value : -value;

      if (monthKey(t.occurred_on) === currentMonthKey) {
        if (t.type === "receita") receitasMes += value;
        else despesasMes += value;
      }
    }

    return { saldo, receitasMes, despesasMes };
  }, [transactions]);

  const monthlyData = useMemo(() => {
    const now = new Date();
    const buckets = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toISOString().slice(0, 7);
      buckets.push({ key, label: MONTH_LABEL.format(d).replace(".", ""), receitas: 0, despesas: 0 });
    }
    const byKey = Object.fromEntries(buckets.map((b) => [b.key, b]));

    for (const t of transactions) {
      const key = monthKey(t.occurred_on);
      const bucket = byKey[key];
      if (!bucket) continue;
      if (t.type === "receita") bucket.receitas += Number(t.amount);
      else bucket.despesas += Number(t.amount);
    }

    return buckets;
  }, [transactions]);

  const categoryData = useMemo(() => {
    const now = new Date();
    const currentMonthKey = now.toISOString().slice(0, 7);
    const totals = {};

    for (const t of transactions) {
      if (t.type !== "despesa" || monthKey(t.occurred_on) !== currentMonthKey) continue;
      totals[t.category] = (totals[t.category] ?? 0) + Number(t.amount);
    }

    return Object.entries(totals).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral das finanças do escritório.</p>
        </div>
      </div>

      {error && <div className="form-error">Erro ao carregar dados: {error}</div>}

      {!loading && (
        <>
          <div className="stats-grid">
            <StatCard label="Saldo atual" value={stats.saldo} tone={stats.saldo >= 0 ? "positive" : "negative"} />
            <StatCard label="Receitas no mês" value={stats.receitasMes} tone="positive" />
            <StatCard label="Despesas no mês" value={stats.despesasMes} tone="negative" />
          </div>

          <div className="charts-grid">
            <div className="chart-card">
              <h3>Receitas x despesas (últimos 6 meses)</h3>
              <MonthlyChart data={monthlyData} />
            </div>
            <div className="chart-card">
              <h3>Despesas por categoria (mês atual)</h3>
              <CategoryChart data={categoryData} />
            </div>
          </div>
        </>
      )}
    </>
  );
}
