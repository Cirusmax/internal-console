import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";
import { buildContractVariables } from "./contractData";
import { contractBillingRows } from "./contractBilling";

export async function contractHistoryPayload(client, form) {
  const values = buildContractVariables(client, form);
  // The key represents the agreed terms, independently of file format or issuer.
  const schedule = form.feeMode === "success" || form.paymentStatus === "paid" ? [] : form.existingSchedule && form.paymentMode === "installments"
    ? [...(Number(form.entry) > 0 ? [[0, Math.round(Number(form.entry) * 100), form.entryDate]] : []),
      ...form.existingSchedule.map((item, i) => [i + 1, Math.round(item.amount * 100), item.date])]
    : contractBillingRows(form).map((item) => [item.installment_number, Math.round(item.amount * 100), item.due_date]);
  const canonical = [client.id, form.kind, form.description.trim(), form.feeMode,
    form.feeMode === "success" ? null : Math.round(Number(form.amount) * 100),
    form.feeMode === "fixed" ? null : Number(form.successPercent),
    form.feeMode === "success" ? null : form.paymentStatus, schedule, form.date, form.city.trim()];
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(canonical)));
  return { client_id: client.id, generation_key: [...new Uint8Array(hash)].map((n) => n.toString(16).padStart(2, "0")).join(""),
    kind: form.kind, service: form.description.trim(), contract_date: form.date, city: form.city.trim(),
    terms: values.HONORARIOS + (form.kind === "labor" && form.feeMode !== "fixed"
      ? "\nBase dos honorários de êxito: inclui FGTS, seguro-desemprego e demais valores provenientes da demanda trabalhista." : "") };
}

export function useClientContracts() {
  const [contracts, setContracts] = useState([]);
  const [error, setError] = useState(null);
  const reload = useCallback(async () => {
    const { data, error: fetchError } = await supabase.from("client_contracts").select("*").order("created_at", { ascending: false });
    if (fetchError) setError("Não foi possível carregar o histórico de contratos. Tente novamente.");
    else { setContracts(data ?? []); setError(null); }
  }, []);
  useEffect(() => { reload(); }, [reload]);
  const recordContract = async (client, form) => {
    const payload = await contractHistoryPayload(client, form);
    const { error: saveError } = await supabase.from("client_contracts")
      .upsert(payload, { onConflict: "client_id,generation_key", ignoreDuplicates: true });
    if (saveError) throw new Error("Não foi possível registrar os termos do contrato. Tente gerar novamente; uma cobrança já criada não será duplicada.");
    // Read the saved row, including its original timestamp when this was a repeat download.
    const { data, error: readError } = await supabase.from("client_contracts").select("*")
      .eq("client_id", client.id).eq("generation_key", payload.generation_key).single();
    if (readError || !data) throw new Error("O resumo foi salvo, mas não foi possível confirmar o histórico. Tente gerar novamente.");
    setContracts((current) => [data, ...current.filter((item) => item.id !== data.id)]
      .sort((a, b) => b.created_at.localeCompare(a.created_at)));
    setError(null);
  };
  return { contracts, error, reload, recordContract };
}
