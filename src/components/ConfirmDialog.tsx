import { ModalBackdrop } from "./ModalBackdrop";

interface Props {
  title: string;
  body: string;
  confirmLabel: string;
  cancelLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  body,
  confirmLabel,
  cancelLabel,
  danger,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <ModalBackdrop onClose={onCancel}>
      <div className="modal modal-sm">
        <h2>{title}</h2>
        <p className="confirm-body">{body}</p>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            className={danger ? "btn-danger" : "btn-primary"}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
