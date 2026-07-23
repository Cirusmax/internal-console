import { supabase } from "./supabaseClient";

function monthKey(dateStr) {
  return dateStr.slice(0, 7);
}

function occurredOnForThisMonth(dayOfMonth) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const day = Math.min(dayOfMonth, lastDayOfMonth);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Cria o lançamento do mês para cada regra recorrente ativa que ainda não tem
 * um lançamento vinculado no mês atual. Roda uma vez por sessão, disparado ao
 * abrir o app (não há servidor rodando 24h pra fazer isso via cron).
 */
export async function generateRecurringTransactions() {
  const { data: rules } = await supabase.from("recurring_rules").select("*").eq("active", true);
  if (!rules || rules.length === 0) return;

  const currentMonthKey = new Date().toISOString().slice(0, 7);

  const { data: existing } = await supabase
    .from("transactions")
    .select("recurring_rule_id, occurred_on")
    .not("recurring_rule_id", "is", null);

  const alreadyGenerated = new Set(
    (existing ?? [])
      .filter((t) => monthKey(t.occurred_on) === currentMonthKey)
      .map((t) => t.recurring_rule_id)
  );

  const missing = rules.filter((rule) => !alreadyGenerated.has(rule.id));

  for (const rule of missing) {
    // Inserção individual: se duas sessões gerarem ao mesmo tempo, o índice
    // único (recurring_rule_id + mês) barra a duplicata e o erro é ignorado.
    await supabase.from("transactions").insert({
      type: rule.type,
      amount: rule.amount,
      category: rule.category,
      description: rule.description,
      occurred_on: occurredOnForThisMonth(rule.day_of_month),
      recurring_rule_id: rule.id,
    });
  }
}
