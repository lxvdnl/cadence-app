import { useEffect, useState } from "react";
import type { SimpleItem, Track } from "../types";
import {
  createSimpleItem,
  deleteSimpleItem,
  listSimpleItems,
  logActivity,
  setSimpleItemDone,
  updateSimpleItem,
} from "../db";
import { AddSimpleItemModal } from "../components/AddSimpleItemModal";
import { BulkAddSimpleItemsModal } from "../components/BulkAddSimpleItemsModal";
import type { BulkSimpleItem } from "../components/BulkAddSimpleItemsModal";
import { SimpleItemSettingsModal } from "../components/SimpleItemSettingsModal";
import { t } from "../i18n";

interface Props {
  track: Track;
}

export function SimpleModule({ track }: Props) {
  const [items, setItems] = useState<SimpleItem[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<SimpleItem | null>(null);

  const refresh = async () => setItems(await listSimpleItems(track.id));

  useEffect(() => {
    refresh();
  }, [track.id]);

  const total = items.length;
  const done = items.filter((i) => i.done === 1).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const addItem = async (title: string, estDays: number) => {
    await createSimpleItem(track.id, title, estDays);
    setAddOpen(false);
    await refresh();
  };

  const addBulkItems = async (bulkItems: BulkSimpleItem[]) => {
    for (const it of bulkItems) {
      await createSimpleItem(track.id, it.title, it.estDays);
    }
    setBulkOpen(false);
    await refresh();
  };

  const toggle = async (item: SimpleItem) => {
    const next = item.done === 0;
    await setSimpleItemDone(item.id, next);
    await logActivity(track.id, "simple", next ? 1 : -1);
    await refresh();
  };

  const saveItem = async (title: string, description: string, estDays: number) => {
    if (!selectedItem) return;
    await updateSimpleItem(selectedItem.id, {
      title,
      description: description || null,
      est_days: estDays,
    });
    setSelectedItem(null);
    await refresh();
  };

  const deleteItem = async () => {
    if (!selectedItem) return;
    await deleteSimpleItem(selectedItem.id);
    setSelectedItem(null);
    await refresh();
  };

  return (
    <div className="simple">
      <div className={`simple-progress-card${pct === 100 ? " complete" : ""}`}>
        <div className="simple-progress-top">
          <span className="simple-progress-label">{t("simple.progress")}</span>
          <span className="simple-progress-pct">{pct}%</span>
        </div>
        <div className="simple-progress-bar">
          <div className="simple-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="simple-progress-count">{done}/{total}</div>
      </div>

      {items.length === 0 ? (
        <div className="placeholder">{t("simple.empty")}</div>
      ) : (
        <ul className="simple-list">
          {items.map((item) => (
            <li
              key={item.id}
              className="simple-item"
              onClick={() => toggle(item)}
            >
              <input
                type="checkbox"
                className="topic-check"
                checked={item.done === 1}
                onChange={() => toggle(item)}
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`simple-item-title${item.done === 1 ? " done" : ""}`}>
                {item.title}
              </span>
              {item.est_days > 0 && (
                <span className="simple-item-days">{item.est_days}d</span>
              )}
              <button
                className="simple-item-menu"
                onClick={(e) => { e.stopPropagation(); setSelectedItem(item); }}
              >
                ···
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="simple-add-row">
        <button className="btn-add" onClick={() => setAddOpen(true)}>
          {t("simple.addItem")}
        </button>
        <button className="btn-add" onClick={() => setBulkOpen(true)}>
          {t("simple.addMany")}
        </button>
      </div>

      {addOpen && (
        <AddSimpleItemModal
          onClose={() => setAddOpen(false)}
          onCreate={addItem}
        />
      )}

      {bulkOpen && (
        <BulkAddSimpleItemsModal
          onClose={() => setBulkOpen(false)}
          onSubmit={addBulkItems}
        />
      )}

      {selectedItem && (
        <SimpleItemSettingsModal
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onSave={saveItem}
          onDelete={deleteItem}
        />
      )}
    </div>
  );
}
