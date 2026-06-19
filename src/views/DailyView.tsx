import { useEffect, useState } from "react";
import type { CycleItem, SimpleItem, Space, Track } from "../types";
import {
  addHabitCheckin,
  bumpCycleItem,
  listActiveTopics,
  listBacklogTopics,
  listCycleItems,
  listHabitCheckins,
  listSimpleItems,
  removeHabitCheckin,
  setSimpleItemDone,
  updateTopic,
  type ActiveTopicRow,
} from "../db";
import { t } from "../i18n";

interface Props {
  tracks: Track[];
  spaces: Space[];
  onOpenTopic: (topicId: number, trackId: number) => void;
  onOpenTrack: (trackId: number) => void;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

export function DailyView({ tracks, spaces, onOpenTopic, onOpenTrack }: Props) {
  const today = todayStr();
  const [spaceFilter, setSpaceFilter] = useState<number | "all">("all");

  const [checkedToday, setCheckedToday] = useState<Set<number>>(new Set());
  const [activeTopics, setActiveTopics] = useState<ActiveTopicRow[]>([]);
  const [backlogTopics, setBacklogTopics] = useState<ActiveTopicRow[]>([]);
  const [cycleItems, setCycleItems] = useState<Record<number, CycleItem[]>>({});
  const [simpleItems, setSimpleItems] = useState<Record<number, SimpleItem[]>>({});
  const [expandedBacklog, setExpandedBacklog] = useState<Set<number>>(new Set());

  const habitTracks = tracks.filter((tr) => tr.format === "habit");
  const roadmapTracks = tracks.filter((tr) => tr.format === "roadmap");
  const cycleTracks = tracks.filter((tr) => tr.format === "cycle");
  const simpleTracks = tracks.filter((tr) => tr.format === "simple");

  const inSpaceTrack = (tr: Track) =>
    spaceFilter === "all" || tr.space_id === spaceFilter;

  const visibleHabits = habitTracks.filter(inSpaceTrack);
  const visibleRoadmap = roadmapTracks.filter(inSpaceTrack);
  const visibleCycles = cycleTracks.filter(inSpaceTrack);
  const visibleSimple = simpleTracks.filter(inSpaceTrack);

  const activeByTrack = (trackId: number) =>
    activeTopics.filter((tp) => tp.track_id === trackId);
  const backlogByTrack = (trackId: number) =>
    backlogTopics.filter((tp) => tp.track_id === trackId);

  useEffect(() => {
    let alive = true;

    const load = async () => {
      const checkedSet = new Set<number>();
      for (const tr of habitTracks) {
        const checkins = await listHabitCheckins(tr.id);
        if (checkins.some((c) => c.date.startsWith(today))) checkedSet.add(tr.id);
      }

      const topics = await listActiveTopics();
      const backlog = await listBacklogTopics();

      const items: Record<number, CycleItem[]> = {};
      for (const tr of cycleTracks) {
        items[tr.id] = await listCycleItems(tr.id);
      }

      const sItems: Record<number, SimpleItem[]> = {};
      for (const tr of simpleTracks) {
        sItems[tr.id] = await listSimpleItems(tr.id);
      }

      if (!alive) return;
      setCheckedToday(checkedSet);
      setActiveTopics(topics);
      setBacklogTopics(backlog);
      setCycleItems(items);
      setSimpleItems(sItems);
    };

    load();
    return () => { alive = false; };
  }, [tracks]);

  const toggleHabit = async (trackId: number) => {
    if (checkedToday.has(trackId)) {
      await removeHabitCheckin(trackId, today);
      setCheckedToday((prev) => { const s = new Set(prev); s.delete(trackId); return s; });
    } else {
      await addHabitCheckin(trackId, today);
      setCheckedToday((prev) => new Set([...prev, trackId]));
    }
  };

  const takeOn = async (id: number) => {
    await updateTopic(id, { status: "active" });
    const [topics, backlog] = await Promise.all([listActiveTopics(), listBacklogTopics()]);
    setActiveTopics(topics);
    setBacklogTopics(backlog);
  };

  const markDone = async (id: number) => {
    await updateTopic(id, { status: "done" });
    setActiveTopics(await listActiveTopics());
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

  const toggleBacklog = (trackId: number) => {
    setExpandedBacklog((prev) => {
      const s = new Set(prev);
      if (s.has(trackId)) s.delete(trackId);
      else s.add(trackId);
      return s;
    });
  };

  const isEmpty =
    visibleHabits.length === 0 &&
    visibleRoadmap.length === 0 &&
    visibleCycles.length === 0 &&
    visibleSimple.length === 0;

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{t("nav.daily")}</h1>
          <div className="daily-date">{formatDate(new Date())}</div>
        </div>
      </div>

      {spaces.length > 0 && (
        <div className="dash-space-tabs">
          <button
            className={"chip-filter" + (spaceFilter === "all" ? " active" : "")}
            onClick={() => setSpaceFilter("all")}
          >
            {t("dash.filterAll")}
          </button>
          {spaces.map((s) => (
            <button
              key={s.id}
              className={"chip-filter" + (spaceFilter === s.id ? " active" : "")}
              onClick={() => setSpaceFilter(s.id)}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {visibleHabits.length > 0 && (
        <div className="daily-type-section">
          <div className="daily-type-header">{t("daily.habits")}</div>
          {visibleHabits.map((tr) => {
            const done = checkedToday.has(tr.id);
            return (
              <div
                key={tr.id}
                className={"daily-card" + (done ? " daily-card--done" : "")}
                onClick={() => toggleHabit(tr.id)}
              >
                <div className="daily-card-header">
                  <span className="nav-dot" style={{ background: tr.color }} />
                  <span className="daily-card-name">{tr.name}</span>
                  <input
                    type="checkbox"
                    className="daily-check"
                    checked={done}
                    onChange={() => toggleHabit(tr.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleRoadmap.length > 0 && (
        <div className="daily-type-section">
          <div className="daily-type-header">{t("format.roadmap")}</div>
          {visibleRoadmap.map((tr) => {
            const active = activeByTrack(tr.id);
            const backlog = backlogByTrack(tr.id);
            if (active.length === 0 && backlog.length === 0) return null;
            const isExpanded = expandedBacklog.has(tr.id);
            return (
              <div key={tr.id} className="daily-card">
                <div className="daily-card-header" onClick={() => onOpenTrack(tr.id)}>
                  <span className="nav-dot" style={{ background: tr.color }} />
                  <span className="daily-card-name">{tr.name}</span>
                </div>
                {active.length > 0 && (
                  <div className="daily-card-body">
                    {active.map((tp) => (
                      <div
                        key={tp.id}
                        className="daily-item daily-item--clickable"
                        onClick={() => onOpenTopic(tp.id, tp.track_id)}
                      >
                        <span className="daily-item-path">
                          <span className="daily-item-sprint">{tp.sprint_title}</span>
                          <span className="daily-item-sep">/</span>
                          <span className="daily-item-title">{tp.title}</span>
                        </span>
                        {tp.est_hours > 0 && (
                          <span className="daily-item-meta">{tp.est_hours}d</span>
                        )}
                        <button
                          className="daily-done-btn"
                          onClick={(e) => { e.stopPropagation(); markDone(tp.id); }}
                        >
                          {t("topic.status.done")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {backlog.length > 0 && (
                  <div className="daily-card-footer">
                    <button
                      className="daily-backlog-toggle"
                      onClick={() => toggleBacklog(tr.id)}
                    >
                      <span>{isExpanded ? "▼" : "▶"}</span>
                      {t("daily.suggestions")}
                      <span className="daily-suggestions-count">{backlog.length}</span>
                    </button>
                    {isExpanded && backlog.map((tp) => (
                      <div key={tp.id} className="daily-item daily-item--backlog">
                        <span className="daily-item-path">
                          <span className="daily-item-sprint">{tp.sprint_title}</span>
                          <span className="daily-item-sep">/</span>
                          <span className="daily-item-title">{tp.title}</span>
                        </span>
                        {tp.est_hours > 0 && (
                          <span className="daily-item-meta">{tp.est_hours}d</span>
                        )}
                        <button
                          className="daily-takeon-btn"
                          onClick={(e) => { e.stopPropagation(); takeOn(tp.id); }}
                        >
                          {t("daily.takeOn")}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {visibleCycles.length > 0 && (
        <div className="daily-type-section">
          <div className="daily-type-header">{t("daily.cycle")}</div>
          {visibleCycles.map((tr) => {
            const remaining = (cycleItems[tr.id] ?? []).filter((i) => i.count < i.target);
            if (remaining.length === 0) return null;
            return (
              <div key={tr.id} className="daily-card">
                <div className="daily-card-header" onClick={() => onOpenTrack(tr.id)}>
                  <span className="nav-dot" style={{ background: tr.color }} />
                  <span className="daily-card-name">{tr.name}</span>
                </div>
                <div className="daily-card-body">
                  {remaining.map((item) => (
                    <div key={item.id} className="daily-item">
                      <span className="daily-item-title">{item.title}</span>
                      <span className="daily-item-meta">{item.count}/{item.target}</span>
                      <button
                        className="daily-bump-btn"
                        onClick={(e) => { e.stopPropagation(); bumpCycle(item); }}
                      >
                        +
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {visibleSimple.length > 0 && (
        <div className="daily-type-section">
          <div className="daily-type-header">{t("format.simple")}</div>
          {visibleSimple.map((tr) => {
            const items = simpleItems[tr.id] ?? [];
            if (items.length === 0) return null;
            const undone = items.filter((i) => !i.done);
            return (
              <div key={tr.id} className="daily-card">
                <div className="daily-card-header" onClick={() => onOpenTrack(tr.id)}>
                  <span className="nav-dot" style={{ background: tr.color }} />
                  <span className="daily-card-name">{tr.name}</span>
                </div>
                <div className="daily-card-body">
                  {undone.length > 0 ? undone.map((item) => (
                    <div
                      key={item.id}
                      className="daily-item daily-item--clickable"
                      onClick={() => toggleSimple(item)}
                    >
                      <input
                        type="checkbox"
                        className="daily-check"
                        checked={Boolean(item.done)}
                        readOnly
                        onClick={(e) => e.stopPropagation()}
                      />
                      <span className="daily-item-title">{item.title}</span>
                    </div>
                  )) : (
                    <div className="daily-item-empty">{t("daily.empty")}</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isEmpty && (
        <div className="placeholder"><p>{t("daily.empty")}</p></div>
      )}
    </div>
  );
}
