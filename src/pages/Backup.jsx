import { useRef, useState } from "react";
import { exportAllData, importAllData } from "../lib/backupData";

const TABLE_LABEL = {
  clients: "Clientes",
  recurring_rules: "Recorrentes",
  client_charges: "Cobranças",
  transactions: "Lançamentos",
  client_installments: "Parcelas",
};

export function Backup() {
  const fileInputRef = useRef(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text }
  const [importSummary, setImportSummary] = useState(null);

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    try {
      await exportAllData();
      setMessage({ type: "success", text: "Backup baixado com sucesso." });
    } catch (err) {
      setMessage({ type: "error", text: err.message ?? "Não foi possível exportar os dados." });
    } finally {
      setExporting(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (
      !window.confirm(
        "Importar este backup? Registros com o mesmo ID já existente serão atualizados; os demais serão criados. Nada é apagado, mas dados existentes podem ser sobrescritos. Continuar?"
      )
    ) {
      return;
    }

    setImporting(true);
    setMessage(null);
    setImportSummary(null);
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      const summary = await importAllData(payload);
      setImportSummary(summary);
      setMessage({ type: "success", text: "Importação concluída com sucesso." });
    } catch (err) {
      setMessage({ type: "error", text: err.message ?? "Não foi possível importar o arquivo." });
    } finally {
      setImporting(false);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Backup</h1>
          <p>Exportar e importar todos os dados do sistema em um arquivo JSON.</p>
        </div>
      </div>

      {message && <div className={message.type === "error" ? "form-error" : "form-error form-error--ok"}>{message.text}</div>}

      <div className="charts-grid">
        <div className="chart-card">
          <h3>Exportar dados</h3>
          <p>
            Baixa um arquivo <code>.json</code> com todos os clientes, cobranças, parcelas, recorrentes e
            lançamentos. Guarde esse arquivo em um lugar seguro — ele serve pra restaurar os dados caso algo dê
            errado.
          </p>
          <button className="btn btn--primary" onClick={handleExport} disabled={exporting}>
            {exporting ? "Gerando..." : "Baixar backup (JSON)"}
          </button>
        </div>

        <div className="chart-card">
          <h3>Importar dados</h3>
          <p>
            Restaura a partir de um arquivo de backup gerado por aqui. Registros com o mesmo ID já existente são
            atualizados; os demais são criados — nada é apagado automaticamente. Lançamentos importados aparecem
            com autoria de quem fez a importação. O histórico de Atividade não é restaurado (é só um log).
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            disabled={importing}
            style={{ marginBottom: 12 }}
          />
          {importing && <p>Importando...</p>}
          {importSummary && (
            <ul style={{ margin: 0, paddingLeft: 18 }}>
              {Object.entries(importSummary).map(([table, count]) => (
                <li key={table}>
                  {TABLE_LABEL[table] ?? table}: {count} registro(s)
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
