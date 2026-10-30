export function clientFormValues(client = {}) {
  return Object.fromEntries(["name", "cpf", "nationality", "marital_status", "profession", "address", "email", "phone", "notes"]
    .map((key) => [key, client?.[key] ?? ""]));
}

export function formatCpf(value = "") {
  return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

export function isValidCpf(value) {
  const digits = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(digits) || /^(\d)\1{10}$/.test(digits)) return false;
  for (let length = 9; length <= 10; length++) {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    if ((sum * 10 % 11) % 10 !== Number(digits[length])) return false;
  }
  return true;
}

export function parseClientProfile(form) {
  const value = Object.fromEntries(Object.entries(clientFormValues(form)).map(([key, text]) => [key, text.trim()]));
  if (!value.name) throw new Error("Informe o nome completo do cliente.");
  if (!isValidCpf(value.cpf)) throw new Error("Informe um CPF válido.");
  if (!value.nationality || !value.marital_status || !value.address) throw new Error("Preencha nacionalidade, estado civil e endereço completo.");
  value.cpf = value.cpf.replace(/\D/g, "");
  return value;
}
