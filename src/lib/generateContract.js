import { jsPDF } from "jspdf";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import content from "../assets/contracts/contract-content.json";
import templateUrl from "../assets/contracts/honorarios-template.docx?url";
import logoUrl from "../assets/contracts/contract-logo.png";
import { buildContractVariables } from "./contractData";

const fill = (text, values) => text.replace(/\{\{(\w+)\}\}/g, (_, key) => values[key] ?? "");
const filename = (client, format) => `contrato-${client.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 70)}.${format}`;
async function asset(url) { const response = await fetch(url); if (!response.ok) throw new Error("Não foi possível carregar o modelo do contrato. Tente novamente."); return response; }

export async function createContractDocx(client, form) {
  const values = buildContractVariables(client, form);
  const files = unzipSync(new Uint8Array(await (await asset(templateUrl)).arrayBuffer()));
  const xml = new DOMParser().parseFromString(strFromU8(files["word/document.xml"]), "application/xml");
  if (xml.getElementsByTagName("parsererror").length) throw new Error("Não foi possível preparar o modelo Word.");
  const W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
  for (const text of [...xml.getElementsByTagNameNS(W, "t")]) {
    if (!text.textContent.includes("{{")) continue;
    const value = fill(text.textContent, values);
    if (!value) {
      let parent = text;
      while (parent && parent.localName !== "p") parent = parent.parentElement;
      parent?.remove(); continue;
    }
    const lines = value.split("\n"); text.textContent = lines[0];
    text.setAttributeNS("http://www.w3.org/XML/1998/namespace", "xml:space", "preserve");
    let paragraph = text;
    while (paragraph && paragraph.localName !== "p") paragraph = paragraph.parentElement;
    let previous = paragraph;
    for (const line of lines.slice(1)) {
      // Separate paragraphs avoid Word stretching short payment-schedule lines under justification.
      const next = paragraph.cloneNode(true);
      const texts = [...next.getElementsByTagNameNS(W, "t")];
      texts.forEach((node, i) => { node.textContent = i === 0 ? line : ""; });
      [...next.getElementsByTagNameNS(W, "bookmarkStart"), ...next.getElementsByTagNameNS(W, "bookmarkEnd")].forEach((node) => node.remove());
      previous.after(next); previous = next;
    }
  }
  const result = new XMLSerializer().serializeToString(xml);
  if (/\{\{\w+\}\}/.test(result)) throw new Error("Há campos do contrato que não foram preenchidos.");
  files["word/document.xml"] = strToU8(result);
  return new Blob([zipSync(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function createContractPdf(client, form) {
  const values = buildContractVariables(client, form);
  const image = new Uint8Array(await (await asset(logoUrl)).arrayBuffer());
  const doc = new jsPDF({ format: "letter", unit: "mm", compress: true });
  doc.setProperties({ title: "Contrato de prestação de serviços e honorários advocatícios", author: "Almeida Advocacia" });
  const width = 155.9, left = 30, bottom = 248, line = 6.5;
  let y = 34;
  const header = () => { doc.addImage(image, "PNG", 101.45, 12, 13, 13); };
  header();
  const nextPage = () => { doc.addPage(); header(); y = 34; };
  const rows = content.map((item) => ({ ...item, text: fill(item.text, values) })).filter((item) => item.text);
  for (const item of rows) {
    doc.setFont("helvetica", item.heading || item.title ? "bold" : "normal");
    doc.setFontSize(item.signature ? 9 : 12); doc.setTextColor(0);
    const lines = item.text.split("\n").flatMap((p) => doc.splitTextToSize(p, width - (item.text.startsWith("CONTRAT") && !item.title ? 4 : 0)));
    if (item.text.startsWith("E, por estarem") && y + lines.length * line + 70 > bottom) nextPage();
    if (item.signature) {
      if (item.text === "CONTRATANTE" && y + 58 > bottom) nextPage();
      if (y + 24 > bottom) nextPage();
      y += 13; doc.setDrawColor(0); doc.line(left, y, left + width, y); y += 6;
      doc.text(item.text, 107.95, y, { align: "center" }); y += 9; continue;
    }
    if (item.title) {
      for (const text of lines) { doc.text(text, 107.95, y, { align: "center" }); y += line; }
      y += 15; continue;
    }
    const party = item.text.startsWith("CONTRATANTE:") || item.text.startsWith("CONTRATADO:");
    if (party && y + lines.length * line + 5 > bottom) nextPage();
    if (item.heading && y + line * 3 > bottom) nextPage();
    if (!party && lines.length > 1 && y + line > bottom) nextPage();
    if (party) { doc.setDrawColor(0); doc.rect(left - 2, y - 5, width + 4, lines.length * line + 4); }
    for (let i = 0; i < lines.length; i++) {
      if (lines.length - i === 2 && y + line > bottom) nextPage();
      if (y > bottom) nextPage();
      doc.text(lines[i], left, y, { maxWidth: width, align: !party && !item.heading && i < lines.length - 1 ? "justify" : "left" });
      y += line;
    }
    y += party ? 8 : 4;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(100);
    doc.text(`${page} / ${pages}`, 185.9, 268, { align: "right" });
  }
  return doc;
}

export async function downloadContract(client, form, format) {
  if (format === "pdf") { (await createContractPdf(client, form)).save(filename(client, "pdf")); return; }
  const blob = await createContractDocx(client, form);
  const url = URL.createObjectURL(blob); const link = document.createElement("a");
  link.href = url; link.download = filename(client, "docx"); link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
