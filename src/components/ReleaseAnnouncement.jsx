import { useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";

// Keep this ID stable across deployments of the same announcement.
const RELEASE_ID = "2026-10-clientes";
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
        <li><strong>Cobranças sob judice</strong><span>Identifique cobranças em discussão judicial e retire a marcação quando precisar.</span></li>
        <li><strong>Clientes arquivados</strong><span>Arquive clientes quitados, consulte o histórico em Arquivados e restaure quando quiser.</span></li>
        <li><strong>Exclusão de cobranças</strong><span>Exclua com confirmação, preservando as receitas já recebidas.</span></li>
        <li><strong>Navegação mais suave</strong><span>Arquive e altere pagamentos ou o status sob judice sem voltar ao topo da página.</span></li>
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
