import { useEffect, useMemo, useState } from "react";
import type { HabitSettings, Track } from "../types";
import { parseHabitSettings } from "../types";
import {
  addHabitCheckin,
  listHabitCheckins,
  logActivity,
  removeHabitCheckin,
  setTrackSettings,
} from "../db";
import { computeDailyStreak, computeWeeklyData, toDateStr } from "../metrics";
import { t } from "../i18n";

interface Props {
  track: Track;
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

export function HabitModule({ track }: Props) {
  const [checkins, setCheckins] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<HabitSettings>(
    parseHabitSettings(track.settings)
  );
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    const rows = await listHabitCheckins(track.id);
    setCheckins(new Set(rows.map((r) => r.date)));
  };

  useEffect(() => {
    (async () => {
      let s = parseHabitSettings(track.settings);
      if (!s.startDate) {
        s = { ...s, startDate: new Date().toISOString() };
        await setTrackSettings(track.id, { ...s });
      }
      setSettings(s);
      await load();
    })();
  }, [track.id]);

  const todayStr = toDateStr(new Date());
  const todayDone = checkins.has(todayStr);

  const toggle = async (date: string) => {
    if (checkins.has(date)) {
      await removeHabitCheckin(track.id, date);
      await logActivity(track.id, "habit", -1);
    } else {
      await addHabitCheckin(track.id, date);
      await logActivity(track.id, "habit", 1);
    }
    await load();
  };

  const dailyStats = useMemo(
    () => settings.mode === "daily" ? computeDailyStreak([...checkins]) : null,
    [checkins, settings.mode]
  );

  const weeklyData = useMemo(
    () => settings.mode === "weekly"
      ? computeWeeklyData(settings.daysPerWeek, [...checkins], settings.startDate)
      : null,
    [checkins, settings]
  );

  const gridDays = useMemo(() => {
    const today = new Date();
    const mondayCurrent = getMonday(today);
    const days: { date: string; day: number; today: boolean; future: boolean }[] = [];

    for (let d = 0; d < 7; d++) {
      const day = new Date(mondayCurrent);
      day.setDate(mondayCurrent.getDate() + d);
      const ds = toDateStr(day);
      days.push({ date: ds, day: day.getDate(), today: ds === todayStr, future: ds > todayStr });
    }
    return days;
  }, [todayStr]);

