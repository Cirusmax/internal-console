import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const COLORS = ["#1c2b41", "#788abd", "#e05d5d", "#26c281", "#f5b301", "#5b6472"];

export function CategoryChart({ data }) {
  if (!data.length) {
    return <div className="chart-empty">Nenhuma despesa registrada neste mês.</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={280}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(value) => currencyFormatter.format(value)} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
