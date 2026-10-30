import { useMemo, useRef, useState } from "react";
import { useClients } from "../lib/useClients";
import { useClientCharges } from "../lib/useClientCharges";
import { ClientModal } from "../components/ClientModal";
import { ChargeModal } from "../components/ChargeModal";
import { ClientActionModal } from "../components/ClientActionModal";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const todayStr = () => new Date().toISOString().slice(0, 10);

export function Clientes() {
  const { clients, loading: clientsLoading, error: clientsError, addClient, deleteClient, setClientArchived } = useClients();
  const {
    installments,
    loading: installmentsLoading,
    error: installmentsError,
    addCharge,
    deleteCharge,
    markPaid,
    unmarkPaid,
    setSubJudice,
  } = useClientCharges();

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [chargeModalOpen, setChargeModalOpen] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [view, setView] = useState("active");
  const [actionError, setActionError] = useState(null);
  const [confirmation, setConfirmation] = useState(null);
  const clientElements = useRef(new Map());
  const activeClients = clients.filter((client) => !client.archived_at);
  const archivedClients = clients.filter((client) => client.archived_at);
  const visibleClients = view === "archived" ? archivedClients : activeClients;
  const loading = clientsLoading || installmentsLoading;

  const runAction = async (id, action) => {
    setBusyId(id);
    setActionError(null);
    try {
      await action();
      setConfirmation(null);
    } catch (err) {
      setActionError(err.message ?? "Não foi possível salvar a alteração. Tente novamente.");
    } finally {
      setBusyId(null);
    }
  };

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
    setActionError(null);
    setConfirmation({
      title: "Excluir cobrança", label: "Excluir cobrança", danger: true,
      message: "Excluir esta cobrança e suas parcelas? As receitas já confirmadas serão preservadas nos lançamentos. Esta exclusão não pode ser desfeita.",
      onConfirm: () => runAction(chargeId, () => deleteCharge(chargeId)),
    });
  };

  const handleDeleteClient = async (e, clientId, clientName) => {
    e.preventDefault();
    e.stopPropagation();
    setActionError(null);
    setConfirmation({
      title: "Excluir cliente", label: "Excluir cliente", danger: true,
      message: `Excluir o cliente "${clientName}" e todas as cobranças e parcelas dele? As receitas já confirmadas serão preservadas nos lançamentos. Para guardar o histórico do cliente, prefira arquivar.`,
      onConfirm: () => runAction(clientId, () => deleteClient(clientId)),
    });
  };

  const handleMarkPaid = (id) => runAction(id, () => markPaid(id));

  const handleReceipt = (id) => runAction(id, async () => {
    const { downloadPaymentReceipt } = await import("../lib/generatePaymentReceiptPdf");
    await downloadPaymentReceipt(id);
  });

  const handleUnmarkPaid = async (id) => {
    setActionError(null);
    setConfirmation({
      title: "Desfazer pagamento", label: "Desfazer pagamento", danger: true,
      message: "Desfazer o pagamento? O lançamento de receita vinculado será removido.",
      onConfirm: () => runAction(id, () => unmarkPaid(id)),
    });
  };

  const handleArchive = (event, client) => {
    event.preventDefault();
    event.stopPropagation();
    setActionError(null);
    setConfirmation({
      title: client.archived_at ? "Restaurar cliente" : "Arquivar cliente",
      label: client.archived_at ? "Restaurar" : "Arquivar",
      message: client.archived_at
        ? `Restaurar "${client.name}" para a lista de clientes ativos?`
        : `Arquivar "${client.name}"? O histórico de cobranças e pagamentos ficará disponível em Arquivados. Você poderá restaurar o cliente quando precisar.`,
      onConfirm: () => runAction(client.id, () => setClientArchived(client.id, !client.archived_at, {
        beforeUpdate: async () => {
          setConfirmation(null);
          const element = clientElements.current.get(client.id);
          if (!element?.animate || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
          element.style.overflow = "hidden";
          const animation = element.animate([
            { height: `${element.getBoundingClientRect().height}px`, opacity: 1, transform: "translateX(0)", marginBottom: "16px" },
            { height: "0px", opacity: 0, transform: "translateX(12px)", marginBottom: "0px" },
          ], { duration: 280, easing: "cubic-bezier(0.22, 1, 0.36, 1)", fill: "forwards" });
          // A navigation can cancel the animation; the confirmed write is still valid.
          await animation.finished.catch(() => {});
        },
      })),
    });
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Clientes</h1>
          <p>Contratos parcelados e valores que ainda vão cair.</p>
        </div>
        <div className="client-page-actions">
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
      {actionError && !confirmation && <div className="form-error" role="alert">{actionError}</div>}

      <div className="table-toolbar">
        <div className="table-filters" role="group" aria-label="Filtrar clientes">
          <button className={`btn btn--sm ${view === "active" ? "btn--primary" : "btn--ghost"}`} aria-pressed={view === "active"} onClick={() => setView("active")}>
            Ativos ({activeClients.length})
          </button>
          <button className={`btn btn--sm ${view === "archived" ? "btn--primary" : "btn--ghost"}`} aria-pressed={view === "archived"} onClick={() => setView("archived")}>
            Arquivados ({archivedClients.length})
          </button>
        </div>
      </div>

      {loading && <div className="empty-state">Carregando clientes e cobranças...</div>}
      {!loading && !clientsError && !installmentsError && visibleClients.length === 0 && (
        <div className="empty-state">
          {view === "archived" ? "Nenhum cliente arquivado ainda." : "Nenhum cliente ativo. Clique em \"+ Nova cobrança\" pra cadastrar ou restaure um cliente em Arquivados."}
        </div>
      )}

      {!loading && !clientsError && !installmentsError &&
        visibleClients.map((client) => {
          const charges = Array.from(chargesByClient.get(client.id)?.values() ?? []);
          const pendingTotal = charges
            .flatMap((c) => c.installments)
            .filter((i) => !i.paid)
            .reduce((sum, i) => sum + Number(i.amount), 0);

          return (
            <details className="client-group" key={client.id} open={charges.length > 0}
              ref={(element) => { if (element) clientElements.current.set(client.id, element); else clientElements.current.delete(client.id); }}>
              <summary>
                <span>{client.name}</span>
                <span className="client-group__actions">
                  <span className="client-group__meta">
                    {charges.length} {charges.length === 1 ? "cobrança" : "cobranças"}
                    {pendingTotal > 0 && ` · ${currencyFormatter.format(pendingTotal)} a receber`}
                  </span>
                  <button
                    className="btn btn--ghost btn--sm"
                    onClick={(event) => handleArchive(event, client)}
                    disabled={busyId !== null || (!client.archived_at && pendingTotal > 0)}
                    title={!client.archived_at && pendingTotal > 0 ? "Quite as parcelas em aberto antes de arquivar o cliente." : undefined}
                  >
                    {client.archived_at ? "Restaurar" : "Arquivar"}
                  </button>
                  <button
                    className="icon-btn"
                    aria-label="Excluir cliente"
                    onClick={(e) => handleDeleteClient(e, client.id, client.name)}
                    disabled={busyId !== null}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" />
                      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
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
                          {charge.is_sub_judice && <span className="badge badge--sub-judice installment-status">Sob judice</span>}
                        </div>
                        <div className="charge-card__actions">
                        {!client.archived_at && <button
                          className="btn btn--ghost btn--sm"
                          aria-pressed={Boolean(charge.is_sub_judice)}
                          disabled={busyId !== null}
                          onClick={() => runAction(charge.id, () => setSubJudice(charge.id, !charge.is_sub_judice))}
                        >
                          {charge.is_sub_judice ? "Retirar de sob judice" : "Colocar sob judice"}
                        </button>}
                        <button
                          className="btn btn--danger btn--sm"
                          aria-label="Excluir cobrança"
                          onClick={() => handleDeleteCharge(charge.id)}
                          disabled={busyId !== null}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18" />
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                          </svg>
                          Excluir cobrança
                        </button>
                        </div>
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
                                    <span key="paid" className="badge badge--receita installment-status">Pago</span>
                                  ) : charge.is_sub_judice ? (
                                    <span key="sub-judice" className="badge badge--sub-judice installment-status">Sob judice</span>
                                  ) : overdue ? (
                                    <span key="overdue" className="badge badge--despesa installment-status">Vencida</span>
                                  ) : (
                                    <span key="pending" className="badge badge--recorrente installment-status">Pendente</span>
                                  )}
                                </td>
                                <td>
                                  <div className="client-installment-actions">
                                  {inst.paid && <button
                                    className="btn btn--ghost btn--sm"
                                    onClick={() => handleReceipt(inst.id)}
                                    disabled={busyId !== null}
                                  >
                                    {busyId === inst.id ? "Aguarde..." : "Baixar recibo"}
                                  </button>}
                                  {client.archived_at ? null : inst.paid ? (
                                    <button
                                      className="btn btn--ghost btn--sm"
                                      onClick={() => handleUnmarkPaid(inst.id)}
                                      disabled={busyId !== null}
                                    >
                                      Desfazer
                                    </button>
                                  ) : (
                                    <button
                                      className="btn btn--primary btn--sm"
                                      onClick={() => handleMarkPaid(inst.id)}
                                      disabled={busyId !== null}
                                    >
                                      Marcar como pago
                                    </button>
                                  )}
                                  </div>
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
        <ChargeModal clients={activeClients} onSave={handleSaveCharge} onClose={() => setChargeModalOpen(false)} />
      )}
      {confirmation && <ClientActionModal {...confirmation} error={actionError} busy={busyId !== null} onClose={() => { setConfirmation(null); setActionError(null); }} />}
    </>
  );
}
