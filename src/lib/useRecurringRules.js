import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useRecurringRules() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("recurring_rules")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setRules(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addRule = async (payload) => {
    const { error: insertError } = await supabase.from("recurring_rules").insert(payload);
    if (insertError) throw insertError;
    await reload();
  };

  const updateRule = async (id, payload) => {
    const { error: updateError } = await supabase.from("recurring_rules").update(payload).eq("id", id);
    if (updateError) throw updateError;
    await reload();
  };

  const deleteRule = async (id) => {
    const { error: deleteError } = await supabase.from("recurring_rules").delete().eq("id", id);
    if (deleteError) throw deleteError;
    await reload();
  };

  return { rules, loading, error, reload, addRule, updateRule, deleteRule };
}
