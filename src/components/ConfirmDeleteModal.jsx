export function ConfirmDeleteModal({ transaction, isOwnEntry, onConfirm, onClose }) {
  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <h2>Excluir lançamento</h2>

        {isOwnEntry ? (
          <p>Tem certeza que deseja excluir este lançamento?</p>
        ) : (
          <div className="form-error">
            Este lançamento foi criado por <strong>{transaction.created_by_email}</strong>. Tem certeza
            que deseja excluir mesmo assim?
          </div>
        )}

        <div className="modal-actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn--danger" onClick={onConfirm}>
            Excluir
          </button>
        </div>
      </div>
    </div>
  );
}
