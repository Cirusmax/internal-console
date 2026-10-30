import { contractSchedule } from "./contractData";

export function contractBillingRows(form) {
  if (form.feeMode === "success" || form.paymentStatus === "paid") return [];
  const amount = Number(form.amount);
  if (form.paymentMode !== "installments") return [{ installment_number: 1, amount,
    due_date: form.paymentMode === "signature" ? form.date : form.firstDueDate, is_down_payment: false }];
  const entry = Number(form.entry) || 0;
  const rows = contractSchedule(amount, entry, Number(form.count), form.firstDueDate)
    .map((item, i) => ({ installment_number: i + 1, amount: item.amount, due_date: item.date, is_down_payment: false }));
  if (entry > 0) rows.unshift({ installment_number: 0, amount: entry, due_date: form.entryDate, is_down_payment: true });
  return rows;
}

export async function contractBillingKey(clientId, description, rows) {
  const normalized = [clientId, description.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR"),
    rows.map((item) => [item.installment_number, Math.round(item.amount * 100), item.due_date, item.is_down_payment])];
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(normalized)));
  return [...new Uint8Array(bytes)].map((n) => n.toString(16).padStart(2, "0")).join("");
}
