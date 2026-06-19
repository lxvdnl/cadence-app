import { useState } from "react";
import { t } from "../i18n";

interface Props {
  onClose: () => void;
  onCreate: (title: string, estDays: number) => Promise<void>;
}

export function AddSimpleItemModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [estDays, setEstDays] = useState(0);

  const handleCreate = async () => {
    const name = title.trim();
    if (!name) return;
    await onCreate(name, estDays);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("simple.addItemTitle")}</h2>

        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("simple.addItem")}
          autoFocus
        />

        <div className="ci-setting-row ci-setting-last">
          <span className="ci-setting-label">{t("topic.estDays")}</span>
          <div className="ci-counter">
            <button
              className="ci-btn"
              disabled={estDays <= 0}
              onClick={() => setEstDays((v) => Math.max(0, v - 1))}
            >
              −
            </button>
            <span className="ci-count">{estDays}</span>
            <button className="ci-btn" onClick={() => setEstDays((v) => v + 1)}>
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
    </div>
  );
}
