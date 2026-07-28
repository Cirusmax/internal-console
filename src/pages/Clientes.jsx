import { useMemo, useState } from "react";
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
    deleteCharge,
    markPaid,
    unmarkPaid,
  } = useClientCharges();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const chargesByClient = useMemo(() => {
    const map = new Map();
    for (const inst of installments) {
      const charge = inst.charge;
      if (!charge?.client) continue;
      if (!map.has(charge.client.id)) map.set(charge.client.id, new Map());
      const clientCharges = map.get(charge.client.id);
      if (!clientCharges.has(charge.id)) clientCharges.set(charge.id, { charge, installments: [] });
      clientCharges.get(charge.id).installments.push(inst);
    }
    return map;
  }, [installments]);

  const handleSaveClient = async (payload) => {
    await addClient(payload);
  };

  const handleSaveCharge = async (payload) => {
    const { new_client_name, ...rest } = payload;
    let clientId = rest.client_id;
    if (new_client_name) {
      const created = await addClient({ name: new_client_name, notes: "" });
      clientId = created.id;
    }
    await addCharge({ ...rest, client_id: clientId });
  };

  const handleDeleteCharge = async (chargeId) => {
    if (
      !window.confirm(
        "Excluir esta cobrança e as parcelas ainda pendentes? Lançamentos de receita já confirmados não serão apagados."
      )
    )
      return;
    setBusyId(chargeId);
    try {
      await deleteCharge(chargeId);
    } finally {
      setBusyId(null);
    }
  };

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
          <button className="btn btn--primary" onClick={() => setChargeModalOpen(true)}>
            + Nova cobrança
          </button>
        </div>
      </div>

      {clientsError && <div className="form-error">Erro ao carregar clientes: {clientsError}</div>}
      {installmentsError && <div className="form-error">Erro ao carregar parcelas: {installmentsError}</div>}

      {!clientsLoading && clients.length === 0 && (
        <div className="empty-state">
          Nenhum cliente cadastrado ainda. Clique em "+ Nova cobrança" pra criar o cliente junto.
        </div>
      )}

      {!installmentsLoading &&
        clients.map((client) => {
          const charges = Array.from(chargesByClient.get(client.id)?.values() ?? []);
          const pendingTotal = charges
            .flatMap((c) => c.installments)
            .filter((i) => !i.paid)
            .reduce((sum, i) => sum + Number(i.amount), 0);

          return (
            <details className="client-group" key={client.id} open={charges.length > 0}>
              <summary>
                <span>{client.name}</span>
                <span className="client-group__meta">
                  {charges.length} {charges.length === 1 ? "cobrança" : "cobranças"}
                  {pendingTotal > 0 && ` · ${currencyFormatter.format(pendingTotal)} a receber`}
                </span>
              </summary>
              <div className="client-group__body">
                {charges.length === 0 ? (
                  <p style={{ margin: 0 }}>Nenhuma cobrança cadastrada pra esse cliente ainda.</p>
                ) : (
                  charges.map(({ charge, installments: chargeInstallments }) => (
                    <div className="charge-card" key={charge.id}>
                      <div className="charge-card__header">
                        <div>
                          <div className="charge-card__title">{charge.description}</div>
                          <div className="charge-card__meta">
                            {currencyFormatter.format(charge.total_amount)} · {charge.category}
                          </div>
                        </div>
                        <button
                          className="icon-btn"
                          aria-label="Excluir cobrança"
                          onClick={() => handleDeleteCharge(charge.id)}
                          disabled={busyId === charge.id}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                        </button>
                      </div>

                      <table className="transactions-table">
                        <thead>
                          <tr>
                            <th>Parcela</th>
                            <th>Vencimento</th>
                            <th>Valor</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {chargeInstallments.map((inst) => {
                            const overdue = !inst.paid && inst.due_date < todayStr();
                            return (
                              <tr key={inst.id}>
                                <td>{inst.is_down_payment ? "Entrada" : `${inst.installment_number}/${charge.installments_count}`}</td>
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
                    </div>
                  ))
                )}
              </div>
            </details>
          );
        })}

      {clientModalOpen && <ClientModal onSave={handleSaveClient} onClose={() => setClientModalOpen(false)} />}

      {chargeModalOpen && (
        <ChargeModal clients={clients} onSave={handleSaveCharge} onClose={() => setChargeModalOpen(false)} />
      )}
    </>
  );
}
