import { useRef, useState } from "react";
import { FormDialog } from "./FormDialog";
import { currentContractDate } from "../lib/contractData";
import { parseClientProfile } from "../lib/clientProfile";

export function ContractModal({ client, charges, onClose, onEditClient, onEnsureCharge, onRecordContract }) {
  const [form, setForm] = useState({ kind: "", description: "", feeMode: "fixed", amount: "", successPercent: "", paymentMode: "signature", paymentStatus: "pending", count: 1, firstDueDate: currentContractDate(), entry: "", entryDate: currentContractDate(), city: "São João del-Rei/MG", date: currentContractDate() });
  const [busy, setBusy] = useState(false); const [error, setError] = useState(null);
  const [sourceChargeId, setSourceChargeId] = useState("");
  const [notice, setNotice] = useState("");
  const generating = useRef(false);
  const billingFields = ["amount", "paymentMode", "paymentStatus", "count", "firstDueDate", "entry", "entryDate"];
  let profileError;
  try { parseClientProfile(client); } catch (err) { profileError = err.message; }
  const set = (key) => (event) => setForm({ ...form, [key]: event.target.value });
  const input = (key, label, props = {}) => <div className="form-field"><label htmlFor={`contract-${key}`}>{label}</label><input id={`contract-${key}`} value={form[key]} onChange={set(key)} disabled={Boolean(sourceChargeId) && billingFields.includes(key)} {...props} /></div>;
  const select = (key, label, options) => <div className="form-field"><label htmlFor={`contract-${key}`}>{label}</label><select id={`contract-${key}`} value={form[key]} onChange={set(key)} disabled={Boolean(sourceChargeId) && billingFields.includes(key)} required>{options.map(([value, text]) => <option value={value} key={value}>{text}</option>)}</select></div>;
  const generate = async (event) => {
    event.preventDefault();
    if (generating.current) return;
    generating.current = true;
    const format = event.nativeEvent.submitter?.value || "pdf";
    setBusy(true); setError(null);
    try {
      const { prepareContractDownload } = await import("../lib/generateContract");
      const save = await prepareContractDownload(client, form, format);
      if (!sourceChargeId && form.feeMode !== "success" && form.paymentStatus !== "paid") {
        const chargeId = await onEnsureCharge(client, form);
        setSourceChargeId(chargeId);
        if (form.paymentMode === "signature") setForm({ ...form, paymentMode: "date", firstDueDate: form.date });
        setNotice("Cobrança e parcelas registradas no cadastro do cliente. Novos downloads reutilizam a mesma cobrança.");
      } else if (!sourceChargeId) setNotice("Contrato gerado sem criar parcelas.");
      await onRecordContract(client, form);
      setNotice("Contrato gerado. O resumo dos termos foi registrado no cadastro do cliente.");
      save();
    }
    catch (err) { setError(err.message ?? "Não foi possível gerar o contrato."); }
    finally { setBusy(false); generating.current = false; }
  };
  return <FormDialog title="Gerar contrato" busy={busy} onClose={onClose}>
    <p>{client.name}</p>
    {profileError ? <><div className="form-error">Complete o cadastro antes de gerar o contrato: {profileError}</div><button className="btn btn--primary" onClick={onEditClient}>Completar cadastro</button></> :
    <form onSubmit={generate}><fieldset className="form-fields" disabled={busy}>
      {error && <div role="alert" className="form-error">{error}</div>}
      {notice && <div role="status" className="form-error form-error--ok">{notice}</div>}
      {select("kind", "Tipo de contrato", [["", "Selecione"], ["civil", "Cível"], ["labor", "Trabalhista"]])}
      {charges.length > 0 && <div className="form-field"><label htmlFor="contract-charge">Preencher a partir de uma cobrança (opcional)</label>
        <select id="contract-charge" value={sourceChargeId} onChange={(event) => {
          setSourceChargeId(event.target.value); setNotice("");
          const selected = charges.find(({ charge }) => charge.id === event.target.value);
          if (!selected) { setForm({ ...form, existingSchedule: undefined }); return; }
          const { charge, installments } = selected;
          const entry = installments.find((i) => i.is_down_payment);
          setForm({ ...form, feeMode: form.feeMode === "success" ? "fixed" : form.feeMode, description: charge.description, amount: charge.total_amount, paymentMode: charge.installments_count > 1 || entry ? "installments" : "date", count: charge.installments_count || 1, firstDueDate: charge.first_due_date, entry: entry?.amount ?? "", entryDate: entry?.due_date ?? form.entryDate, paymentStatus: installments.every((i) => i.paid) ? "paid" : "pending", existingSchedule: installments.filter((i) => !i.is_down_payment).sort((a, b) => a.installment_number - b.installment_number).map((i) => ({ amount: Number(i.amount), date: i.due_date })) });
        }}><option value="">Preencher manualmente</option>{charges.map(({ charge }) => <option key={charge.id} value={charge.id}>{charge.description}</option>)}</select></div>}
      <div className="form-field"><label htmlFor="contract-description">Serviço contratado / objeto</label><textarea id="contract-description" rows={3} required value={form.description} onChange={set("description")} /></div>
      {select("feeMode", "Honorários", [["fixed", "Valor fixo"], ["mixed", "Valor fixo + percentual de êxito"], ...(!sourceChargeId ? [["success", "Somente percentual de êxito"]] : [])])}
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
      <p className="contract-note">Modelo do escritório com Giovanni Antonio de Almeida Junior como contratado.</p>
      <p className="contract-note">{sourceChargeId ? "A cobrança selecionada será reutilizada, preservando suas parcelas e pagamentos." : form.feeMode === "success" ? "Honorários somente de êxito não geram parcelas antecipadas." : form.paymentStatus === "paid" ? "Como o valor já está integralmente pago, o contrato será gerado sem criar cobrança ou parcelas." : "Ao gerar o contrato, o valor fixo a pagar será registrado como cobrança com as parcelas indicadas. O recebimento continua sendo confirmado na aba Clientes."}</p>
      <div className="modal-actions"><button type="button" className="btn btn--ghost" onClick={onClose}>Fechar</button><button value="docx" className="btn btn--ghost">Baixar Word</button><button value="pdf" className="btn btn--primary">{busy ? "Gerando..." : "Baixar PDF"}</button></div>
    </fieldset></form>}
  </FormDialog>;
}
