import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const dateFormatter = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
const INK = [28, 43, 65];

function buildConclusion({ receitas, despesas, saldo, categoryTotals, count }) {
  const lines = [];

  if (count === 0) {
    return ["Nenhum lançamento encontrado para este período."];
  }

  if (saldo > 0) {
    lines.push(
      `O período fechou com saldo positivo de ${currencyFormatter.format(saldo)}: as receitas superaram as despesas.`
    );
  } else if (saldo < 0) {
    lines.push(
      `O período fechou com saldo negativo de ${currencyFormatter.format(Math.abs(saldo))}: as despesas superaram as receitas. Vale atenção.`
    );
  } else {
    lines.push("O período fechou com saldo neutro: receitas e despesas se equivaleram.");
  }

  lines.push(
    `Foram registrados ${count} lançamento(s) no período, somando ${currencyFormatter.format(
      receitas
    )} em receitas e ${currencyFormatter.format(despesas)} em despesas.`
  );

  const sortedCategories = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
  if (sortedCategories.length > 0) {
    const [topCategory, topAmount] = sortedCategories[0];
    const pct = despesas > 0 ? ((topAmount / despesas) * 100).toFixed(0) : 0;
    lines.push(
      `A maior categoria de despesa foi "${topCategory}", somando ${currencyFormatter.format(
        topAmount
      )} (${pct}% do total de despesas do período).`
    );
  }

  return lines;
}

export function generateMovementsReportPdf({ transactions, periodLabel }) {
  const doc = new jsPDF();

  const receitas = transactions
    .filter((t) => t.type === "receita")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const despesas = transactions
    .filter((t) => t.type === "despesa")
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const saldo = receitas - despesas;

  const categoryTotals = {};
  for (const t of transactions) {
    if (t.type !== "despesa") continue;
    categoryTotals[t.category] = (categoryTotals[t.category] ?? 0) + Number(t.amount);
  }

  doc.setFontSize(16);
  doc.setTextColor(...INK);
  doc.text("Relatório de Movimentações", 14, 18);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Período: ${periodLabel}`, 14, 25);
  doc.text(`Gerado em: ${dateFormatter.format(new Date())}`, 14, 30);

  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(`Receitas: ${currencyFormatter.format(receitas)}`, 14, 40);
  doc.text(`Despesas: ${currencyFormatter.format(despesas)}`, 14, 46);
  doc.text(`Saldo: ${currencyFormatter.format(saldo)}`, 14, 52);

  const rows = transactions
    .slice()
    .sort((a, b) => a.occurred_on.localeCompare(b.occurred_on))
    .map((t) => [
      dateFormatter.format(new Date(`${t.occurred_on}T00:00:00`)),
      t.type === "receita" ? "Receita" : "Despesa",
      t.category,
      t.description || "—",
      `${t.type === "despesa" ? "-" : "+"}${currencyFormatter.format(t.amount)}`,
    ]);

  autoTable(doc, {
    startY: 60,
    head: [["Data", "Tipo", "Categoria", "Descrição", "Valor"]],
    body: rows,
    styles: { fontSize: 9 },
    headStyles: { fillColor: INK },
    margin: { left: 14, right: 14 },
  });

  const finalY = (doc.lastAutoTable?.finalY ?? 60) + 12;
  doc.setFontSize(13);
  doc.setTextColor(...INK);
  doc.text("Conclusão", 14, finalY);

  doc.setFontSize(10);
  doc.setTextColor(60);
  const conclusionLines = buildConclusion({ receitas, despesas, saldo, categoryTotals, count: transactions.length });

  let y = finalY + 8;
  for (const line of conclusionLines) {
    const wrapped = doc.splitTextToSize(line, 182);
    if (y + wrapped.length * 5 > 285) {
      doc.addPage();
      y = 20;
    }
    doc.text(wrapped, 14, y);
    y += wrapped.length * 5 + 4;
  }

  const filenameSafe = periodLabel.replace(/[^\w-]+/g, "_");
  doc.save(`relatorio-movimentacoes-${filenameSafe}.pdf`);
}
