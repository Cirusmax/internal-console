import { useState } from "react";
import { CATEGORIES } from "../lib/categories";

const today = () => new Date().toISOString().slice(0, 10);

export function ChargeModal({ clients, defaultClientId, onSave, onClose }) {
  const [clientId, setClientId] = useState(defaultClientId ?? clients[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(CATEGORIES.receita[0]);
  const [totalAmount, setTotalAmount] = useState("");
  const [installmentsCount, setInstallmentsCount] = useState(1);
  const [firstDueDate, setFirstDueDate] = useState(today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!clientId) {
      setError("Selecione um cliente.");
      return;
    }
    const amount = Number(totalAmount);
    if (!amount || amount <= 0) {
      setError("Informe um valor total maior que zero.");
      return;
    }
    const count = Number(installmentsCount);
    if (!count || count < 1 || count > 60) {
      setError("Número de parcelas deve ser entre 1 e 60.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        client_id: clientId,
        description: description.trim() || "Contrato",
        category,
        total_amount: amount,
        installments_count: count,
        first_due_date: firstDueDate,
      });
      onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar a cobrança.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Nova cobrança</h2>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="chargeClient">Cliente</label>
            <select id="chargeClient" value={clientId} onChange={(e) => setClientId(e.target.value)}>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="chargeDescription">Descrição do contrato</label>
            <input
              id="chargeDescription"
              type="text"
              placeholder="Ex: Honorários processo trabalhista"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-field">
            <label htmlFor="chargeCategory">Categoria</label>
            <select id="chargeCategory" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.receita.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="totalAmount">Valor total (R$)</label>
              <input
                id="totalAmount"
                type="number"
                step="0.01"
                min="0"
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="installmentsCount">Nº de parcelas</label>
              <input
                id="installmentsCount"
                type="number"
                min="1"
                max="60"
                value={installmentsCount}
                onChange={(e) => setInstallmentsCount(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="firstDueDate">Vencimento da 1ª parcela</label>
            <input
              id="firstDueDate"
              type="date"
              value={firstDueDate}
              onChange={(e) => setFirstDueDate(e.target.value)}
              required
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
