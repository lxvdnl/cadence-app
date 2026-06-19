import { useState } from "react";
import { t } from "../i18n";

interface Props {
  onClose: () => void;
  onCreate: (name: string, goal?: string) => Promise<void>;
}

export function AddSpaceModal({ onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");

  const handleCreate = async () => {
    const n = name.trim();
    if (!n) return;
    await onCreate(n, goal.trim() || undefined);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("space.new")}</h2>

        <label>{t("addTrack.name")}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
          placeholder={t("space.namePlaceholder")}
        />

        <label>{t("space.goal")}</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("space.goalPlaceholder")}
        />

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary"
            onClick={handleCreate}
            disabled={!name.trim()}
          >
            {t("common.create")}
          </button>
        </div>
      </div>
    </div>
  );
}
