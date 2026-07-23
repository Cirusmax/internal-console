const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function StatCard({ label, value, tone }) {
  const toneClass = tone ? `stat-card--${tone}` : "";
  return (
    <div className={`stat-card ${toneClass}`}>
      <div className="stat-card__label">{label}</div>
      <div className="stat-card__value">{formatter.format(value ?? 0)}</div>
    </div>
  );
}
