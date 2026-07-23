import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function MonthlyChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">Sem lançamentos suficientes para exibir o gráfico ainda.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ left: 4, right: 4 }}>
        <CartesianGrid stroke="#e2e2e0" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: "#5b6472" }} axisLine={{ stroke: "#e2e2e0" }} tickLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#5b6472" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v) => currencyFormatter.format(v).replace("R$", "R$ ")}
          width={90}
        />
        <Tooltip formatter={(value) => currencyFormatter.format(value)} />
        <Legend />
        <Bar dataKey="receitas" name="Receitas" fill="#788abd" radius={[6, 6, 0, 0]} />
        <Bar dataKey="despesas" name="Despesas" fill="#e05d5d" radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
