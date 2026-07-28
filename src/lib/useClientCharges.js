import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function buildInstallments({ total_amount, installments_count, first_due_date }) {
  const cents = Math.round(Number(total_amount) * 100);
  const baseShare = Math.floor(cents / installments_count);
  const remainder = cents - baseShare * installments_count;

  const [year, month, day] = first_due_date.split("-").map(Number);

  const installments = [];
  for (let i = 0; i < installments_count; i++) {
    const shareCents = baseShare + (i === installments_count - 1 ? remainder : 0);
    const dueDate = new Date(year, month - 1 + i, day);
    installments.push({
      installment_number: i + 1,
      amount: shareCents / 100,
      due_date: dueDate.toISOString().slice(0, 10),
    });
  }
  return installments;
}

export function useClientCharges() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("client_installments")
      .select("*, charge:client_charges(*, client:clients(*))")
      .order("due_date", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setInstallments(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCharge = async (payload) => {
    const { data: charge, error: chargeError } = await supabase
      .from("client_charges")
      .insert({
        client_id: payload.client_id,
        description: payload.description,
        category: payload.category,
        total_amount: payload.total_amount,
        installments_count: payload.installments_count,
        first_due_date: payload.first_due_date,
      })
      .select()
      .single();
    if (chargeError) throw chargeError;

    const generated = buildInstallments(payload).map((i) => ({ ...i, charge_id: charge.id }));
    const { error: installmentsError } = await supabase.from("client_installments").insert(generated);
    if (installmentsError) throw installmentsError;

    await reload();
  };

  const markPaid = async (installmentId) => {
    const { error: rpcError } = await supabase.rpc("mark_installment_paid", {
      installment_id: installmentId,
    });
    if (rpcError) throw rpcError;
    await reload();
  };

  const unmarkPaid = async (installmentId) => {
    const { error: rpcError } = await supabase.rpc("unmark_installment_paid", {
      installment_id: installmentId,
    });
    if (rpcError) throw rpcError;
    await reload();
  };

  return { installments, loading, error, reload, addCharge, markPaid, unmarkPaid };
}
