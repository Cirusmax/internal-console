import { useState } from "react";
import { ClientFields } from "./ClientFields";
import { FormDialog } from "./FormDialog";
import { clientFormValues, parseClientProfile } from "../lib/clientProfile";

export function ClientModal({ client, onSave, onClose, onGenerateContract }) {
  const [form, setForm] = useState(() => clientFormValues(client));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const generateContract = e.nativeEvent.submitter?.value === "contract";
    setError(null);

    setSaving(true);
    try {
      const saved = await onSave(parseClientProfile(form));
      onClose();
      if (generateContract) onGenerateContract(saved);
    } catch (err) {
      setError(err.message ?? "Não foi possível salvar o cliente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <FormDialog title={client ? "Editar cadastro" : "Novo cliente"} busy={saving} onClose={onClose}>

        {error && <div className="form-error" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <fieldset className="form-fields" disabled={saving}>
          <ClientFields value={form} onChange={setForm} />

          <div className="form-field">
            <label htmlFor="clientNotes">Observações (opcional)</label>
            <textarea id="clientNotes" rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn--ghost" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn--ghost" disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </button>
            {onGenerateContract && <button type="submit" value="contract" className="btn btn--primary">Salvar e gerar contrato</button>}
          </div>
          </fieldset>
        </form>
    </FormDialog>
  );
}
