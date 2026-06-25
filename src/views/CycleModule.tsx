import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { CycleHistory, CycleItem, CycleSettings, Track } from "../types";
import { parseCycleSettings } from "../types";
import {
  bumpCycleItem,
  completeCycle,
  createCycleItem,
  deleteCycleItem,
  listCycleHistory,
  listCycleItems,
  logActivity,
  setTrackSettings,
  updateCycleItem,
} from "../db";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { CycleItemSettingsModal } from "../components/CycleItemSettingsModal";
import { CycleSettingsModal } from "../components/CycleSettingsModal";
import { AddCycleItemModal } from "../components/AddCycleItemModal";
import { BulkAddCycleItemsModal } from "../components/BulkAddCycleItemsModal";
import type { BulkCycleItem } from "../components/BulkAddCycleItemsModal";
import { t } from "../i18n";

interface Props {
  track: Track;
  headerActionsEl?: HTMLDivElement | null;
}

type Pending =
  | { kind: "item"; id: number; name: string }
  | { kind: "end"; done: number; total: number }
  | null;

export function CycleModule({ track, headerActionsEl }: Props) {
  const [items, setItems] = useState<CycleItem[]>([]);
  const [history, setHistory] = useState<CycleHistory[]>([]);
  const [settings, setSettings] = useState<CycleSettings>(
    parseCycleSettings(track.settings)
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [itemMenuId, setItemMenuId] = useState<number | null>(null);
  const itemMenuIdRef = useRef(itemMenuId);
  useEffect(() => { itemMenuIdRef.current = itemMenuId; }, [itemMenuId]);

  useEffect(() => {
    if (itemMenuId === null) return;
    const close = () => setItemMenuId(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [itemMenuId]);
  const [cycleSettingsOpen, setCycleSettingsOpen] = useState(false);
  const [editItem, setEditItem] = useState<CycleItem | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  const refresh = async () => {
    setItems(await listCycleItems(track.id));
    setHistory(await listCycleHistory(track.id));
  };

  useEffect(() => {
    (async () => {
      let s = parseCycleSettings(track.settings);
      const its = await listCycleItems(track.id);
      const effectiveDays = s.currentCycleDays ?? s.cycleDays;
      const expired =
        s.startDate != null &&
        Date.now() >= new Date(s.startDate).getTime() + effectiveDays * 86400000;

      if (!s.startDate) {
        s = { ...s, startDate: new Date().toISOString() };
        await setTrackSettings(track.id, { ...s });
      } else if (expired && its.length > 0) {
        const done = its.filter((i) => i.count >= i.target).length;
        await completeCycle(track.id, done === its.length, done, its.length);
        s = { cycleDays: s.cycleDays, startDate: new Date().toISOString() };
        await setTrackSettings(track.id, { ...s });
      }
      setSettings(s);
      await refresh();
    })();
  }, [track.id]);

  const effectiveDays = settings.currentCycleDays ?? settings.cycleDays;

  const doneCount = items.filter((i) => i.count >= i.target).length;
  const total = items.length;
  const allMet = total > 0 && doneCount === total;
  const cycleNo = history.length + 1;
  const totalDone = items.reduce((a, i) => a + Math.min(i.count, i.target), 0);
  const totalTarget = items.reduce((a, i) => a + i.target, 0);

  const dayNow = settings.startDate
    ? Math.min(
        effectiveDays,
        Math.floor(
          (Date.now() - new Date(settings.startDate).getTime()) / 86400000
        ) + 1
      )
    : 1;

  const createItem = async (title: string, target: number) => {
    await createCycleItem(track.id, title, target);
    setAddDialogOpen(false);
    await refresh();
  };

  const createBulkItems = async (bulkItems: BulkCycleItem[]) => {
    for (const item of bulkItems) {
      await createCycleItem(track.id, item.title, item.target);
    }
    setBulkAddOpen(false);
    await refresh();
  };

  const saveCycleSettings = async (defaultDays: number, thisCycleDays: number) => {
    const ns: CycleSettings = {
      cycleDays: defaultDays,
      startDate: settings.startDate,
      ...(thisCycleDays !== defaultDays ? { currentCycleDays: thisCycleDays } : {}),
    };
    await setTrackSettings(track.id, { ...ns });
    setSettings(ns);
    setCycleSettingsOpen(false);
  };

  const bump = async (item: CycleItem, delta: number) => {
    await bumpCycleItem(item.id, delta);
    await logActivity(track.id, "cycle", delta);
    await refresh();
  };

  const handleSaveSettings = async (
    item: CycleItem,
    payload: { countDelta: number; target: number; title: string; description: string | null }
  ) => {
    if (payload.countDelta !== 0) {
      await bumpCycleItem(item.id, payload.countDelta);
      await logActivity(track.id, "cycle", payload.countDelta);
    }
    const fields: Partial<Pick<CycleItem, "title" | "target" | "description">> = {};
    if (payload.target !== item.target) fields.target = payload.target;
    if (payload.title !== item.title) fields.title = payload.title;
    if ((payload.description ?? null) !== (item.description ?? null))
      fields.description = payload.description;
    if (Object.keys(fields).length > 0) await updateCycleItem(item.id, fields);
    setEditItem(null);
    await refresh();
  };

  const confirmPending = async () => {
    if (!pending) return;
    if (pending.kind === "item") {
      await deleteCycleItem(pending.id);
      setPending(null);
      await refresh();
    } else {
      await completeCycle(track.id, allMet, doneCount, total);
      const ns: CycleSettings = {
        cycleDays: settings.cycleDays,
        startDate: new Date().toISOString(),
      };
      await setTrackSettings(track.id, { ...ns });
      setSettings(ns);
      setPending(null);
      await refresh();
    }
  };

  return (
    <>
    {headerActionsEl && createPortal(
      <button
        className="btn-end-cycle-header"
        onClick={() => setPending({ kind: "end", done: doneCount, total })}
      >
        {t("cycle.end")}
      </button>,
      headerActionsEl
    )}
    <div className="cycle">
      <div className="cycle-cycles-block">
        <div
          className="cycle-card-inner cycle-card-clickable"
          onClick={() => setCycleSettingsOpen(true)}
        >
          <div className="cycle-block-label">{t("cycle.cycles")}</div>
          <div className="cycle-card-row">
            <span className="cycle-no">№{cycleNo}</span>
            <span className="cycle-day">
              {t("cycle.day", { d: String(dayNow), n: String(effectiveDays) })}
            </span>
            <div className="cycle-row-gap" />
            {total > 0 && (
              <span className="cycle-iters">{totalDone} / {totalTarget}</span>
            )}
            {allMet && (
              <span className="cycle-success-pill">✓ {t("cycle.successNow")}</span>
            )}
          </div>
          {total > 0 && (
            <div className="cycle-card-bar">
              <div
                className="bar-fill"
                style={{
                  width: `${totalTarget > 0 ? Math.round((totalDone / totalTarget) * 100) : 0}%`,
                }}
              />
            </div>
          )}
        </div>

        {history.length > 0 && (
          <ul className={"history-list" + (showAllHistory ? " expanded" : "")}>
            {(showAllHistory ? history : history.slice(0, 4)).map((h) => (
              <li key={h.id} className="history-row">
                <span className="history-idx">
                  {t("cycle.number", { n: String(h.idx) })}
                </span>
                <span
                  className={"history-badge " + (h.success === 1 ? "ok" : "miss")}
                >
                  {t(h.success === 1 ? "cycle.success" : "cycle.missed")}
                </span>
                <span className="history-count">
                  {h.done_count}/{h.total_count}
                </span>
                <span className="history-date">
                  {new Date(h.ended_at).toLocaleDateString()}
                </span>
              </li>
            ))}
          </ul>
        )}

        {history.length > 4 && (
          <button
            className="btn-history-more"
            onClick={() => setShowAllHistory((v) => !v)}
          >
            {showAllHistory ? t("cycle.historyLess") : t("cycle.historyMore", { n: String(history.length - 4) })}
          </button>
        )}
      </div>

      <div className="cycle-items-block">
        <div className="cycle-items-header">
          <span className="cycle-block-label">{t("cycle.itemsLabel")}</span>
          <div className="cycle-items-actions">
            <button className="btn-add" onClick={() => setAddDialogOpen(true)}>
              {t("cycle.addItem")}
            </button>
            <button className="btn-add" onClick={() => setBulkAddOpen(true)}>
              {t("cycle.addMany")}
            </button>
          </div>
        </div>

        {items.length === 0 && (
          <div className="placeholder">{t("cycle.empty")}</div>
        )}

        {items.length > 0 && (
          <ul className="cycle-items">
            {items.map((item) => {
              const complete = item.count >= item.target;
              const pct = Math.min(100, Math.round((item.count / item.target) * 100));
              return (
                <li
                  key={item.id}
                  className={"cycle-item-row" + (complete ? " complete" : "")}
                >
                  <div className="ci-main" onClick={() => bump(item, 1)}>
                    <span className="ci-title">{item.title}</span>
                    <div className="ci-bar">
                      <div className="mini-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ci-fraction">{item.count}/{item.target}</span>
                  </div>
                  <button
                    className="ci-btn"
                    disabled={item.count <= 0}
                    onClick={(e) => { e.stopPropagation(); bump(item, -1); }}
                  >
                    −
                  </button>
                  <button
                    className="ci-btn"
                    onClick={(e) => { e.stopPropagation(); bump(item, 1); }}
                  >
                    +
                  </button>
                  <div className="cycle-item-menu-wrap">
                    <button
                      className="sprint-menu-btn"
                      onClick={(e) => { e.stopPropagation(); setItemMenuId(itemMenuId === item.id ? null : item.id); }}
                    >
                      ⋯
                    </button>
                    {itemMenuId === item.id && (
                      <div className="sprint-menu" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => { setItemMenuId(null); setEditItem(item); }}>Edit</button>
                        <button
                          className="menu-danger"
                          onClick={() => { setItemMenuId(null); setPending({ kind: "item", id: item.id, name: item.title }); }}
                        >
                          {t("common.delete")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

      </div>

      {addDialogOpen && (
        <AddCycleItemModal
          onClose={() => setAddDialogOpen(false)}
          onCreate={createItem}
        />
      )}

      {bulkAddOpen && (
        <BulkAddCycleItemsModal
          onClose={() => setBulkAddOpen(false)}
          onSubmit={createBulkItems}
        />
      )}

      {cycleSettingsOpen && (
        <CycleSettingsModal
          cycleNo={cycleNo}
          dayNow={dayNow}
          settings={settings}
          onClose={() => setCycleSettingsOpen(false)}
          onSave={saveCycleSettings}
        />
      )}

      {editItem && (
        <CycleItemSettingsModal
          item={editItem}
          onClose={() => setEditItem(null)}
          onSave={(payload) => handleSaveSettings(editItem, payload)}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={t(
            pending.kind === "item"
              ? "confirm.deleteItem.title"
              : "confirm.endCycle.title"
          )}
          body={
            pending.kind === "item"
              ? t("confirm.deleteItem.body", { name: pending.name })
              : t(
                  pending.done >= pending.total
                    ? "confirm.endCycle.bodyDone"
                    : "confirm.endCycle.bodyUnfinished",
                  { done: String(pending.done), total: String(pending.total) }
                )
          }
          confirmLabel={
            pending.kind === "end" ? t("cycle.end") : t("common.delete")
          }
          cancelLabel={t("common.cancel")}
          danger={pending.kind !== "end"}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        />
      )}
    </div>
    </>
  );
}
