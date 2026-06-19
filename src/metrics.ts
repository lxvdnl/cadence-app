import type { Track } from "./types";
import { parseHabitSettings } from "./types";
import {
  listCycleHistory,
  listCycleItems,
  listHabitCheckins,
  simpleProgress,
  sprintProgressList,
} from "./db";
import { t } from "./i18n";

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function dayNum(dateStr: string): number {
  return Math.floor(Date.parse(dateStr + "T00:00:00Z") / 86400000);
}

export interface DailyStats {
  streak: number;
  best: number;
  todayDone: boolean;
}

export function computeDailyStreak(dates: string[]): DailyStats {
  const todayStr = toDateStr(new Date());
  const todayN = dayNum(todayStr);
  const nums = new Set(dates.map(dayNum));

  let streak = 0;
  let cur = nums.has(todayN) ? todayN : todayN - 1;
  while (nums.has(cur)) { streak++; cur--; }

  const sorted = [...nums].sort((a, b) => a - b);
  let best = 0, run = 0, prev = -2;
  for (const n of sorted) {
    run = n === prev + 1 ? run + 1 : 1;
    if (run > best) best = run;
    prev = n;
  }

  return { streak, best, todayDone: nums.has(todayN) };
}

export interface WeekRow {
  start: string;
  end: string;
  count: number;
  target: number;
  isCurrent: boolean;
}

export interface WeeklyStats {
  currentCount: number;
  streak: number;
  best: number;
  weeks: WeekRow[];
}

function getMonday(d: Date): Date {
  const r = new Date(d);
  const day = r.getDay();
  r.setDate(r.getDate() + (day === 0 ? -6 : 1 - day));
  r.setHours(0, 0, 0, 0);
  return r;
}

export function computeWeeklyData(
  daysPerWeek: number,
  dates: string[],
  startDate?: string | null,
  numWeeks = 12
): WeeklyStats {
  const today = new Date();
  const todayStr = toDateStr(today);
  const checkins = new Set(dates);
  const startStr = startDate ? startDate.slice(0, 10) : null;
  const mondayCurrent = getMonday(today);
  const weeks: WeekRow[] = [];

  for (let i = 0; i < numWeeks; i++) {
    const ws = new Date(mondayCurrent);
    ws.setDate(mondayCurrent.getDate() - i * 7);
    const we = new Date(ws);
    we.setDate(ws.getDate() + 6);
    const weStr = toDateStr(we);
    if (startStr && weStr < startStr) break;

    let count = 0;
    for (let d = 0; d < 7; d++) {
      const day = new Date(ws);
      day.setDate(ws.getDate() + d);
      const ds = toDateStr(day);
      if (ds > todayStr) break;
      if (checkins.has(ds)) count++;
    }

    weeks.push({ start: toDateStr(ws), end: weStr, count, target: daysPerWeek, isCurrent: i === 0 });
  }

  const currentCount = weeks[0]?.count ?? 0;

  let streak = 0;
  for (let i = 1; i < weeks.length; i++) {
    if (weeks[i].count >= daysPerWeek) streak++;
    else break;
  }

  let best = 0, run = 0;
  for (let i = weeks.length - 1; i >= 1; i--) {
    if (weeks[i].count >= daysPerWeek) { run++; if (run > best) best = run; }
    else run = 0;
  }

  return { currentCount, streak, best, weeks };
}

export interface TrackSummary {
  metric: string;
  value: string;
  pct: number | null;
  sub: string | null;
}

export async function getSegmentSummary(track: Track): Promise<TrackSummary> {
  if (track.format === "roadmap") {
    const sprints = await sprintProgressList(track.id);
    const withTasks = sprints.filter((s) => s.total > 0);
    const current =
      withTasks.find((s) => s.done < s.total) ??
      withTasks[withTasks.length - 1];
    const done = current?.done ?? 0;
    const total = current?.total ?? 0;
    return {
      metric: t("dash.activeSprint"),
      value: `${done}/${total}`,
      pct: total > 0 ? Math.round((done / total) * 100) : 0,
      sub: current?.title ?? null,
    };
  }

  if (track.format === "simple") {
    const p = await simpleProgress(track.id);
    return {
      metric: t("dash.itemsDone"),
      value: `${p.done}/${p.total}`,
      pct: p.total > 0 ? Math.round((p.done / p.total) * 100) : 0,
      sub: null,
    };
  }

  if (track.format === "cycle") {
    const [items, history] = await Promise.all([
      listCycleItems(track.id),
      listCycleHistory(track.id),
    ]);
    const total = items.length;
    const met = items.filter((i) => i.count >= i.target).length;
    const successful = history.filter((h) => h.success === 1).length;
    return {
      metric: t("dash.thisCycleLabel"),
      value: `${met}/${total}`,
      pct: total > 0 ? Math.round((met / total) * 100) : 0,
      sub: t("dash.successfulShort", { n: String(successful) }),
    };
  }

  const settings = parseHabitSettings(track.settings);
  const rows = await listHabitCheckins(track.id);
  const dates = rows.map((r) => r.date);

  if (settings.mode === "daily") {
    const { streak, best } = computeDailyStreak(dates);
    return {
      metric: t("habit.streak"),
      value: `${streak}`,
      pct: streak > 0 ? 100 : 0,
      sub: `${t("habit.best")}: ${best}`,
    };
  }

  const { currentCount, streak } = computeWeeklyData(settings.daysPerWeek, dates, settings.startDate);
  return {
    metric: t("dash.thisPeriodLabel"),
    value: `${currentCount}/${settings.daysPerWeek}`,
    pct: settings.daysPerWeek > 0 ? Math.round((currentCount / settings.daysPerWeek) * 100) : 0,
    sub: t("dash.streakShort", { n: String(streak) }),
  };
}
