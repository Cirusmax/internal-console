// Display names for receipt issuance only; this is not an authorization rule.
// Match the verified account ID rather than editable profile metadata or email text.
const RECEIPT_ISSUERS = Object.freeze({
  "d4fd048a-5d9f-4982-9d36-2b5fcdddfe3d": "Thiago Almeida",
  "98a10a77-ca8f-49c3-9b20-dba06e6d79cb": "Giovanni Almeida",
});

export function getReceiptIssuerName(user) {
  const name = RECEIPT_ISSUERS[user?.id];
  if (!name) throw new Error("O usuário emissor do recibo não está cadastrado. Utilize a conta de Thiago Almeida ou Giovanni Almeida.");
  return name;
}
