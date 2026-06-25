import { t } from "./i18n";

export type TrackFormat = "roadmap" | "cycle" | "simple" | "habit";

export const TRACK_FORMATS: TrackFormat[] = [
  "roadmap",
  "cycle",
  "simple",
  "habit",
];

export interface Space {
  id: number;
  name: string;
  goal: string | null;
  sort: number;
}

export interface Track {
  id: number;
  name: string;
  color: string;
  icon: string | null;
  format: TrackFormat;
  settings: string;
  description: string | null;
  tags: string | null;
  sort: number;
  space_id: number | null;
}

export type TopicStatus = "backlog" | "active" | "done";

export interface Sprint {
  id: number;
  track_id: number;
  title: string;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  sort: number;
}

export interface Topic {
  id: number;
  sprint_id: number;
  title: string;
  status: TopicStatus;
  est_hours: number;
  markdown: string;
  sort: number;
}


export interface CycleItem {
  id: number;
  track_id: number;
  title: string;
  target: number;
  count: number;
  description: string | null;
  sort: number;
}

export interface SimpleItem {
  id: number;
  track_id: number;
  title: string;
  done: number;
  est_days: number;
  description: string | null;
  sort: number;
}

export interface CycleHistory {
  id: number;
  track_id: number;
  idx: number;
  success: number;
  done_count: number;
  total_count: number;
  ended_at: string;
}

export interface HabitCheckin {
  id: number;
  track_id: number;
  date: string;
}

export interface CycleSettings {
  cycleDays: number;
  startDate: string | null;
  currentCycleDays?: number;
}

export interface HabitSettings {
  mode: "daily" | "weekly";
  daysPerWeek: number;
  startDate: string | null;
}

export function parseHabitSettings(settings: string): HabitSettings {
  let parsed: Partial<Record<string, unknown>> = {};
  try {
    parsed = JSON.parse(settings) as Partial<Record<string, unknown>>;
  } catch {
    parsed = {};
  }
  return {
    mode: parsed.mode === "daily" ? "daily" : "weekly",
    daysPerWeek:
      typeof parsed.daysPerWeek === "number" ? parsed.daysPerWeek :
      typeof parsed.target === "number" ? parsed.target : 7,
    startDate: typeof parsed.startDate === "string" ? parsed.startDate : null,
  };
}

export function parseCycleSettings(settings: string): CycleSettings {
  let parsed: Partial<CycleSettings> = {};
  try {
    parsed = JSON.parse(settings) as Partial<CycleSettings>;
  } catch {
    parsed = {};
  }
  return {
    cycleDays: typeof parsed.cycleDays === "number" ? parsed.cycleDays : 14,
    startDate: typeof parsed.startDate === "string" ? parsed.startDate : null,
    currentCycleDays: typeof parsed.currentCycleDays === "number" ? parsed.currentCycleDays : undefined,
  };
}

export interface TrackInput {
  name: string;
  color: string;
  format: TrackFormat;
  description?: string;
  tags?: string;
  settings?: Record<string, unknown>;
  space_id?: number | null;
}

export interface TemplateTopic {
  title: string;
  status?: TopicStatus;
  est_hours?: number;
  markdown?: string;
}

export interface TemplateSprint {
  title: string;
  description?: string;
  topics?: TemplateTopic[];
}

export interface TemplateCycleItem {
  title: string;
  target?: number;
}

export interface TemplateSimpleItem {
  title: string;
}

export interface TrackSeed {
  sprints?: TemplateSprint[];
  cycleItems?: TemplateCycleItem[];
  simpleItems?: TemplateSimpleItem[];
}

export interface TrackTemplate {
  schema: "studyplanner.track";
  version: 1;
  name: string;
  format: TrackFormat;
  color?: string;
  description?: string;
  tags?: string | string[];
  settings?: Record<string, unknown>;
  sprints?: TemplateSprint[];
}

export function formatLabel(f: TrackFormat): string {
  return t(`format.${f}`);
}

export function formatDesc(f: TrackFormat): string {
  return t(`format.${f}.desc`);
}

export function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  return tags
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export type View =
  | { type: "dashboard" }
  | { type: "daily" }
  | { type: "track"; id: number }
  | { type: "topic"; topicId: number; trackId: number };
