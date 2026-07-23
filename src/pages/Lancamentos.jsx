import { useMemo, useState } from "react";
import { useTransactions } from "../lib/useTransactions";
import { useAuth } from "../contexts/AuthContext";
import { TransactionsTable } from "../components/TransactionsTable";
import { TransactionModal } from "../components/TransactionModal";

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

export function Lancamentos() {
  const { user } = useAuth();
  const { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [typeFilter, setTypeFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [modalState, setModalState] = useState(null); // null | { mode: 'new' } | { mode: 'edit', transaction }

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (typeFilter !== "todos" && t.type !== typeFilter) return false;
      if (monthFilter && monthKey(t.occurred_on) !== monthFilter) return false;
      return true;
    });
  }, [transactions, typeFilter, monthFilter]);

  const handleSave = async (payload) => {
    if (modalState?.mode === "edit") {
      await updateTransaction(modalState.transaction.id, payload);
    } else {
      await addTransaction({ ...payload, user_id: user.id });
    }
  };

  const handleDelete = async (transaction) => {
    if (window.confirm("Excluir este lançamento?")) {
      await deleteTransaction(transaction.id);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Lançamentos</h1>
          <p>Receitas e despesas do escritório.</p>
        </div>
        <button className="btn btn--primary" onClick={() => setModalState({ mode: "new" })}>
          + Novo lançamento
        </button>
      </div>

      {error && <div className="form-error">Erro ao carregar dados: {error}</div>}

      <div className="table-toolbar">
        <div className="table-filters">
          <input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} />
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="todos">Todos os tipos</option>
            <option value="receita">Receitas</option>
            <option value="despesa">Despesas</option>
          </select>
        </div>
      </div>

      {!loading && (
        <TransactionsTable
          transactions={filtered}
          onEdit={(t) => setModalState({ mode: "edit", transaction: t })}
          onDelete={handleDelete}
        />
      )}

      {modalState && (
        <TransactionModal
          initial={modalState.mode === "edit" ? modalState.transaction : null}
          onSave={handleSave}
          onClose={() => setModalState(null)}
        />
      )}
    </>
  );
}
