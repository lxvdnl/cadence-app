import { useState } from "react";
import type { Topic } from "../types";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  topic: Topic;
  onClose: () => void;
  onSave: (title: string, estDays: number) => Promise<void>;
}

export function TopicSettingsModal({ topic, onClose, onSave }: Props) {
  const [title, setTitle] = useState(topic.title);
  const [estDays, setEstDays] = useState(topic.est_hours);

  const changed = title.trim() !== topic.title || estDays !== topic.est_hours;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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

        <div className="ci-settings-footer modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          {changed && title.trim() && (
            <button
              className="btn-primary"
              onClick={() => onSave(title.trim(), estDays)}
            >
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}
