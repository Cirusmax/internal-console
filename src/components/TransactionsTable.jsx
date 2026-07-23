const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

export function TransactionsTable({ transactions, onEdit, onDelete }) {
  if (!transactions.length) {
    return <div className="empty-state">Nenhum lançamento encontrado para este filtro.</div>;
  }

  return (
    <table className="transactions-table">
      <thead>
        <tr>
          <th>Data</th>
          <th>Tipo</th>
          <th>Categoria</th>
          <th>Descrição</th>
          <th>Valor</th>
          <th>Criado por</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {transactions.map((t) => (
          <tr key={t.id}>
            <td>{dateFormatter.format(new Date(`${t.occurred_on}T00:00:00`))}</td>
            <td>
              <span className={`badge badge--${t.type}`}>{t.type === "receita" ? "Receita" : "Despesa"}</span>
            </td>
            <td>
              {t.category}
              {t.recurring_rule_id && (
                <span className="badge badge--recorrente" style={{ marginLeft: 8 }}>
                  Recorrente
                </span>
              )}
            </td>
            <td>{t.description || "—"}</td>
            <td className={`amount--${t.type}`}>
              {t.type === "despesa" ? "-" : "+"}
              {currencyFormatter.format(t.amount)}
            </td>
            <td title={t.created_by_email || ""}>{(t.created_by_email || "—").split("@")[0]}</td>
            <td>
              <div className="row-actions">
                <button className="icon-btn" aria-label="Editar" onClick={() => onEdit(t)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </button>
                <button className="icon-btn" aria-label="Excluir" onClick={() => onDelete(t)}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
