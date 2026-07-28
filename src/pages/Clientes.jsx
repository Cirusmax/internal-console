import { useState } from "react";
import { useClients } from "../lib/useClients";
import { useClientCharges } from "../lib/useClientCharges";
import { ClientModal } from "../components/ClientModal";
import { ChargeModal } from "../components/ChargeModal";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const todayStr = () => new Date().toISOString().slice(0, 10);

export function Clientes() {
  const { clients, loading: clientsLoading, error: clientsError, addClient } = useClients();
  const {
    installments,
    loading: installmentsLoading,
    error: installmentsError,
    addCharge,
    markPaid,
    unmarkPaid,
  } = useClientCharges();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const handleMarkPaid = async (id) => {
    setBusyId(id);
    try {
      await markPaid(id);
    } finally {
      setBusyId(null);
    }
  };

  const handleUnmarkPaid = async (id) => {
    if (!window.confirm("Desfazer o pagamento? O lançamento de receita vinculado será removido.")) return;
    setBusyId(id);
    try {
      await unmarkPaid(id);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Clientes</h1>
          <p>Contratos parcelados e valores que ainda vão cair.</p>
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn--ghost" onClick={() => setClientModalOpen(true)}>
            + Novo cliente
          </button>
          <button
            className="btn btn--primary"
            onClick={() => setChargeModalOpen(true)}
            disabled={clients.length === 0}
          >
            + Nova cobrança
          </button>
        </div>
      </div>

      {clientsError && <div className="form-error">Erro ao carregar clientes: {clientsError}</div>}
      {installmentsError && <div className="form-error">Erro ao carregar parcelas: {installmentsError}</div>}

      {!clientsLoading && clients.length === 0 && (
        <div className="empty-state">Nenhum cliente cadastrado ainda. Comece clicando em "+ Novo cliente".</div>
      )}

      {!installmentsLoading &&
        (installments.length === 0 ? (
          clients.length > 0 && (
            <div className="empty-state">Nenhuma cobrança cadastrada ainda. Clique em "+ Nova cobrança".</div>
          )
        ) : (
          <table className="transactions-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Contrato</th>
                <th>Parcela</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {installments.map((inst) => {
                const overdue = !inst.paid && inst.due_date < todayStr();
                return (
                  <tr key={inst.id}>
                    <td>{inst.charge?.client?.name ?? "—"}</td>
                    <td>{inst.charge?.description ?? "—"}</td>
                    <td>
                      {inst.installment_number}/{inst.charge?.installments_count}
                    </td>
                    <td>{dateFormatter.format(new Date(`${inst.due_date}T00:00:00`))}</td>
                    <td className="amount--receita">{currencyFormatter.format(inst.amount)}</td>
                    <td>
                      {inst.paid ? (
                        <span className="badge badge--receita">Pago</span>
                      ) : overdue ? (
                        <span className="badge badge--despesa">Vencida</span>
                      ) : (
                        <span className="badge badge--recorrente">Pendente</span>
                      )}
                    </td>
                    <td>
                      {inst.paid ? (
                        <button
                          className="btn btn--ghost btn--sm"
                          onClick={() => handleUnmarkPaid(inst.id)}
                          disabled={busyId === inst.id}
                        >
                          Desfazer
                        </button>
                      ) : (
                        <button
                          className="btn btn--primary btn--sm"
                          onClick={() => handleMarkPaid(inst.id)}
                          disabled={busyId === inst.id}
                        >
                          Marcar como pago
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ))}

      {clientModalOpen && (
        <ClientModal onSave={addClient} onClose={() => setClientModalOpen(false)} />
      )}

      {chargeModalOpen && (
        <ChargeModal clients={clients} onSave={addCharge} onClose={() => setChargeModalOpen(false)} />
      )}
    </>
  );
}
