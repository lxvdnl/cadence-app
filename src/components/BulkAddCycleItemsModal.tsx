import { useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

export interface BulkCycleItem {
  title: string;
  target: number;
}

function parseLines(raw: string): BulkCycleItem[] {
  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf("::");
      if (idx === -1) return null;
      const title = line.slice(0, idx).trim();
      const n = parseInt(line.slice(idx + 2).trim(), 10);
      if (!title || isNaN(n) || n <= 0) return null;
      return { title, target: n };
    })
    .filter((x): x is BulkCycleItem => x !== null);
}

interface Props {
  onClose: () => void;
  onSubmit: (items: BulkCycleItem[]) => void;
}

export function BulkAddCycleItemsModal({ onClose, onSubmit }: Props) {
  const [raw, setRaw] = useState("");
  const parsed = parseLines(raw);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("cycle.bulkTitle")}</h2>
        <textarea
          className="template-input"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("cycle.bulkPlaceholder")}
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
    </ModalBackdrop>
  );
}
