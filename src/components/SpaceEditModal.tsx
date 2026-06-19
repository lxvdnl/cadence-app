import { useState } from "react";
import type { Space } from "../types";
import { t } from "../i18n";

interface Props {
  space: Space;
  onClose: () => void;
  onSave: (name: string, goal: string | null) => Promise<void>;
}

export function SpaceEditModal({ space, onClose, onSave }: Props) {
  const [name, setName] = useState(space.name);
  const [goal, setGoal] = useState(space.goal ?? "");

  const submit = async () => {
    const n = name.trim();
    if (!n) return;
    await onSave(n, goal.trim() || null);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("space.edit")}</h2>

        <label>{t("addTrack.name")}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder={t("space.namePlaceholder")}
        />

        <label>{t("space.goal")}</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("space.goalPlaceholder")}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
