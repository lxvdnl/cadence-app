import { useState } from "react";
import type { Topic } from "../types";
import { t } from "../i18n";

interface Props {
  topic: Topic;
  onClose: () => void;
  onSave: (title: string, estDays: number, markdown: string) => Promise<void>;
  onDelete: () => void;
}

export function TopicSettingsModal({ topic, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(topic.title);
  const [estDays, setEstDays] = useState(topic.est_hours);
  const [markdown, setMarkdown] = useState(topic.markdown);

  const changed =
    title.trim() !== topic.title ||
    estDays !== topic.est_hours ||
    markdown !== topic.markdown;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("topic.titlePlaceholder")}
          autoFocus
        />

        <div className="ci-setting-row">
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

        <div className="ci-setting-row ci-setting-last">
          <span className="ci-setting-label">{t("topic.notes")}</span>
        </div>
        <textarea
          className="md-editor topic-settings-editor"
          value={markdown}
          onChange={(e) => setMarkdown(e.target.value)}
          placeholder={t("topic.notesPlaceholder")}
        />

        <div className="ci-settings-footer modal-actions">
          <button className="btn-danger-sm" onClick={onDelete}>
            {t("common.delete")}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          {changed && title.trim() && (
            <button
              className="btn-primary"
              onClick={() => onSave(title.trim(), estDays, markdown)}
            >
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
