import { useState } from "react";
import type { SimpleItem } from "../types";
import { ModalBackdrop } from "./ModalBackdrop";
import { t } from "../i18n";

interface Props {
  item: SimpleItem;
  onClose: () => void;
  onSave: (title: string, description: string, estDays: number) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function SimpleItemSettingsModal({ item, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(item.title);
  const [desc, setDesc] = useState(item.description ?? "");
  const [estDays, setEstDays] = useState(item.est_days);

  const changed =
    title.trim() !== item.title ||
    desc !== (item.description ?? "") ||
    estDays !== item.est_days;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("simple.itemSettings")}
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
          <span className="ci-setting-label">{t("simple.desc")}</span>
        </div>
        <textarea
          className="md-editor topic-settings-editor"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={t("simple.descPlaceholder")}
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
              onClick={() => onSave(title.trim(), desc, estDays)}
            >
              {t("common.save")}
            </button>
          )}
        </div>
      </div>
    </ModalBackdrop>
  );
}
