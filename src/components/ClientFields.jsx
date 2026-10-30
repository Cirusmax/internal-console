import { useEffect, useRef, useState } from "react";
import { formatCpf, formatCep, withAddress } from "../lib/clientProfile";

export function ClientFields({ value, onChange, prefix = "client" }) {
  const current = useRef({ value, onChange }); current.current = { value, onChange };
  const code = (value.postal_code ?? "").replace(/\D/g, "");
  const previous = useRef(value.street && value.city ? code : "");
  const [retry, setRetry] = useState(0);
  const [lookup, setLookup] = useState({ state: "", message: "" });
  const structured = Boolean(code || value.street || value.city || value.address_number);
  useEffect(() => {
    if (code.length !== 8 || (previous.current === code && retry === 0)) return;
    let cancelled = false;
    const controller = new AbortController(); let timeout;
    const timer = setTimeout(async () => {
      setLookup({ state: "loading", message: "Consultando CEP..." });
      timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${code}/json/`, { signal: controller.signal });
        if (!response.ok) throw new Error("Não foi possível consultar o CEP. Preencha o endereço manualmente ou tente novamente.");
        const data = await response.json();
        if (data.erro) throw new Error("CEP não encontrado. Confira os números ou preencha o endereço manualmente.");
        if (cancelled || (current.current.value.postal_code ?? "").replace(/\D/g, "") !== code) return;
        const next = { ...current.current.value, street: data.logradouro ?? "", neighborhood: data.bairro ?? "", city: data.localidade ?? "", state: data.uf ?? "" };
        current.current.onChange(withAddress(next)); previous.current = code;
        setLookup({ state: "success", message: data.logradouro ? "Endereço preenchido. Informe o número e, se necessário, o complemento." : "CEP localizado. Complete a rua e o número." });
      } catch (error) {
        if (!cancelled) setLookup({ state: "error", message: error.name === "AbortError" ? "A consulta demorou. Tente novamente ou preencha manualmente." : error.message });
      } finally { clearTimeout(timeout); }
    }, 350);
    return () => { cancelled = true; clearTimeout(timer); clearTimeout(timeout); controller.abort(); };
  }, [code, retry]);
  const changeAddress = (key, text) => onChange(withAddress({ ...value, [key]: text }));
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
      <label htmlFor={`${prefix}-postal_code`}>CEP</label>
      <div className="cep-input"><input id={`${prefix}-postal_code`} inputMode="numeric" maxLength={9} autoComplete="postal-code" placeholder="00000-000" value={formatCep(code)}
        onChange={(event) => {
          const postal_code = event.target.value.replace(/\D/g, "").slice(0, 8);
          previous.current = ""; setLookup({ state: "", message: "" });
          onChange({ ...value, postal_code, street: "", neighborhood: "", city: "", state: "", address_number: "", address_complement: "", address: "" });
        }} />
        <button type="button" className="btn btn--ghost btn--sm" disabled={code.length !== 8 || lookup.state === "loading"} onClick={() => setRetry((n) => n + 1)}>Buscar CEP</button>
      </div>
      {lookup.message && <p className={`cep-feedback ${lookup.state === "error" ? "cep-feedback--error" : ""}`} role={lookup.state === "error" ? "alert" : "status"}>{lookup.message}</p>}
    </div>
    {structured && <>
      <div className="form-row">
        <div className="form-field"><label htmlFor={`${prefix}-street`}>Rua / logradouro</label><input id={`${prefix}-street`} value={value.street} required onChange={(event) => changeAddress("street", event.target.value)} /></div>
        <div className="form-field"><label htmlFor={`${prefix}-address_number`}>Número</label><input id={`${prefix}-address_number`} value={value.address_number} required placeholder="Número ou S/N" onChange={(event) => changeAddress("address_number", event.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-field"><label htmlFor={`${prefix}-address_complement`}>Complemento (opcional)</label><input id={`${prefix}-address_complement`} value={value.address_complement} onChange={(event) => changeAddress("address_complement", event.target.value)} /></div>
        <div className="form-field"><label htmlFor={`${prefix}-neighborhood`}>Bairro</label><input id={`${prefix}-neighborhood`} value={value.neighborhood} onChange={(event) => changeAddress("neighborhood", event.target.value)} /></div>
      </div>
      <div className="form-row">
        <div className="form-field"><label htmlFor={`${prefix}-city`}>Cidade</label><input id={`${prefix}-city`} value={value.city} required onChange={(event) => changeAddress("city", event.target.value)} /></div>
        <div className="form-field"><label htmlFor={`${prefix}-state`}>UF</label><input id={`${prefix}-state`} value={value.state} maxLength={2} required onChange={(event) => changeAddress("state", event.target.value.toUpperCase())} /></div>
      </div>
    </>}
    <div className="form-field">
      <label htmlFor={`${prefix}-address`}>Endereço completo</label>
      <textarea id={`${prefix}-address`} rows={2} required readOnly={structured} value={value.address} autoComplete="street-address" placeholder="Rua, número, complemento, bairro, cidade/UF e CEP" onChange={(event) => onChange({ ...value, address: event.target.value })} />
    </div>
    <div className="form-row">
      {input("email", "E-mail (opcional)", { type: "email", autoComplete: "email" })}
      {input("phone", "Telefone / WhatsApp (opcional)", { type: "tel", autoComplete: "tel" })}
    </div>
  </>;
}
