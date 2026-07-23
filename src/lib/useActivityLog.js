import { useCallback, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

export function useActivityLog() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from("activity_log")
      .select("*")
      .order("occurred_at", { ascending: false })
      .limit(200);

    if (fetchError) {
      setError(fetchError.message);
    } else {
      setError(null);
      setEntries(data ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { entries, loading, error, reload };
}
