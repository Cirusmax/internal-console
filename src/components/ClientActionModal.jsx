import { useEffect, useRef } from "react";

export function ClientActionModal({ title, message, label, danger, busy, error, onConfirm, onClose }) {
  const dialog = useRef(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    dialog.current?.querySelector("button")?.focus();
    return () => previouslyFocused?.focus();
  }, []);

  const handleKeyDown = (event) => {
    if (event.key === "Escape" && !busy) onClose();
    if (event.key !== "Tab") return;
    const buttons = [...dialog.current.querySelectorAll("button:not(:disabled)")];
    if (!buttons.length) { event.preventDefault(); return; }
    const first = buttons[0];
    const last = buttons[buttons.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault(); last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault(); first.focus();
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(event) => !busy && event.target === event.currentTarget && onClose()}>
      <div className="modal" ref={dialog} role="dialog" aria-modal="true" aria-labelledby="client-action-title" aria-describedby="client-action-message" onKeyDown={handleKeyDown}>
        <h2 id="client-action-title">{title}</h2>
        <p id="client-action-message">{message}</p>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="modal-actions">
          <button className="btn btn--ghost" disabled={busy} onClick={onClose}>Cancelar</button>
          <button className={`btn ${danger ? "btn--danger" : "btn--primary"}`} disabled={busy} onClick={onConfirm}>
            {busy ? "Salvando..." : label}
          </button>
        </div>
      </div>
    </div>
  );
}
