import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

function buildInstallments({ amount_to_split, installments_count, first_due_date }) {
  const cents = Math.round(Number(amount_to_split) * 100);
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
      is_down_payment: false,
    });
  }
  return installments;
}

export function useClientCharges() {
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("client_installments")
      .select("*, charge:client_charges(*, client:clients(*))")
      .order("due_date", { ascending: true })
      .order("installment_number", { ascending: true });

    if (fetchError) {
      if (background) throw fetchError;
      setError(fetchError.message);
    } else {
      setError(null);
      setInstallments(data ?? []);
    }
    if (!background) setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addCharge = async (payload) => {
    const downPayment = Number(payload.down_payment_amount) || 0;
    const remainder = Number(payload.total_amount) - downPayment;

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

    const rows = [];
    if (downPayment > 0) {
      rows.push({
        charge_id: charge.id,
        installment_number: 0,
        amount: downPayment,
        due_date: payload.down_payment_date,
        is_down_payment: true,
      });
    }
    if (payload.installments_count > 0) {
      const generated = buildInstallments({
        amount_to_split: remainder,
        installments_count: payload.installments_count,
        first_due_date: payload.first_due_date,
      });
      rows.push(...generated.map((i) => ({ ...i, charge_id: charge.id })));
    }

    const { error: installmentsError } = await supabase.from("client_installments").insert(rows);
    if (installmentsError) throw installmentsError;

    await reload({ background: true });
  };

  const deleteCharge = async (chargeId) => {
    const { error: deleteError } = await supabase.from("client_charges").delete().eq("id", chargeId);
    if (deleteError) throw deleteError;
    await reload({ background: true });
  };

  const markPaid = async (installmentId) => {
    const { error: rpcError } = await supabase.rpc("mark_installment_paid", {
      installment_id: installmentId,
    });
    if (rpcError) throw rpcError;
    await reload({ background: true });
  };

  const unmarkPaid = async (installmentId) => {
    const { error: rpcError } = await supabase.rpc("unmark_installment_paid", {
      installment_id: installmentId,
    });
    if (rpcError) throw rpcError;
    await reload({ background: true });
  };

  const setSubJudice = async (chargeId, subJudice) => {
    const { error: updateError } = await supabase.from("client_charges")
      .update({ is_sub_judice: subJudice }).eq("id", chargeId).select("id").single();
    if (updateError) throw updateError;
    await reload({ background: true });
  };

  return { installments, loading, error, reload, addCharge, deleteCharge, markPaid, unmarkPaid, setSubJudice };
}
