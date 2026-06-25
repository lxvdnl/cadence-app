import { useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";
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
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("space.new")}</h2>

        <label>{t("addTrack.name")}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleCreate()}
        />

        <label>{t("space.goal")}</label>
        <input
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
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
    </ModalBackdrop>
  );
}
