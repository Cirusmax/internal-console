import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Keep this ID stable across deployments of the same announcement.
const RELEASE_ID = "2026-10-30-contracts";
const SEEN_FIELD = "internal_console_seen_release";

function ReleaseDialog({ onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialog.current.showModal();
    return () => previouslyFocused?.focus({ preventScroll: true });
  }, []);

  return (
    <dialog ref={dialog} className="modal release-announcement" aria-labelledby="release-title"
      aria-describedby="release-description" onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="eyebrow">Novidades</div>
      <h2 id="release-title" tabIndex={-1} autoFocus>O sistema foi atualizado</h2>
      <p id="release-description">Veja o que mudou na aba Clientes.</p>
      <ul className="release-announcement__changes">
        <li><strong>Cadastro completo e CEP automático</strong><span>Preencha o CEP para buscar o endereço e informe o número. Use o lápis para editar o cadastro ou o nome do serviço.</span><small>Clientes → Novo cliente ou ícone de lápis</small></li>
        <li><strong>Contratos em PDF e Word</strong><span>Escolha o serviço, os honorários e a forma de pagamento. O modelo segue o visual do recibo e distingue contratos cíveis e trabalhistas.</span><small>Clientes → Gerar contrato</small></li>
        <li><strong>Parcelas geradas pelo contrato</strong><span>Valores fixos a pagar criam a cobrança e as parcelas automaticamente. Se já estiver integralmente pago ou for somente de êxito, não são criadas parcelas.</span><small>Gerar contrato → Situação do valor fixo e Pagamento</small></li>
        <li><strong>Histórico dos termos contratados</strong><span>Consulte serviço, valor, entrada, vencimentos e percentual de êxito. Somente o resumo fica salvo, sem guardar PDF ou Word. Repetir o download dos mesmos termos não duplica o registro.</span><small>Clientes → Abra o cliente → Contratos gerados</small></li>
        <li><strong>Recibos de pagamento</strong><span>Baixe o comprovante em PDF com cliente, valor, logomarca e nome do usuário emissor.</span><small>Clientes → Parcela paga → Baixar recibo</small></li>
      </ul>
      <button className="btn btn--primary btn--block" onClick={onClose}>Entendi, continuar</button>
    </dialog>
  );
}

export function ReleaseAnnouncement() {
  const { user } = useAuth();
  const userId = user?.id;
  const [visibleFor, setVisibleFor] = useState(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const checkRelease = async () => {
      try {
        // Fetch the profile from the server so another browser/device also knows it was seen.
        const { data, error } = await supabase.auth.getUser();
        if (cancelled || error || data.user?.id !== userId
          || data.user.user_metadata?.[SEEN_FIELD] === RELEASE_ID) return;

        // Record before displaying, so refreshing or leaving without clicking does not repeat it.
        // This is a display preference only; it is never used for authorization.
        const { data: saved, error: saveError } = await supabase.auth.updateUser({
          data: { [SEEN_FIELD]: RELEASE_ID },
        });
        if (!cancelled && !saveError && saved.user?.id === userId) setVisibleFor(userId);
      } catch {
        // A connection issue must not block the app. Try again on the next access.
      }
    };

    checkRelease();
    return () => { cancelled = true; };
  }, [userId]);

  return visibleFor && visibleFor === userId
    ? <ReleaseDialog key={userId} onClose={() => setVisibleFor(null)} /> : null;
}
