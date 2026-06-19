import { useState } from "react";
import { t } from "../i18n";

export interface BulkSprint {
  title: string;
  description?: string;
}

interface Props {
  onClose: () => void;
  onSubmit: (sprints: BulkSprint[]) => void;
}

function parseLines(raw: string): BulkSprint[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("::");
      if (idx === -1) return { title: line };
      return {
        title: line.slice(0, idx).trim(),
        description: line.slice(idx + 2).trim() || undefined,
      };
    })
    .filter((s) => s.title.length > 0);
}

export function BulkAddSprintsModal({ onClose, onSubmit }: Props) {
  const [raw, setRaw] = useState("");
  const [showHint, setShowHint] = useState(false);
  const parsed = parseLines(raw);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="label-row">
          <h2>{t("roadmap.bulkTitle")}</h2>
          <button
            className="format-info"
            title={t("roadmap.bulkInfo")}
            onClick={() => setShowHint((v) => !v)}
          >
            i
          </button>
        </div>

        {showHint && <div className="bulk-hint">{t("roadmap.bulkHint")}</div>}

        <textarea
          className="template-input"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("roadmap.bulkPlaceholder")}
          rows={10}
        />

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary"
            onClick={() => onSubmit(parsed)}
            disabled={parsed.length === 0}
          >
            {t("roadmap.add")} ({parsed.length})
          </button>
        </div>
      </div>
    </div>
  );
}
