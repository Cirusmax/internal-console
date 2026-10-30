import { jsPDF } from "jspdf";
import { unzipSync, zipSync, strFromU8, strToU8 } from "fflate";
import content from "../assets/contracts/contract-content.json";
import templateUrl from "../assets/contracts/honorarios-template.docx?url";
import logoUrl from "../assets/logo.png";
import fontUrl from "../assets/fonts/Questrial-Regular.ttf?url";
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
    if (lines.length > 1) {
      let properties = paragraph.getElementsByTagNameNS(W, "pPr")[0];
      if (!properties) { properties = xml.createElementNS(W, "w:pPr"); paragraph.prepend(properties); }
      properties.append(xml.createElementNS(W, "w:keepNext"));
    }
  }
  const result = new XMLSerializer().serializeToString(xml);
  if (/\{\{\w+\}\}/.test(result)) throw new Error("Há campos do contrato que não foram preenchidos.");
  files["word/document.xml"] = strToU8(result);
  return new Blob([zipSync(files)], { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
}

export async function createContractPdf(client, form) {
  const values = buildContractVariables(client, form);
  const [image, fontBuffer] = await Promise.all([asset(logoUrl).then((r) => r.arrayBuffer()), asset(fontUrl).then((r) => r.arrayBuffer())]);
  const font = btoa(Array.from(new Uint8Array(fontBuffer), (byte) => String.fromCharCode(byte)).join(""));
  const doc = new jsPDF({ format: "a4", unit: "mm", compress: true });
  doc.addFileToVFS("Questrial-Regular.ttf", font);
  doc.addFont("Questrial-Regular.ttf", "Questrial", "normal");
  doc.setFont("Questrial", "normal");
  doc.setProperties({ title: "Contrato de prestação de serviços e honorários advocatícios", author: "Almeida Advocacia" });
  const width = 166, left = 22, bottom = 267, line = 5.2;
  const ink = [28, 43, 65], soft = [91, 100, 114], accent = [120, 138, 189];
  let y;
  const header = (first = false) => {
    doc.setFillColor(...ink); doc.rect(0, 0, 210, 5, "F");
    doc.addImage(new Uint8Array(image), "PNG", 22, 18, 18, 18 * 462 / 510);
    doc.setTextColor(...ink); doc.setFontSize(18); doc.text("Almeida Advocacia", 46, 25);
    doc.setTextColor(...soft); doc.setFontSize(10); doc.text(first ? "Contrato de honorários advocatícios" : "Contrato de honorários | Continuação", 46, 32);
    doc.setDrawColor(226, 226, 224); doc.line(22, 43, 188, 43); y = first ? 59 : 54;
  };
  header(true);
  const nextPage = () => { const size = doc.getFontSize(), color = doc.getTextColor(); doc.addPage(); header(); doc.setFontSize(size); doc.setTextColor(color); };
  const rows = content.map((item) => ({ ...item, text: fill(item.text, values) })).filter((item) => item.text);
  for (const item of rows) {
    doc.setFontSize(item.title ? 21 : item.heading ? 11 : item.signature ? 9 : 11);
    doc.setTextColor(...(item.heading ? accent : ink));
    const paragraphs = item.text.split("\n").map((p) => doc.splitTextToSize(p, width));
    const lines = paragraphs.flat();
    if (item.text.startsWith("E, por estarem") && y + lines.length * line + 70 > bottom) nextPage();
    if (item.signature) {
      if (item.text === "CONTRATANTE" && y + 58 > bottom) nextPage();
      if (y + 24 > bottom) nextPage();
      y += 13; doc.setDrawColor(...accent); doc.line(left + 16, y, left + width - 16, y); y += 6;
      doc.text(item.text, 105, y, { align: "center" }); y += 9; continue;
    }
    if (item.title) {
      for (const text of lines) { doc.text(text, left, y); y += 9; }
      y += 10; continue;
    }
    const party = item.text.startsWith("CONTRATANTE:") || item.text.startsWith("CONTRATADO:");
    if (party && y + lines.length * line + 5 > bottom) nextPage();
    if (item.heading && y + line * 3 > bottom) nextPage();
    if (!party && lines.length > 1 && y + line > bottom) nextPage();
    for (const paragraph of paragraphs) for (let i = 0; i < paragraph.length; i++) {
      if (paragraph.length - i === 2 && y + line > bottom) nextPage();
      if (y > bottom) nextPage();
      // Explicit word spacing also justifies lines split before pagination.
      const text = paragraph[i], gaps = text.split(" ").length - 1;
      if (!item.heading && i < paragraph.length - 1 && gaps > 0) {
        const words = text.split(" ");
        const spacing = (width - words.reduce((sum, word) => sum + doc.getTextWidth(word), 0)) / gaps;
        let x = left;
        for (const word of words) { doc.text(word, x, y); x += doc.getTextWidth(word) + spacing; }
      } else doc.text(text, left, y);
      y += line;
    }
    y += party ? 7 : 3.2;
  }
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page++) {
    doc.setPage(page); doc.setFontSize(8); doc.setTextColor(...soft);
    doc.setDrawColor(226, 226, 224); doc.line(22, 279, 188, 279);
    doc.text("Almeida Advocacia | Contrato de prestação de serviços", 22, 286);
    doc.text(`${page} / ${pages}`, 188, 286, { align: "right" });
  }
  return doc;
}

export async function prepareContractDownload(client, form, format) {
  if (format === "pdf") { const doc = await createContractPdf(client, form); return () => doc.save(filename(client, "pdf")); }
  const blob = await createContractDocx(client, form);
  return () => {
    const url = URL.createObjectURL(blob); const link = document.createElement("a");
    link.href = url; link.download = filename(client, "docx"); link.click();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  };
}

export async function downloadContract(client, form, format) {
  (await prepareContractDownload(client, form, format))();
}
