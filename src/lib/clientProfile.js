export function clientFormValues(client = {}) {
  return Object.fromEntries(["name", "cpf", "nationality", "marital_status", "profession", "address", "postal_code", "street", "address_number", "address_complement", "neighborhood", "city", "state", "email", "phone", "notes"]
    .map((key) => [key, client?.[key] ?? ""]));
}

export const formatCep = (value = "") => value.replace(/\D/g, "").slice(0, 8).replace(/(\d{5})(\d)/, "$1-$2");

export function withAddress(value) {
  const street = [value.street?.trim(), value.address_number?.trim() ? `nº ${value.address_number.trim()}` : "", value.address_complement?.trim()].filter(Boolean).join(", ");
  const locality = [value.city?.trim(), value.state?.trim().toUpperCase()].filter(Boolean).join("/");
  return { ...value, address: [street, value.neighborhood?.trim(), locality, value.postal_code ? `CEP ${formatCep(value.postal_code)}` : ""].filter(Boolean).join(", ") };
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
  value.postal_code = value.postal_code.replace(/\D/g, "");
  value.state = value.state.toUpperCase();
  if (value.postal_code && value.postal_code.length !== 8) throw new Error("Informe um CEP com 8 dígitos.");
  if (value.postal_code || value.street || value.address_number || value.city || value.state) {
    if (!value.street || !value.address_number || !value.city || !/^[A-Z]{2}$/.test(value.state)) throw new Error("Complete a rua, o número, a cidade e a UF do endereço.");
    value.address = withAddress(value).address;
  }
  if (!value.name) throw new Error("Informe o nome completo do cliente.");
  if (!isValidCpf(value.cpf)) throw new Error("Informe um CPF válido.");
  if (!value.nationality || !value.marital_status || !value.address) throw new Error("Preencha nacionalidade, estado civil e endereço completo.");
  value.cpf = value.cpf.replace(/\D/g, "");
  return value;
}
