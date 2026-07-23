import { useActivityLog } from "../lib/useActivityLog";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateTimeFormatter = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ACTION_LABEL = {
  created: "Criou",
  updated: "Editou",
  deleted: "Excluiu",
};

export function Atividade() {
  const { entries, loading, error } = useActivityLog();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Atividade</h1>
          <p>Histórico de criações, edições e exclusões de lançamentos.</p>
        </div>
      </div>

      {error && <div className="form-error">Erro ao carregar dados: {error}</div>}

      {!loading &&
        (entries.length === 0 ? (
          <div className="empty-state">Nenhuma atividade registrada ainda.</div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Quando</th>
                <th>Ação</th>
                <th>Quem</th>
                <th>Lançamento</th>
                <th>Valor</th>
                <th>Criado por (original)</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td>{dateTimeFormatter.format(new Date(entry.occurred_at))}</td>
                  <td>
                    <span className={`badge badge--${entry.action === "deleted" ? "despesa" : "receita"}`}>
                      {ACTION_LABEL[entry.action] ?? entry.action}
                    </span>
                  </td>
                  <td title={entry.actor_email || ""}>{(entry.actor_email || "—").split("@")[0]}</td>
                  <td>
                    {entry.category}
                    {entry.description ? ` — ${entry.description}` : ""}
                  </td>
                  <td className={`amount--${entry.type}`}>
                    {entry.type === "despesa" ? "-" : "+"}
                    {currencyFormatter.format(entry.amount)}
                  </td>
                  <td title={entry.created_by_email || ""}>
                    {(entry.created_by_email || "—").split("@")[0]}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ))}
    </>
  );
}
