import { useMemo, useState } from "react";
import { useTransactions } from "../lib/useTransactions";
import { useAuth } from "../contexts/AuthContext";
import { TransactionsTable } from "../components/TransactionsTable";
import { TransactionModal } from "../components/TransactionModal";
import { ConfirmDeleteModal } from "../components/ConfirmDeleteModal";
import { generateMovementsReportPdf } from "../lib/generateReportPdf";

const monthLabelFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function formatPeriodLabel(monthFilter, typeFilter) {
  let label = "Todos os lançamentos";
  if (monthFilter) {
    const [year, month] = monthFilter.split("-").map(Number);
    label = monthLabelFormatter.format(new Date(year, month - 1, 1));
  }
  if (typeFilter === "receita") label += " — apenas receitas";
  else if (typeFilter === "despesa") label += " — apenas despesas";
  return label;
}

export function Lancamentos() {
  const { user } = useAuth();
  const { transactions, loading, error, addTransaction, updateTransaction, deleteTransaction } = useTransactions();
  const [typeFilter, setTypeFilter] = useState("todos");
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [modalState, setModalState] = useState(null); // null | { mode: 'new' } | { mode: 'edit', transaction }
  const [pendingDelete, setPendingDelete] = useState(null);

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
      await addTransaction(payload);
    }
  };

  const handleConfirmDelete = async () => {
    await deleteTransaction(pendingDelete.id);
    setPendingDelete(null);
  };

  const handleExportPdf = () => {
    generateMovementsReportPdf({
      transactions: filtered,
      periodLabel: formatPeriodLabel(monthFilter, typeFilter),
    });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Lançamentos</h1>
          <p>Receitas e despesas do escritório.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn--ghost" onClick={handleExportPdf} disabled={filtered.length === 0}>
            Exportar PDF
          </button>
          <button className="btn btn--primary" onClick={() => setModalState({ mode: "new" })}>
            + Novo lançamento
          </button>
        </div>
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
          onDelete={(t) => setPendingDelete(t)}
        />
      )}

      {modalState && (
        <TransactionModal
          initial={modalState.mode === "edit" ? modalState.transaction : null}
          onSave={handleSave}
          onClose={() => setModalState(null)}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          transaction={pendingDelete}
          isOwnEntry={pendingDelete.user_id === user.id}
          onConfirm={handleConfirmDelete}
          onClose={() => setPendingDelete(null)}
        />
      )}
    </>
  );
}
