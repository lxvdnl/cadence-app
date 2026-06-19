import { useState } from "react";
import type { Sprint } from "../types";
import { t } from "../i18n";

interface Props {
  sprint: Sprint;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
  onDelete: () => void;
}

export function SprintSettingsModal({ sprint, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(sprint.title);
  const [desc, setDesc] = useState(sprint.description ?? "");

  const titleChanged = title.trim() !== sprint.title;
  const descChanged = desc !== (sprint.description ?? "");
  const changed = (titleChanged || descChanged) && title.trim().length > 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("roadmap.sprintPlaceholder")}
          autoFocus
        />

        <textarea
          className="template-input sprint-desc-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t("sprint.descPlaceholder")}
          rows={6}
        />

        <div className="ci-settings-footer modal-actions">
          <button className="btn-danger-sm" onClick={onDelete}>
            {t("common.delete")}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          {changed && (
            <button
              className="btn-primary"
              onClick={() => onSave(title.trim(), desc)}
            >
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
