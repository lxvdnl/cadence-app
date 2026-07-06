import { useEffect, useMemo, useRef, useState } from "react";
import type { CycleItem, SimpleItem, Track } from "../types";
import { parseHabitSettings } from "../types";
import {
  addHabitCheckin,
  bumpCycleItem,
  listActiveTopics,
  listCycleItems,
  listHabitCheckins,
  listSimpleItems,
  removeHabitCheckin,
  roadmapProgress,
  setSimpleItemDone,
  type ActiveTopicRow,
} from "../db";
import type { Progress } from "../db";
import { computeDailyStreak, computeWeeklyData, toDateStr } from "../metrics";
import { t } from "../i18n";

interface Props {
  tracks: Track[];
  onOpenTopic: (topicId: number, trackId: number) => void;
  onOpenTrack: (trackId: number) => void;
}

const ORDER_KEY = "daily.order";
const HIDDEN_KEY = "daily.hidden";

function loadIds(key: string): number[] {
  try {
    const v = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "number") : [];
  } catch {
    return [];
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function DailyView({ tracks, onOpenTopic, onOpenTrack }: Props) {
  const today = toDateStr(new Date());

  const [habitCheckins, setHabitCheckins] = useState<Record<number, Set<string>>>({});
  const [cycleItems, setCycleItems] = useState<Record<number, CycleItem[]>>({});
  const [simpleItems, setSimpleItems] = useState<Record<number, SimpleItem[]>>({});
  const [activeTopics, setActiveTopics] = useState<ActiveTopicRow[]>([]);
  const [roadmapProg, setRoadmapProg] = useState<Record<number, Progress>>({});

  const [order, setOrder] = useState<number[]>(() => loadIds(ORDER_KEY));
  const [hidden, setHidden] = useState<Set<number>>(() => new Set(loadIds(HIDDEN_KEY)));

  const [dragId, setDragId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [ctxMenu, setCtxMenu] = useState<{ id: number; x: number; y: number } | null>(null);

  useEffect(() => {
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }, [order]);
  useEffect(() => {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  }, [hidden]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const checkins: Record<number, Set<string>> = {};
      const cItems: Record<number, CycleItem[]> = {};
      const sItems: Record<number, SimpleItem[]> = {};
      const rProg: Record<number, Progress> = {};
      for (const tr of tracks) {
        if (tr.format === "habit") {
          const rows = await listHabitCheckins(tr.id);
          checkins[tr.id] = new Set(rows.map((r) => r.date.slice(0, 10)));
        } else if (tr.format === "cycle") {
          cItems[tr.id] = await listCycleItems(tr.id);
        } else if (tr.format === "simple") {
          sItems[tr.id] = await listSimpleItems(tr.id);
        } else if (tr.format === "roadmap") {
          rProg[tr.id] = await roadmapProgress(tr.id);
        }
      }
      const topics = await listActiveTopics();
      if (!alive) return;
      setHabitCheckins(checkins);
      setCycleItems(cItems);
      setSimpleItems(sItems);
      setActiveTopics(topics);
      setRoadmapProg(rProg);
    };
    load();
    return () => { alive = false; };
  }, [tracks]);

  const orderedTracks = useMemo(() => {
    const byId = new Map(tracks.map((tr) => [tr.id, tr]));
    const seen = new Set<number>();
    const out: Track[] = [];
    for (const id of order) {
      const tr = byId.get(id);
      if (tr && !seen.has(id)) { out.push(tr); seen.add(id); }
    }
    for (const tr of tracks) {
      if (!seen.has(tr.id)) { out.push(tr); seen.add(tr.id); }
    }
    return out.filter((tr) => !hidden.has(tr.id));
  }, [tracks, order, hidden]);

  const hiddenTracks = tracks.filter((tr) => hidden.has(tr.id));

  const toggleHabit = async (trackId: number) => {
    const set = habitCheckins[trackId] ?? new Set<string>();
    if (set.has(today)) {
      await removeHabitCheckin(trackId, today);
    } else {
      await addHabitCheckin(trackId, today);
    }
    const rows = await listHabitCheckins(trackId);
    setHabitCheckins((prev) => ({ ...prev, [trackId]: new Set(rows.map((r) => r.date.slice(0, 10))) }));
  };

  const bumpCycle = async (item: CycleItem) => {
    if (item.count >= item.target) return;
    await bumpCycleItem(item.id, 1);
    const updated = await listCycleItems(item.track_id);
    setCycleItems((prev) => ({ ...prev, [item.track_id]: updated }));
  };

  const toggleSimple = async (item: SimpleItem) => {
    await setSimpleItemDone(item.id, !item.done);
    const updated = await listSimpleItems(item.track_id);
    setSimpleItems((prev) => ({ ...prev, [item.track_id]: updated }));
  };

  const ensureOrder = (ids: number[]) => {
    setOrder((prev) => {
      const merged = [...prev];
      for (const id of ids) if (!merged.includes(id)) merged.push(id);
      return merged;
    });
  };

  const dragRef = useRef<{ id: number; startY: number; active: boolean } | null>(null);

  const reorderTo = (overId: number) => {
    const draggingId = dragRef.current?.id;
    if (draggingId == null || draggingId === overId) return;
    setOrder((prev) => {
      const ids = prev.length ? [...prev] : orderedTracks.map((tr) => tr.id);
      const from = ids.indexOf(draggingId);
      const to = ids.indexOf(overId);
      if (from === -1 || to === -1) return prev;
      const next = [...ids];
      next.splice(from, 1);
      next.splice(to, 0, draggingId);
      return next;
    });
  };

  const handleDragPointerDown = (e: React.PointerEvent, id: number) => {
    if (e.button !== 0) return;
    e.preventDefault();
    ensureOrder(orderedTracks.map((tr) => tr.id));
    dragRef.current = { id, startY: e.clientY, active: false };

    const onMove = (ev: PointerEvent) => {
      const info = dragRef.current;
      if (!info) return;
      if (!info.active) {
        if (Math.abs(ev.clientY - info.startY) < 5) return;
        info.active = true;
        setDragId(info.id);
      }
      const el = document.elementFromPoint(ev.clientX, ev.clientY);
      const card = el?.closest("[data-gw-id]") as HTMLElement | null;
      if (card) {
        const overId = Number(card.dataset.gwId);
        if (!Number.isNaN(overId)) reorderTo(overId);
      }
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      dragRef.current = null;
      setDragId(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  };

  const removeCard = (id: number) => {
    setHidden((prev) => new Set(prev).add(id));
    setCtxMenu(null);
  };

  const restore = (id: number) => {
    setHidden((prev) => { const s = new Set(prev); s.delete(id); return s; });
    ensureOrder([id]);
    setAdding(false);
  };

  const renderBody = (tr: Track) => {
    if (tr.format === "habit") {
      const settings = parseHabitSettings(tr.settings);
      const set = habitCheckins[tr.id] ?? new Set<string>();
      const dates = [...set];
      const todayDone = set.has(today);
      let pct = 0;
      let frac = "";
      let label = "";
      if (settings.mode === "daily") {
        const streak = computeDailyStreak(dates).streak;
        frac = `🔥 ${streak}`;
        label = t("habit.dayStreak");
        pct = todayDone ? 100 : 0;
      } else {
        const wd = computeWeeklyData(settings.daysPerWeek, dates, settings.startDate);
        frac = `${wd.currentCount}/${settings.daysPerWeek}`;
        label = t("daily.thisWeek");
        pct = settings.daysPerWeek > 0 ? Math.min(100, Math.round((wd.currentCount / settings.daysPerWeek) * 100)) : 0;
      }
      return (
        <div className="gw-body-row">
          <div className="gw-progress-wrap">
            <div className="gw-progress"><div className={`gw-progress-fill${todayDone ? " done" : ""}`} style={{ width: `${pct}%` }} /></div>
            <span className="gw-frac">{frac} <span className="gw-frac-label">{label}</span></span>
          </div>
          <button
            className={`gw-mark-btn${todayDone ? " done" : ""}`}
            onClick={() => toggleHabit(tr.id)}
          >
            {todayDone ? t("daily.doneTodayShort") : t("daily.markToday")}
          </button>
        </div>
      );
    }

    if (tr.format === "cycle") {
      const items = cycleItems[tr.id] ?? [];
      return (
        <div className="gw-chips">
          {items.length === 0 && <span className="gw-muted">{t("cycle.empty")}</span>}
          {items.map((it) => {
            const done = it.count >= it.target;
            return (
              <button
                key={it.id}
                className={`gw-chip${done ? " done" : ""}`}
                onClick={() => bumpCycle(it)}
                disabled={done}
                title={it.title}
              >
                <span className="gw-chip-name">{it.title}</span>
                <span className="gw-chip-count">{it.count}/{it.target}</span>
              </button>
            );
          })}
        </div>
      );
    }

    if (tr.format === "simple") {
      const items = simpleItems[tr.id] ?? [];
      const total = items.length;
      const done = items.filter((i) => i.done).length;
      const pct = total > 0 ? Math.round((done / total) * 100) : 0;
      const undone = items.filter((i) => !i.done);
      const menuOpen = openMenu === tr.id;
      return (
        <div className="gw-body-row">
          <div className="gw-progress-wrap">
            <div className="gw-progress"><div className={`gw-progress-fill${total > 0 && done === total ? " done" : ""}`} style={{ width: `${pct}%` }} /></div>
            <span className="gw-frac">{done}/{total}</span>
          </div>
          {undone.length > 0 ? (
            <div className="gw-menu-wrap">
              <button
                className="gw-more-btn"
                onClick={() => setOpenMenu(menuOpen ? null : tr.id)}
              >
                {undone.length} to do ▾
              </button>
              {menuOpen && (
                <>
                  <div className="gw-menu-backdrop" onClick={() => setOpenMenu(null)} />
                  <div className="gw-menu gw-menu-checks">
                    {undone.map((it) => (
                      <button key={it.id} className="gw-menu-check" onClick={() => toggleSimple(it)}>
                        <span className="gw-check-box" />
                        <span className="gw-menu-text">{it.title}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          ) : (
            <span className="gw-done-label">{t("daily.allDone")}</span>
          )}
        </div>
      );
    }

    // roadmap — progress over all topics + active list
    const active = activeTopics.filter((tp) => tp.track_id === tr.id);
    const prog = roadmapProg[tr.id] ?? { done: 0, total: 0 };
    const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
    const complete = prog.total > 0 && prog.done === prog.total;
    const menuOpen = openMenu === tr.id;
    return (
      <div className="gw-body-row">
        <div className="gw-progress-wrap">
          <div className="gw-progress"><div className={`gw-progress-fill${complete ? " done" : ""}`} style={{ width: `${pct}%` }} /></div>
          <span className="gw-frac">{prog.done}/{prog.total}</span>
        </div>
        {active.length > 0 ? (
          <div className="gw-menu-wrap">
            <button
              className="gw-more-btn"
              onClick={() => setOpenMenu(menuOpen ? null : tr.id)}
            >
              {active.length} active ▾
            </button>
            {menuOpen && (
              <>
                <div className="gw-menu-backdrop" onClick={() => setOpenMenu(null)} />
                <div className="gw-menu">
                  {active.map((tp) => (
                    <button
                      key={tp.id}
                      className="gw-menu-item"
                      onClick={() => { setOpenMenu(null); onOpenTopic(tp.id, tp.track_id); }}
                    >
                      <span className="gw-menu-sprint">{tp.sprint_title}</span>
                      <span className="gw-menu-text">{tp.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        ) : (
          <span className="gw-muted">{t("daily.noActive")}</span>
        )}
      </div>
    );
  };

  const isComplete = (tr: Track): boolean => {
    if (tr.format === "habit") {
      const settings = parseHabitSettings(tr.settings);
      const set = habitCheckins[tr.id] ?? new Set<string>();
      if (settings.mode === "daily") return set.has(today);
      const wd = computeWeeklyData(settings.daysPerWeek, [...set], settings.startDate);
      return wd.currentCount >= settings.daysPerWeek;
    }
    if (tr.format === "cycle") {
      const items = cycleItems[tr.id] ?? [];
      return items.length > 0 && items.every((i) => i.count >= i.target);
    }
    if (tr.format === "simple") {
      const items = simpleItems[tr.id] ?? [];
      return items.length > 0 && items.every((i) => i.done);
    }
    if (tr.format === "roadmap") {
      const prog = roadmapProg[tr.id] ?? { done: 0, total: 0 };
      return prog.total > 0 && prog.done === prog.total;
    }
    return false;
  };

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{t("nav.daily")}</h1>
          <div className="daily-date">{formatDate(new Date())}</div>
        </div>
        <div className="view-header-spacer" style={{ flex: 1 }} />
        {hiddenTracks.length > 0 && (
          <button className="gw-add-btn" onClick={() => setAdding((v) => !v)}>
            + {t("daily.addCard")}
          </button>
        )}
      </div>

      {adding && hiddenTracks.length > 0 && (
        <div className="gw-add-picker">
          {hiddenTracks.map((tr) => (
            <button key={tr.id} className="gw-add-chip" onClick={() => restore(tr.id)}>
              <span className="nav-dot" style={{ background: tr.color }} />
              {tr.name}
            </button>
          ))}
        </div>
      )}

      {orderedTracks.length === 0 ? (
        <div className="placeholder"><p>{t("daily.gatewayEmpty")}</p></div>
      ) : (
        <div className="gw-list">
          {orderedTracks.map((tr) => (
            <div
              key={tr.id}
              data-gw-id={tr.id}
              className={
                "gw-card" +
                (isComplete(tr) ? " complete" : "") +
                (dragId === tr.id ? " dragging" : "")
              }
              onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ id: tr.id, x: e.clientX, y: e.clientY }); }}
            >
              <div className="gw-card-head">
                <span
                  className="gw-handle"
                  onPointerDown={(e) => handleDragPointerDown(e, tr.id)}
                >
                  ⠿
                </span>
                <span className="nav-dot" style={{ background: tr.color }} />
                <span className="gw-name" onClick={() => onOpenTrack(tr.id)}>{tr.name}</span>
                <span className="gw-badge">{t(`format.${tr.format}`)}</span>
              </div>
              <div className="gw-card-body">{renderBody(tr)}</div>
            </div>
          ))}
        </div>
      )}

      {ctxMenu && (
        <>
          <div className="gw-menu-backdrop" onClick={() => setCtxMenu(null)} onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div className="gw-ctx-menu" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button className="gw-menu-item gw-menu-remove" onClick={() => removeCard(ctxMenu.id)}>
              {t("daily.removeCard", { name: t("nav.daily") })}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
