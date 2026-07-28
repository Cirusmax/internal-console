import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setClients(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addClient = async (payload) => {
    const { data, error: insertError } = await supabase.from("clients").insert(payload).select().single();
    if (insertError) throw insertError;
    await reload();
    return data;
  };

  return { clients, loading, error, reload, addClient };
}