  const [calMonth, setCalMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const monthCells = useMemo(() => {
    const year = calMonth.getFullYear();
    const month = calMonth.getMonth();
    const first = new Date(year, month, 1);
    const startWeekday = (first.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells: ({ date: string; day: number; today: boolean; future: boolean } | null)[] = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const ds = toDateStr(date);
      cells.push({ date: ds, day: d, today: ds === todayStr, future: ds > todayStr });
    }
    return cells;
  }, [calMonth, todayStr]);

  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const now = new Date();
  const atCurrentMonth =
    calMonth.getFullYear() === now.getFullYear() && calMonth.getMonth() === now.getMonth();
  const prevMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1));
  const nextMonth = () => setCalMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1));

  const openHistory = () => {
    setShowHistory((v) => {
      if (!v) {
        const d = new Date();
        setCalMonth(new Date(d.getFullYear(), d.getMonth(), 1));
      }
      return !v;
    });
  };

  const calendarSection = (
    <>
      <button
        className={`habit-history-toggle${showHistory ? " open" : ""}`}
        onClick={openHistory}
      >
        <span className="habit-history-chevron">
          <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
            <polyline points="2,3 5,7 8,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
        {showHistory ? t("habit.hideHistory") : t("habit.showHistory")}
      </button>

      {showHistory && (
        <div className="habit-calendar">
          <div className="habit-cal-head">
            <button className="habit-cal-nav" onClick={prevMonth} aria-label="Previous month">
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <polyline points="6.5,2 3,5 6.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <span className="habit-cal-title">
              {monthNames[calMonth.getMonth()]} {calMonth.getFullYear()}
            </span>
            <button
              className="habit-cal-nav"
              onClick={nextMonth}
              disabled={atCurrentMonth}
              aria-label="Next month"
            >
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <polyline points="3.5,2 7,5 3.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
          <div className="habit-grid-labels habit-cal-labels">
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map((l) => (
              <div key={l} className="habit-day-label">{l}</div>
            ))}
          </div>
          <div className="habit-grid habit-cal-grid">
            {monthCells.map((cell, i) =>
              cell === null ? (
                <div key={`e${i}`} className="habit-cal-empty" />
              ) : (
                <button
                  key={cell.date}
                  className={
                    "habit-cell" +
                    (checkins.has(cell.date) ? " done" : "") +
                    (cell.today ? " today" : "") +
                    (cell.future ? " future" : "")
                  }
                  onClick={() => !cell.future && toggle(cell.date)}
                  disabled={cell.future}
                  title={cell.date}
                >
                  {cell.day}
                </button>
              )
            )}
          </div>
        </div>
      )}
    </>
  );

  if (settings.mode === "daily") {
    const streak = dailyStats?.streak ?? 0;
    const tier = streak >= 30 ? 3 : streak >= 7 ? 2 : streak >= 1 ? 1 : 0;

    const elapsed = gridDays.filter((c) => !c.future).length;
    const weekDone = gridDays.filter((c) => !c.future && checkins.has(c.date)).length;
    const weekPct = elapsed > 0 ? Math.round((weekDone / elapsed) * 100) : 0;
    const weekMetDaily = elapsed > 0 && weekDone === elapsed;

    return (
      <div className={`habit habit-daily tier-${tier}`}>
        <div
          className={`habit-stats habit-stats-daily habit-stats-clickable${todayDone ? " secured" : " at-risk"}`}
          onClick={() => toggle(todayStr)}
        >
          <div className={`habit-streak-block tier-${tier}${todayDone ? " secured" : " at-risk"}`}>
            <div className="habit-streak-num">
              {streak > 0 && <span className="habit-fire">🔥</span>}
              {streak}
            </div>
            <div className="habit-streak-label">{t("habit.dayStreak")}</div>
          </div>
          <span className="habit-mark-text">
            {todayDone ? t("habit.unmarkToday") : t("habit.markToday")}
          </span>
        </div>

        <div className={`habit-week-card${weekMetDaily ? " met" : ""}`}>
          <div className="habit-week-card-head">
            <span className="habit-week-card-label">{t("habit.thisWeek")}</span>
            <span className="habit-week-card-count">{weekDone}/{elapsed}</span>
          </div>
          <div className="habit-week-progress">
            <div className="habit-week-progress-fill" style={{ width: `${weekPct}%` }} />
          </div>
          <div className="habit-grid-labels habit-week-labels">
            {["Mo","Tu","We","Th","Fr","Sa","Su"].map((l) => (
              <div key={l} className="habit-day-label">{l}</div>
            ))}
          </div>
          <div className="habit-grid habit-week-grid">
            {gridDays.map((cell) => (
              <button
                key={cell.date}
                className={
                  "habit-cell" +
                  (checkins.has(cell.date) ? " done" : "") +
                  (cell.today ? " today" : "") +
                  (cell.future ? " future" : "")
                }
                onClick={() => !cell.future && toggle(cell.date)}
                disabled={cell.future}
                title={cell.date}
              >
                {cell.day}
              </button>
            ))}
          </div>
        </div>
        {calendarSection}
      </div>
    );
  }

  const currentCount = weeklyData?.currentCount ?? 0;
  const target = settings.daysPerWeek;
  const pct = target > 0 ? Math.min(100, Math.round((currentCount / target) * 100)) : 0;
  const pastStreak = weeklyData?.streak ?? 0;
  const weekMet = currentCount >= target;
  const displayStreak = pastStreak + (weekMet ? 1 : 0);
  const tier = displayStreak >= 12 ? 3 : displayStreak >= 4 ? 2 : displayStreak >= 1 ? 1 : 0;

  return (
    <div className={`habit habit-weekly tier-${tier}`}>
      <div
        className={`habit-stats habit-stats-daily habit-stats-clickable${weekMet ? " secured" : " at-risk"}`}
        onClick={() => toggle(todayStr)}
      >
        <div className={`habit-streak-block tier-${tier}${weekMet ? " secured" : " at-risk"}`}>
          <div className="habit-streak-num">
            {displayStreak > 0 && <span className="habit-fire">🔥</span>}
            {displayStreak}
          </div>
          <div className="habit-streak-label">{t("habit.weekStreak")}</div>
        </div>
        <span className="habit-mark-text">
          {todayDone ? t("habit.unmarkToday") : t("habit.markToday")}
        </span>
      </div>

      <div className={`habit-week-card${weekMet ? " met" : ""}`}>
        <div className="habit-week-card-head">
          <span className="habit-week-card-label">{t("habit.thisWeek")}</span>
          <span className="habit-week-card-count">{currentCount}/{target}</span>
        </div>
        <div className="habit-week-progress">
          <div className="habit-week-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="habit-grid-labels habit-week-labels">
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((l) => (
            <div key={l} className="habit-day-label">{l}</div>
          ))}
        </div>
        <div className="habit-grid habit-week-grid">
          {gridDays.map((cell) => (
            <button
              key={cell.date}
              className={
                "habit-cell" +
                (checkins.has(cell.date) ? " done" : "") +
                (cell.today ? " today" : "") +
                (cell.future ? " future" : "")
              }
              onClick={() => !cell.future && toggle(cell.date)}
              disabled={cell.future}
              title={cell.date}
            >
              {cell.day}
            </button>
          ))}
        </div>
      </div>

      {calendarSection}
    </div>
  );
}
