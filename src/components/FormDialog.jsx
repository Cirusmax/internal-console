import { useEffect, useRef } from "react";
export function FormDialog({ title, busy, onClose, children }) {
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current.showModal();
    return () => previous?.focus({ preventScroll: true });
  }, []);
  return <dialog ref={dialog} className="modal modal--form" aria-label={title} onCancel={(event) => { event.preventDefault(); if (!busy) onClose(); }}>
    <h2>{title}</h2>{children}
  </dialog>;
}
