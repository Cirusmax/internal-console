import { useState } from "react";
import { FormDialog } from "./FormDialog";
export function EditServiceModal({ charge, onSave, onClose }) {
  const [description, setDescription] = useState(charge.description);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const submit = async (event) => {
    event.preventDefault(); setError(null);
    if (!description.trim()) { setError("Informe a descrição do serviço."); return; }
    setSaving(true);
    try { await onSave(charge.id, description); onClose(); }
    catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };
  return <FormDialog title="Editar serviço" busy={saving} onClose={onClose}>
    <p>Altere a descrição mantendo os valores, as parcelas e os pagamentos existentes.</p>
    {error && <div role="alert" className="form-error">{error}</div>}
    <form onSubmit={submit}>
      <div className="form-field"><label htmlFor="service-description">Descrição do serviço</label>
        <input id="service-description" value={description} onChange={(event) => setDescription(event.target.value)} required disabled={saving} /></div>
      <div className="modal-actions"><button type="button" className="btn btn--ghost" disabled={saving} onClick={onClose}>Cancelar</button>
        <button className="btn btn--primary" disabled={saving}>{saving ? "Salvando..." : "Salvar"}</button></div>
    </form>
  </FormDialog>;
}
