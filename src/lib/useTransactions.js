import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("transactions")
      .select("*")
      .order("occurred_on", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setTransactions(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTransaction = async (payload) => {
    const { error: insertError } = await supabase.from("transactions").insert(payload);
    if (insertError) throw insertError;
    await reload();
  };

  const updateTransaction = async (id, payload) => {
    const { error: updateError } = await supabase.from("transactions").update(payload).eq("id", id);
    if (updateError) throw updateError;
    await reload();
  };

  const deleteTransaction = async (id) => {
    const { error: deleteError } = await supabase.from("transactions").delete().eq("id", id);
    if (deleteError) throw deleteError;
    await reload();
  };

  return { transactions, loading, error, reload, addTransaction, updateTransaction, deleteTransaction };
}
