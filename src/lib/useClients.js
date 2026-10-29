import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useClients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async ({ background = false } = {}) => {
    if (!background) setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });

    if (fetchError) {
      if (background) throw fetchError;
      setError(fetchError.message);
    } else {
      setError(null);
      setClients(data ?? []);
    }
    if (!background) setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addClient = async (payload) => {
    const { data, error: insertError } = await supabase.from("clients").insert(payload).select().single();
    if (insertError) throw insertError;
    await reload({ background: true });
    return data;
  };

  const deleteClient = async (id) => {
    const { error: deleteError } = await supabase.from("clients").delete().eq("id", id);
    if (deleteError) throw deleteError;
    await reload({ background: true });
  };

  const setClientArchived = async (id, archived, { beforeUpdate } = {}) => {
    const { data, error: updateError } = await supabase.from("clients")
      .update({ archived_at: archived ? new Date().toISOString() : null })
      .eq("id", id).select("id, archived_at").single();
    if (updateError) throw updateError;
    // Animate only after the server confirms the write. Keep the other cards mounted.
    await beforeUpdate?.();
    setClients((current) => current.map((client) => client.id === id
      ? { ...client, archived_at: data.archived_at } : client));
  };

  return { clients, loading, error, reload, addClient, deleteClient, setClientArchived };
}
