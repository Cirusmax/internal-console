import { useState } from "react";
import { CATEGORIES } from "../lib/categories";

const today = () => new Date().toISOString().slice(0, 10);

export function TransactionModal({ initial, onSave, onClose }) {
  const [type, setType] = useState(initial?.type ?? "receita");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES.receita[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [occurredOn, setOccurredOn] = useState(initial?.occurred_on ?? today());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleTypeChange = (nextType) => {
    setType(nextType);
    setCategory(CATEGORIES[nextType][0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      setError("Informe um valor maior que zero.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        type,
        amount: numericAmount,
        category,
        description: description.trim(),
        occurred_on: occurredOn,
      });
      onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar o lançamento.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{initial ? "Editar lançamento" : "Novo lançamento"}</h2>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="type-toggle">
            <button
              type="button"
              className={type === "receita" ? "active--receita" : ""}
              onClick={() => handleTypeChange("receita")}
            >
              Receita
            </button>
            <button
              type="button"
              className={type === "despesa" ? "active--despesa" : ""}
              onClick={() => handleTypeChange("despesa")}
            >
              Despesa
            </button>
          </div>

          <div className="form-row">
            <div className="form-field">
              <label htmlFor="amount">Valor (R$)</label>
              <input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
            <div className="form-field">
              <label htmlFor="occurredOn">Data</label>
              <input
                id="occurredOn"
                type="date"
                value={occurredOn}
                onChange={(e) => setOccurredOn(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-field">
            <label htmlFor="category">Categoria</label>
            <select id="category" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES[type].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label htmlFor="description">Descrição (opcional)</label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
