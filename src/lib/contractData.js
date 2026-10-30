import { parseClientProfile, formatCpf } from "./clientProfile.js";
const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const shortDate = (value) => value.split("-").reverse().join("/");
export const LABOR_FEE_CLAUSE = "Disposição específica para serviços trabalhistas: quando expressamente pactuados nesta cláusula, os honorários de êxito incidirão também sobre os valores recebidos pela Parte Contratante a título de FGTS, seguro-desemprego e demais verbas e valores provenientes da demanda trabalhista objeto deste contrato, inclusive aqueles liberados em decorrência da atuação contratada.";

export function currentContractDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
function requireDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "") || !Number.isFinite(Date.parse(`${value}T12:00:00Z`))
    || new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) !== value) throw new Error("Informe uma data válida.");
  return value;
}
export function contractSchedule(amount, entry, count, firstDate) {
  requireDate(firstDate);
  const cents = Math.round((amount - entry) * 100);
  if (!Number.isInteger(count) || count < 1 || count > 60 || cents < count) throw new Error("Informe de 1 a 60 parcelas, com valor positivo em cada parcela.");
  const [year, month, day] = firstDate.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const last = new Date(Date.UTC(year, month + i, 0)).getUTCDate();
    const due = new Date(Date.UTC(year, month - 1 + i, Math.min(day, last))).toISOString().slice(0, 10);
    return { amount: (Math.floor(cents / count) + (i === count - 1 ? cents % count : 0)) / 100, date: due };
  });
}
export function buildContractVariables(client, form) {
  const person = parseClientProfile(client);
  if (!["civil", "labor"].includes(form.kind)) throw new Error("Selecione contrato cível ou trabalhista.");
  if (!form.description.trim()) throw new Error("Descreva o serviço contratado.");
  if (!form.city.trim()) throw new Error("Informe a cidade/UF de assinatura.");
  requireDate(form.date);
  if (!["fixed", "mixed", "success"].includes(form.feeMode)) throw new Error("Selecione o tipo de honorários.");
  const amount = Number(form.amount);
  const percent = Number(form.successPercent);
  if (form.feeMode !== "success" && (!Number.isFinite(amount) || amount <= 0 || amount > 9999999999.99)) throw new Error("Informe um valor de honorários fixos maior que zero.");
  if (form.feeMode !== "fixed" && (!Number.isFinite(percent) || percent <= 0 || percent > 100)) throw new Error("Informe um percentual de êxito entre 0 e 100.");
  let fees = "";
  if (form.feeMode !== "success") {
    fees = `Os honorários advocatícios fixos são pactuados em ${money.format(amount)}`;
    if (form.paymentStatus === "paid") fees += ", já integralmente pagos pela Parte Contratante.";
    else if (form.paymentMode === "signature") fees += ", a serem pagos na assinatura deste contrato.";
    else if (form.paymentMode === "date") fees += `, a serem pagos em parcela única em ${shortDate(requireDate(form.firstDueDate))}.`;
    else if (form.paymentMode === "installments") {
      const entry = Number(form.entry) || 0;
      if (entry < 0 || entry >= amount) throw new Error("A entrada deve ser menor que o valor total.");
      const schedule = form.existingSchedule ?? contractSchedule(amount, entry, Number(form.count), form.firstDueDate);
      if (form.existingSchedule && Math.round((schedule.reduce((sum, item) => sum + item.amount, 0) + entry) * 100) !== Math.round(amount * 100)) throw new Error("Confira as parcelas da cobrança selecionada antes de gerar o contrato.");
      fees += entry > 0 ? `, com entrada de ${money.format(entry)} em ${shortDate(requireDate(form.entryDate))}` : "";
      fees += `, sendo o ${entry > 0 ? "saldo restante" : "valor total"} dividido em ${schedule.length} parcela(s), conforme o seguinte cronograma:\n`;
      fees += schedule.map((item, i) => `Parcela ${i + 1}: ${money.format(item.amount)}, com vencimento em ${shortDate(item.date)}.`).join("\n");
    } else throw new Error("Selecione a forma de pagamento.");
  }
  if (form.feeMode !== "fixed") {
    fees += `${fees ? "\nAdicionalmente, " : ""}Os honorários de êxito são pactuados em ${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(percent)}% sobre o proveito econômico obtido pela Parte Contratante, devidos ao final em caso de êxito da demanda.`;
  }
  const dateText = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "numeric", month: "long", year: "numeric" }).format(new Date(`${form.date}T12:00:00-03:00`));
  return {
    CLIENTE: `CONTRATANTE: ${person.name}, ${person.nationality}, ${person.marital_status.toLowerCase()}${person.profession ? `, ${person.profession}` : ""}, CPF nº ${formatCpf(person.cpf)}, residente e domiciliado(a) em ${person.address.replace(/\s+/g, " ")}.`,
    OBJETO: `A Parte Contratante contrata os serviços do Contratado para a finalidade descrita no mandato que lhe foi outorgado, qual seja: ${form.description.trim().replace(/[.]+$/, "")}.`,
    HONORARIOS: fees,
    TRABALHISTA: form.kind === "labor" ? LABOR_FEE_CLAUSE : "",
    LOCAL_DATA: `${form.city.trim()}, ${dateText}.`,
  };
}
