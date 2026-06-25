import { useEffect, useRef, useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  onClose: () => void;
  onCreate: (title: string, target: number) => Promise<void>;
}

export function AddCycleItemModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [target, setTarget] = useState(1);
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleCreate = async () => {
    const name = title.trim();
    if (!name) return;
    await onCreate(name, target);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("cycle.addItemTitle")}</h2>

        <input
          ref={titleRef}
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("cycle.itemPlaceholder")}
          autoFocus
        />

        <div className="ci-setting-row ci-setting-last">
          <span className="ci-setting-label">{t("cycle.targetTitle")}</span>
          <div className="ci-counter">
            <button
              className="ci-btn"
              disabled={target <= 1}
              onClick={() => setTarget((v) => Math.max(1, v - 1))}
            >
              −
            </button>
            <span className="ci-count">{target}</span>
            <button className="ci-btn" onClick={() => setTarget((v) => v + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!title.trim()}
          >
            {t("common.create")}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
