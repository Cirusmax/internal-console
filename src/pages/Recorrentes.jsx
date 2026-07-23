import { useState } from "react";
import { useRecurringRules } from "../lib/useRecurringRules";
import { RecurringRuleModal } from "../components/RecurringRuleModal";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function Recorrentes() {
  const { rules, loading, error, addRule, updateRule, deleteRule } = useRecurringRules();
  const [modalState, setModalState] = useState(null);

  const handleSave = async (payload) => {
    if (modalState?.mode === "edit") {
      await updateRule(modalState.rule.id, payload);
    } else {
      await addRule(payload);
    }
  };

  const handleToggleActive = async (rule) => {
    await updateRule(rule.id, { active: !rule.active });
  };

  const handleDelete = async (rule) => {
    if (window.confirm("Excluir esta regra recorrente? Lançamentos já gerados não são apagados.")) {
      await deleteRule(rule.id);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Recorrentes</h1>
          <p>Receitas e despesas fixas, geradas automaticamente todo mês.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModalState({ mode: "new" })}>
          + Nova recorrência
        </button>
      </div>

      {error && <div className="form-error">Erro ao carregar dados: {error}</div>}

      {!loading &&
        (rules.length === 0 ? (
          <div className="empty-state">Nenhuma recorrência cadastrada ainda.</div>
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Categoria</th>
                <th>Descrição</th>
                <th>Valor</th>
                <th>Dia do mês</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rules.map((rule) => (
                <tr key={rule.id}>
                  <td>
                    <span className={`badge badge--${rule.type}`}>
                      {rule.type === "receita" ? "Receita" : "Despesa"}
                    </span>
                  </td>
                  <td>{rule.category}</td>
                  <td>{rule.description || "—"}</td>
                  <td className={`amount--${rule.type}`}>
                    {rule.type === "despesa" ? "-" : "+"}
                    {currencyFormatter.format(rule.amount)}
                  </td>
                  <td>Dia {rule.day_of_month}</td>
                  <td>
                    <button
                      className="btn btn--ghost btn--sm"
                      onClick={() => handleToggleActive(rule)}
                      title="Clique para alternar"
                    >
                      {rule.active ? "Ativa" : "Inativa"}
                    </button>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button
                        className="icon-btn"
                        aria-label="Editar"
                        onClick={() => setModalState({ mode: "edit", rule })}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button className="icon-btn" aria-label="Excluir" onClick={() => handleDelete(rule)}>
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
        ))}

      {modalState && (
        <RecurringRuleModal
          initial={modalState.mode === "edit" ? modalState.rule : null}
          onSave={handleSave}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}
