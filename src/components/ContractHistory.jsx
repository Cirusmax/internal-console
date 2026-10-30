const date = (value) => value.split("-").reverse().join("/");
const issued = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" });

export function ContractHistory({ contracts }) {
  if (!contracts.length) return null;
  return <details className="contract-history">
    <summary>Contratos gerados ({contracts.length})</summary>
    <div className="contract-history__items">{contracts.map((contract) => <article key={contract.id} className="contract-history__item">
      <div className="contract-history__heading"><strong>Contrato gerado · {contract.kind === "labor" ? "Trabalhista" : "Cível"}</strong>
        <time dateTime={contract.created_at}>{issued.format(new Date(contract.created_at))}</time></div>
      <p>{contract.service}</p>
      <p className="contract-history__terms">{contract.terms}</p>
      <p className="contract-history__date">Data do contrato: {date(contract.contract_date)} · {contract.city}</p>
    </article>)}</div>
  </details>;
}
