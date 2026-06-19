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

const GRID_DAYS = 35;

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

function formatWeekLabel(start: string, end: string): string {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const sm = months[s.getMonth()];
  const em = months[e.getMonth()];
  if (sm === em) return `${sm} ${s.getDate()}–${e.getDate()}`;
  return `${sm} ${s.getDate()} – ${em} ${e.getDate()}`;
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
    if (settings.mode !== "daily") return [];
    const today = new Date();
    const mondayCurrent = getMonday(today);
    const weeksToShow = showHistory ? Math.min(GRID_DAYS / 7, 5) : 1;
    const days: { date: string; day: number; today: boolean; future: boolean }[] = [];

    for (let w = weeksToShow - 1; w >= 0; w--) {
      const weekStart = new Date(mondayCurrent);
      weekStart.setDate(mondayCurrent.getDate() - w * 7);
      for (let d = 0; d < 7; d++) {
        const day = new Date(weekStart);
        day.setDate(weekStart.getDate() + d);
        const ds = toDateStr(day);
        days.push({ date: ds, day: day.getDate(), today: ds === todayStr, future: ds > todayStr });
      }
    }
    return days;
  }, [todayStr, settings.mode, showHistory]);

  if (settings.mode === "daily") {
    const streak = dailyStats?.streak ?? 0;
    const best = dailyStats?.best ?? 0;

    return (
      <div className="habit">
        <div className="habit-stats">
          <div className="habit-streak-block">
            <div className="habit-streak-num">{streak}</div>
            <div className="habit-streak-label">{t("habit.dayStreak")}</div>
          </div>
          <div className="habit-stat">
            <div className="habit-stat-num">{best}</div>
            <div className="habit-stat-label">{t("habit.best")}</div>
          </div>
          <button className="btn-primary habit-mark-btn" onClick={() => toggle(todayStr)}>
            {todayDone ? t("habit.unmarkToday") : t("habit.markToday")}
          </button>
        </div>

        <div className="habit-grid-labels">
          {["Mo","Tu","We","Th","Fr","Sa","Su"].map((l) => (
            <div key={l} className="habit-day-label">{l}</div>
          ))}
        </div>
        <div className="habit-grid">
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
        <button className="btn-ghost habit-history-toggle" onClick={() => setShowHistory((v) => !v)}>
          {showHistory ? t("habit.hideHistory") : t("habit.showHistory")}
        </button>
      </div>
    );
  }

  const currentCount = weeklyData?.currentCount ?? 0;
  const target = settings.daysPerWeek;
  const pct = target > 0 ? Math.min(100, Math.round((currentCount / target) * 100)) : 0;
  const streak = weeklyData?.streak ?? 0;
  const best = weeklyData?.best ?? 0;
  const weeks = weeklyData?.weeks ?? [];

  return (
    <div className="habit">
      <div className="habit-stats">
        <div className="habit-period-card">
          <div className="habit-period-label">
            {t("habit.thisWeek")}: {currentCount}/{target}
          </div>
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
        </div>
        <div className="habit-stat">
          <div className="habit-stat-num">{streak}</div>
          <div className="habit-stat-label">{t("habit.streak")} · {t("habit.weeks")}</div>
        </div>
        <div className="habit-stat">
          <div className="habit-stat-num">{best}</div>
          <div className="habit-stat-label">{t("habit.best")}</div>
        </div>
        <button className="btn-primary habit-mark-btn" onClick={() => toggle(todayStr)}>
          {todayDone ? t("habit.unmarkToday") : t("habit.markToday")}
        </button>
      </div>

      <div className="section-head">
        <span>{t("habit.weeklyHistory")}</span>
      </div>
      <div className="habit-weeks">
        {weeks.map((week) => {
          const wpct = target > 0 ? Math.min(100, Math.round((week.count / target) * 100)) : 0;
          const met = week.count >= target;
          return (
            <div
              key={week.start}
              className={`habit-week-row${week.isCurrent ? " current" : met ? " met" : " missed"}`}
            >
              <span className="habit-week-label">{formatWeekLabel(week.start, week.end)}</span>
              <div className="habit-week-right">
                {week.isCurrent ? (
                  <>
                    <div className="habit-week-bar">
                      <div className="habit-week-fill" style={{ width: `${wpct}%` }} />
                    </div>
                    <span className="habit-week-count">{week.count}/{target}</span>
                  </>
                ) : (
                  <>
                    <span className="habit-week-count">{week.count}/{target}</span>
                    <span className={`habit-week-status ${met ? "met" : "missed"}`}>
                      {met ? "✓" : "✗"}
                    </span>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
