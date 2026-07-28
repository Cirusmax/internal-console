import { supabase } from "./supabaseClient";

// Ordem de exportação não importa (é só leitura), mas mantemos os nomes
// centralizados aqui. activity_log entra só como referência: não é
// reimportável (o banco só aceita escrita nela via trigger, não direto).
const EXPORT_TABLES = [
  "clients",
  "client_charges",
  "client_installments",
  "recurring_rules",
  "transactions",
  "activity_log",
];

// Ordem de importação IMPORTA: cada tabela só referencia (FK) tabelas que já
// vieram antes nessa lista, senão o insert falha por violação de chave estrangeira.
const IMPORT_ORDER = ["clients", "recurring_rules", "client_charges", "transactions", "client_installments"];

export async function exportAllData() {
  const data = {};
  for (const table of EXPORT_TABLES) {
    const { data: rows, error } = await supabase.from(table).select("*");
    if (error) throw new Error(`Erro ao exportar "${table}": ${error.message}`);
    data[table] = rows ?? [];
  }

  const payload = {
    exported_at: new Date().toISOString(),
    version: 1,
    data,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `backup-financas-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);

  return payload;
}

export async function importAllData(payload) {
  if (!payload || typeof payload !== "object" || !payload.data) {
    throw new Error("Arquivo inválido: não parece ser um backup gerado por este sistema.");
  }

  const summary = {};
  for (const table of IMPORT_ORDER) {
    const rows = payload.data[table];
    if (!rows || rows.length === 0) {
      summary[table] = 0;
      continue;
    }
    const { error } = await supabase.from(table).upsert(rows, { onConflict: "id" });
    if (error) throw new Error(`Erro ao importar "${table}": ${error.message}`);
    summary[table] = rows.length;
  }

  return summary;
}
