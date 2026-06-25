import { useState } from "react";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

export interface BulkSimpleItem {
  title: string;
  estDays: number;
}

function parseLines(raw: string): BulkSimpleItem[] {
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
    .filter((it) => it.title.length > 0);
}

interface Props {
  onClose: () => void;
  onSubmit: (items: BulkSimpleItem[]) => void;
}

export function BulkAddSimpleItemsModal({ onClose, onSubmit }: Props) {
  const [raw, setRaw] = useState("");
  const parsed = parseLines(raw);

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("simple.bulkTitle")}</h2>
        <textarea
          className="template-input"
          autoFocus
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          placeholder={t("simple.bulkPlaceholder")}
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
