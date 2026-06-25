import { useRef } from "react";

interface Props {
  onClose: () => void;
  children: React.ReactNode;
}

export function ModalBackdrop({ onClose, children }: Props) {
  const mouseDownOnBackdrop = useRef(false);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => { mouseDownOnBackdrop.current = e.target === e.currentTarget; }}
      onMouseUp={(e) => {
        if (e.target === e.currentTarget && mouseDownOnBackdrop.current) onClose();
        mouseDownOnBackdrop.current = false;
      }}
    >
      {children}
    </div>
  );
}
