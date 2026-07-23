import { useState } from "react";
import { CATEGORIES } from "../lib/categories";

export function RecurringRuleModal({ initial, onSave, onClose }) {
  const [type, setType] = useState(initial?.type ?? "despesa");
  const [amount, setAmount] = useState(initial?.amount ?? "");
  const [category, setCategory] = useState(initial?.category ?? CATEGORIES.despesa[0]);
  const [description, setDescription] = useState(initial?.description ?? "");
  const [dayOfMonth, setDayOfMonth] = useState(initial?.day_of_month ?? 5);
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
    const day = Number(dayOfMonth);
    if (!day || day < 1 || day > 28) {
      setError("O dia do mês deve ser entre 1 e 28.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        type,
        amount: numericAmount,
        category,
        description: description.trim(),
        day_of_month: day,
      });
      onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar a regra recorrente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>{initial ? "Editar recorrência" : "Nova recorrência"}</h2>

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
              <label htmlFor="dayOfMonth">Dia do mês</label>
              <input
                id="dayOfMonth"
                type="number"
                min="1"
                max="28"
                value={dayOfMonth}
                onChange={(e) => setDayOfMonth(e.target.value)}
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
