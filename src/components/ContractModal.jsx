import { useState } from "react";
import { FormDialog } from "./FormDialog";
import { currentContractDate } from "../lib/contractData";
import { parseClientProfile } from "../lib/clientProfile";

export function ContractModal({ client, charges, onClose, onEditClient }) {
  const [form, setForm] = useState({ kind: "", description: "", feeMode: "fixed", amount: "", successPercent: "", paymentMode: "signature", paymentStatus: "pending", count: 1, firstDueDate: currentContractDate(), entry: "", entryDate: currentContractDate(), city: "São João del-Rei/MG", date: currentContractDate() });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  let profileError;
  try { parseClientProfile(client); } catch (err) { profileError = err.message; }
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const input = (key, label, props = {}) => <div className="form-field"><label htmlFor={`contract-${key}`}>{label}</label><input id={`contract-${key}`} value={form[key]} onChange={set(key)} {...props} /></div>;
  const select = (key, label, options) => <div className="form-field"><label htmlFor={`contract-${key}`}>{label}</label><select id={`contract-${key}`} value={form[key]} onChange={set(key)} required>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></div>;
  const generate = async (event) => {
    event.preventDefault();
    const format = event.nativeEvent.submitter?.value || "pdf";
    setBusy(true); setError(null);
    try { const { downloadContract } = await import("../lib/generateContract"); await downloadContract(client, form, format); }
    catch (err) { setError(err.message ?? "Não foi possível gerar o contrato."); }
    finally { setBusy(false); }
  };
  return <FormDialog title="Gerar contrato" busy={busy} onClose={onClose}>
    <p>{client.name}</p>
    {profileError ? <><div className="form-error">Complete o cadastro antes de gerar o contrato: {profileError}</div><button className="btn btn--primary" onClick={onEditClient}>Completar cadastro</button></> :
    <form onSubmit={generate}><fieldset className="form-fields" disabled={busy}>
      {error && <div role="alert" className="form-error">{error}</div>}
      {select("kind", "Tipo de contrato", [["", "Selecione"], ["civil", "Cível"], ["labor", "Trabalhista"]])}
      {charges.length > 0 && <div className="form-field"><label htmlFor="contract-charge">Preencher a partir de uma cobrança (opcional)</label>
        <select id="contract-charge" defaultValue="" onChange={(event) => {
          const selected = charges.find(({ charge }) => charge.id === event.target.value);
          if (!selected) return;
          const { charge, installments } = selected;
          const entry = installments.find((i) => i.is_down_payment);
          setForm({ ...form, description: charge.description, amount: charge.total_amount, paymentMode: charge.installments_count > 1 || entry ? "installments" : "date", count: charge.installments_count || 1, firstDueDate: charge.first_due_date, entry: entry?.amount ?? "", entryDate: entry?.due_date ?? form.entryDate, paymentStatus: installments.every((i) => i.paid) ? "paid" : "pending" });
        }}><option value="">Preencher manualmente</option>{charges.map(({ charge }) => <option key={charge.id} value={charge.id}>{charge.description}</option>)}</select></div>}
      <div className="form-field"><label htmlFor="contract-description">Serviço contratado / objeto</label><textarea id="contract-description" rows={3} required value={form.description} onChange={set("description")} /></div>
      {select("feeMode", "Honorários", [["fixed", "Valor fixo"], ["mixed", "Valor fixo + percentual de êxito"], ["success", "Somente percentual de êxito"]])}
      {form.feeMode !== "success" && <>
        {input("amount", "Valor total dos honorários fixos (R$)", { type: "number", min: "0.01", step: "0.01", required: true })}
        {select("paymentStatus", "Situação do valor fixo", [["pending", "A pagar"], ["paid", "Já integralmente pago"]])}
        {form.paymentStatus === "pending" && <>
          {select("paymentMode", "Pagamento", [["signature", "À vista na assinatura"], ["date", "Parcela única em uma data"], ["installments", "Parcelado"]])}
          {form.paymentMode !== "signature" && input("firstDueDate", "Primeiro vencimento", { type: "date", required: true })}
          {form.paymentMode === "installments" && <>
            {input("count", "Número de parcelas do saldo", { type: "number", min: 1, max: 60, required: true })}
            <div className="form-row">{input("entry", "Entrada (R$, opcional)", { type: "number", min: 0, step: "0.01" })}{Number(form.entry) > 0 && input("entryDate", "Data da entrada", { type: "date", required: true })}</div>
          </>}
        </>}
      </>}
      {form.feeMode !== "fixed" && input("successPercent", "Honorários de êxito (%)", { type: "number", min: "0.01", max: 100, step: "0.01", required: true })}
      {form.kind === "labor" && <p className="contract-note">Nos contratos trabalhistas, os honorários de êxito pactuados também incidem sobre FGTS, seguro-desemprego e as demais verbas da demanda. Essa cláusula não entra nos contratos cíveis.</p>}
      <div className="form-row">{input("city", "Cidade/UF da assinatura", { required: true })}{input("date", "Data do contrato", { type: "date", required: true })}</div>
      <p className="contract-note">Modelo do escritório com Giovanni Antonio de Almeida Junior como contratado. A geração do documento não cria cobranças nem confirma pagamentos no sistema.</p>
      <div className="modal-actions"><button type="button" className="btn btn--ghost" onClick={onClose}>Fechar</button><button value="docx" className="btn btn--ghost">Baixar Word</button><button value="pdf" className="btn btn--primary">{busy ? "Gerando..." : "Baixar PDF"}</button></div>
    </fieldset></form>}
  </FormDialog>;
}
