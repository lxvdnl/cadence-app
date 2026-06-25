import { useState } from "react";
import type { Sprint } from "../types";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  sprint: Sprint;
  onClose: () => void;
  onSave: (title: string, description: string) => Promise<void>;
}

export function SprintSettingsModal({ sprint, onClose, onSave }: Props) {
  const [title, setTitle] = useState(sprint.title);
  const [desc, setDesc] = useState(sprint.description ?? "");

  const canSave = title.trim().length > 0;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <label>{t("addTrack.name")}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          autoFocus
        />

        <label>{t("simple.desc")}</label>
        <textarea
          className="template-input sprint-desc-input"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={6}
        />

        <div className="ci-settings-footer modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary"
            onClick={() => onSave(title.trim(), desc)}
            disabled={!canSave}
          >
            {t("common.save")}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
