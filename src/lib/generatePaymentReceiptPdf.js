import { jsPDF } from "jspdf";
import { supabase } from "./supabaseClient";
import logoUrl from "../assets/logo.png";
import fontUrl from "../assets/fonts/Questrial-Regular.ttf?url";
import { getReceiptIssuerName } from "./receiptIssuers";

const INK = [28, 43, 65];
const SOFT = [91, 100, 114];
const ACCENT = [120, 138, 189];
const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
const timestamp = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo",
});
let assetsPromise;

async function readAsset(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("Não foi possível carregar os elementos do recibo. Tente novamente.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Não foi possível preparar o recibo."));
    reader.readAsDataURL(blob);
  });
}

function loadAssets() {
  if (!assetsPromise) {
    assetsPromise = Promise.all([readAsset(logoUrl), readAsset(fontUrl)])
      .catch((error) => { assetsPromise = null; throw error; });
  }
  return assetsPromise;
}

export async function createPaymentReceiptPdf({ installment, user, issuedAt = new Date() }) {
  const charge = installment?.charge;
  const client = charge?.client;
  const payment = installment?.payment;
  if (!installment?.paid || !payment || payment.id !== installment.transaction_id || payment.type !== "receita") {
    throw new Error("O pagamento não está confirmado. Atualize a página e confira a parcela antes de emitir o recibo.");
  }
  const amount = Number(payment.amount);
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== Math.round(Number(installment.amount) * 100)) {
    throw new Error("O valor do lançamento não corresponde à parcela. Confira o pagamento antes de emitir o recibo.");
  }
  if (!client?.name?.trim() || !charge.description?.trim()) {
    throw new Error("Não foi possível identificar o cliente, a cobrança ou o usuário emissor.");
  }
  const issuerName = getReceiptIssuerName(user);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payment.occurred_on ?? "")) {
    throw new Error("A data do pagamento não está disponível. Confira o lançamento.");
  }

  const [logo, font] = await loadAssets();
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  doc.addFileToVFS("Questrial-Regular.ttf", font.split(",")[1]);
  doc.addFont("Questrial-Regular.ttf", "Questrial", "normal");
  doc.setFont("Questrial", "normal");
  doc.setProperties({ title: `Recibo de pagamento - ${client.name}`, author: issuerName,
    subject: charge.description, creator: "Almeida Advocacia | Internal Console" });

  const reference = `REC-${payment.id.toUpperCase()}`;
  const paymentDate = date.format(new Date(`${payment.occurred_on}T12:00:00-03:00`));
  const installmentLabel = installment.is_down_payment ? "Entrada" : `Parcela ${installment.installment_number} de ${charge.installments_count}`;
  const text = (value, x, y, size, color = INK) => {
    doc.setFontSize(size); doc.setTextColor(...color); doc.text(value, x, y);
  };
  let y;
  const newPage = () => {
    doc.addPage();
    text("Almeida Advocacia", 22, 24, 16);
    text("Recibo de pagamento | Continuação", 22, 32, 10, SOFT);
    doc.setDrawColor(226, 226, 224); doc.line(22, 39, 188, 39);
    y = 52;
  };
  const paragraph = (value, size = 11, color = INK, lineHeight = 6) => {
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(value, 166);
    for (const line of lines) {
      if (y > 231) newPage();
      text(line, 22, y, size, color);
      y += lineHeight;
    }
  };
  const field = (label, value, size = 11) => {
    if (y > 216) newPage();
    text(label, 22, y, 8.5, ACCENT); y += 8;
    paragraph(value, size); y += 8;
  };

  doc.setFillColor(...INK); doc.rect(0, 0, 210, 5, "F");
  doc.addImage(logo, "PNG", 22, 20, 18, 18 * 462 / 510);
  text("Almeida Advocacia", 46, 27, 18);
  text("Comprovante de recebimento", 46, 34, 10, SOFT);
  doc.setDrawColor(226, 226, 224); doc.line(22, 48, 188, 48);
  text("Recibo de pagamento", 22, 66, 27);
  text("Pagamento confirmado | Via do cliente", 22, 76, 10, SOFT);
  doc.setFillColor(231, 234, 245); doc.roundedRect(22, 87, 166, 34, 4, 4, "F");
  text("VALOR RECEBIDO", 30, 97, 8.5, SOFT);
  // The numeric column can also accommodate the largest amount supported by the database.
  text(currency.format(amount), 30, 112, amount >= 100000000 ? 21 : 25);
  text("DATA DO PAGAMENTO", 130, 97, 8.5, SOFT);
  text(paymentDate, 130, 111, 14);

  y = 138;
  field("CLIENTE", client.name.trim(), 17);
  paragraph(`Recebemos de ${client.name.trim()} o valor de ${currency.format(amount)}, referente ao pagamento abaixo identificado.`, 11, SOFT);
  y += 9;
  field("REFERENTE A", charge.description.trim());
  field("IDENTIFICAÇÃO DO PAGAMENTO", installmentLabel);
  paragraph("Este recibo refere-se exclusivamente ao valor e à parcela aqui identificados.", 9.5, SOFT, 5);

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page);
    doc.setDrawColor(226, 226, 224); doc.line(22, 245, 188, 245);
    text("USUÁRIO EMISSOR", 22, 253, 8, ACCENT);
    doc.setFontSize(9);
    text(issuerName, 22, 260, 9);
    text(`Emitido em ${timestamp.format(issuedAt)} (Brasília)`, 22, 277, 8, SOFT);
    text(reference, 22, 284, 7.5, SOFT);
    doc.setFontSize(8); doc.text(`${page} / ${pages}`, 188, 291, { align: "right" });
  }

  const safeName = client.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 70) || "cliente";
  const filename = `recibo-${safeName}-${installment.is_down_payment ? "entrada" : `parcela-${installment.installment_number}`}-${payment.occurred_on}-${payment.id.slice(0, 8)}.pdf`;
  return { doc, filename };
}

export async function downloadPaymentReceipt(installmentId) {
  const [{ data: installment, error }, { data: auth, error: authError }] = await Promise.all([
    supabase.from("client_installments")
      .select("*, charge:client_charges(*, client:clients(*)), payment:transactions(*)")
      .eq("id", installmentId).single(),
    supabase.auth.getUser(),
  ]);
  if (error) throw new Error("Não foi possível consultar o pagamento. Tente novamente.");
  if (authError || !auth.user) throw new Error("Sua sessão precisa ser validada. Entre novamente para emitir o recibo.");
  const { doc, filename } = await createPaymentReceiptPdf({ installment, user: auth.user });
  doc.save(filename);
}
