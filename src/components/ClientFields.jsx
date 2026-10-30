import { formatCpf } from "../lib/clientProfile";

export function ClientFields({ value, onChange, prefix = "client" }) {
  const input = (key, label, options = {}) => (
    <div className="form-field">
      <label htmlFor={`${prefix}-${key}`}>{label}</label>
      <input id={`${prefix}-${key}`} value={key === "cpf" ? formatCpf(value[key]) : value[key]}
        onChange={(event) => onChange({ ...value, [key]: key === "cpf" ? event.target.value.replace(/\D/g, "").slice(0, 11) : event.target.value })} {...options} />
    </div>
  );
  return <>
    {input("name", "Nome completo", { required: true, autoComplete: "name" })}
    <div className="form-row">
      {input("cpf", "CPF", { required: true, inputMode: "numeric", placeholder: "000.000.000-00", maxLength: 14 })}
      {input("nationality", "Nacionalidade", { required: true, placeholder: "Ex.: brasileira" })}
    </div>
    <div className="form-row">
      <div className="form-field">
        <label htmlFor={`${prefix}-marital_status`}>Estado civil</label>
        <select id={`${prefix}-marital_status`} value={value.marital_status} onChange={(event) => onChange({ ...value, marital_status: event.target.value })} required>
          <option value="">Selecione</option>
          {["Solteiro(a)", "Casado(a)", "Divorciado(a)", "Viúvo(a)", "Separado(a)", "União estável"].map((option) => <option key={option}>{option}</option>)}
        </select>
      </div>
      {input("profession", "Profissão (opcional)", { placeholder: "Ex.: autônomo(a)" })}
    </div>
    <div className="form-field">
      <label htmlFor={`${prefix}-address`}>Endereço completo</label>
      <textarea id={`${prefix}-address`} rows={2} required value={value.address} autoComplete="street-address" placeholder="Rua, número, complemento, bairro, cidade/UF e CEP" onChange={(event) => onChange({ ...value, address: event.target.value })} />
    </div>
    <div className="form-row">
      {input("email", "E-mail (opcional)", { type: "email", autoComplete: "email" })}
      {input("phone", "Telefone / WhatsApp (opcional)", { type: "tel", autoComplete: "tel" })}
    </div>
  </>;
}
