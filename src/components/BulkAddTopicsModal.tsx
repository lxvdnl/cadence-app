import { useState } from "react";
import { t } from "../i18n";

export interface BulkTopic {
  title: string;
  estDays: number;
}

function parseLines(raw: string): BulkTopic[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("::");
      if (idx === -1) return { title: line, estDays: 0 };
      const title = line.slice(0, idx).trim();
      const n = parseInt(line.slice(idx + 2).trim(), 10);
      return { title, estDays: isNaN(n) ? 0 : n };
    })
    .filter((tp) => tp.title.length > 0);
}

interface Props {
  onClose: () => void;
  onSubmit: (topics: BulkTopic[]) => void;
}

export function BulkAddTopicsModal({ onClose, onSubmit }: Props) {
  const [raw, setRaw] = useState("");
  const [showHint, setShowHint] = useState(false);
  const parsed = parseLines(raw);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="label-row">
          <h2>{t("roadmap.bulkTopicsTitle")}</h2>
          <button
            className="format-info"
            title={t("roadmap.bulkInfo")}
            onClick={() => setShowHint((v) => !v)}
          >
            i
          </button>
        </div>

        {showHint && <div className="bulk-hint">{t("roadmap.bulkTopicsHint")}</div>}

        <textarea
          className="template-input"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("roadmap.bulkTopicsPlaceholder")}
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
