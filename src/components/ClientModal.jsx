import { useState } from "react";

export function ClientModal({ onSave, onClose }) {
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Informe o nome do cliente.");
      return;
    }

    setSaving(true);
    try {
      await onSave({ name: name.trim(), notes: notes.trim() });
      onClose();
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Novo cliente</h2>

        {error && <div className="form-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="clientName">Nome</label>
            <input id="clientName" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-field">
            <label htmlFor="clientNotes">Observações (opcional)</label>
            <textarea id="clientNotes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
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
