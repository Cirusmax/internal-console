import { useMemo, useState } from "react";
import { useTransactions } from "../lib/useTransactions";
import { useClientCharges } from "../lib/useClientCharges";
import { StatCard } from "../components/StatCard";
import { MonthlyChart } from "../components/MonthlyChart";
import { CategoryChart } from "../components/CategoryChart";
import { generateMovementsReportPdf } from "../lib/generateReportPdf";

const MONTH_LABEL = new Intl.DateTimeFormat("pt-BR", { month: "short" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

function monthKey(dateStr) {
  return dateStr.slice(0, 7); // YYYY-MM
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

export function Dashboard() {
  const { transactions, loading, error } = useTransactions();
  const { installments } = useClientCharges();

  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(todayStr());
  const [allTime, setAllTime] = useState(false);

  const aReceber = useMemo(
    () => installments.filter((i) => !i.paid).reduce((sum, i) => sum + Number(i.amount), 0),
    [installments]
  );

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

  const reportTransactions = useMemo(() => {
    if (allTime) return transactions;
    return transactions.filter((t) => t.occurred_on >= startDate && t.occurred_on <= endDate);
  }, [transactions, allTime, startDate, endDate]);

  const handleExportPdf = () => {
    const periodLabel = allTime
      ? "Todo o período"
      : `${dateFormatter.format(new Date(`${startDate}T00:00:00`))} a ${dateFormatter.format(
          new Date(`${endDate}T00:00:00`)
        )}`;
    generateMovementsReportPdf({ transactions: reportTransactions, periodLabel });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Visão geral das finanças do escritório.</p>
        </div>
      </div>

      {error && <div className="form-error">Erro ao carregar dados: {error}</div>}

      <div className="chart-card" style={{ marginBottom: 32 }}>
        <h3>Relatório de movimentações</h3>
        <div className="table-toolbar" style={{ marginBottom: 0 }}>
          <div className="table-filters">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              disabled={allTime}
            />
            <span style={{ alignSelf: "center", color: "var(--text-soft)" }}>até</span>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} disabled={allTime} />
            <label className="checkbox">
              <input type="checkbox" checked={allTime} onChange={(e) => setAllTime(e.target.checked)} />
              <span>Todo o período</span>
            </label>
          </div>
          <button className="btn btn--primary" onClick={handleExportPdf} disabled={reportTransactions.length === 0}>
            Exportar PDF
          </button>
        </div>
      </div>

      {!loading && (
        <>
          <div className="stats-grid">
            <StatCard label="Saldo atual" value={stats.saldo} tone={stats.saldo >= 0 ? "positive" : "negative"} />
            <StatCard label="Receitas no mês" value={stats.receitasMes} tone="positive" />
            <StatCard label="Despesas no mês" value={stats.despesasMes} tone="negative" />
            <StatCard label="A receber (clientes)" value={aReceber} />
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
