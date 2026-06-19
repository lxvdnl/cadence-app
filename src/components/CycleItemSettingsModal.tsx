import { useState } from "react";
import type { CycleItem } from "../types";
import { t } from "../i18n";

interface SavePayload {
  countDelta: number;
  target: number;
  title: string;
  description: string | null;
}

interface Props {
  item: CycleItem;
  onClose: () => void;
  onSave: (payload: SavePayload) => Promise<void>;
  onDelete: () => void;
}

export function CycleItemSettingsModal({ item, onClose, onSave, onDelete }: Props) {
  const [title, setTitle] = useState(item.title);
  const [count, setCount] = useState(item.count);
  const [target, setTarget] = useState(item.target);
  const [description, setDescription] = useState(item.description ?? "");

  const handleSave = () =>
    onSave({
      countDelta: count - item.count,
      target,
      title: title.trim() || item.title,
      description: description.trim() || null,
    });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <input
          className="ci-modal-title-input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
          placeholder={t("cycle.itemPlaceholder")}
          autoFocus
        />

        <div className="ci-setting-row">
          <span className="ci-setting-label">{t("cycle.thisCount")}</span>
          <div className="ci-counter">
            <button
              className="ci-btn"
              disabled={count === 0}
              onClick={() => setCount((v) => Math.max(0, v - 1))}
            >
              −
            </button>
            <span className="ci-count">{count}</span>
            <button className="ci-btn" onClick={() => setCount((v) => v + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="ci-setting-row">
          <span className="ci-setting-label">{t("cycle.targetTitle")}</span>
          <div className="ci-counter">
            <button
              className="ci-btn"
              disabled={target <= 1}
              onClick={() => setTarget((v) => Math.max(1, v - 1))}
            >
              −
            </button>
            <span className="ci-count">{target}</span>
            <button className="ci-btn" onClick={() => setTarget((v) => v + 1)}>
              +
            </button>
          </div>
        </div>

        <div className="ci-setting-last">
          <textarea
            className="template-input"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("cycle.itemDescPlaceholder")}
            rows={4}
          />
        </div>

        <div className="modal-actions ci-settings-footer">
          <button className="btn-danger-sm" onClick={onDelete}>
            {t("common.delete")}
          </button>
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary" onClick={handleSave}>
            {t("common.save")}
          </button>
        </div>
      </div>
    </div>
  );
}
