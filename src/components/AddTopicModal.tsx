import { useRef, useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  onClose: () => void;
  onCreate: (title: string, estDays: number) => Promise<void>;
}

export function AddTopicModal({ onClose, onCreate }: Props) {
  const [title, setTitle] = useState("");
  const [estDays, setEstDays] = useState(1);
  const titleRef = useRef<HTMLInputElement>(null);

  const handleCreate = async () => {
    const name = title.trim();
    if (!name) return;
    await onCreate(name, estDays);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("roadmap.addTopicTitle")}</h2>

        <input
          ref={titleRef}
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("roadmap.topicPlaceholder")}
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
    </ModalBackdrop>
  );
}
