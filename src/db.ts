import Database from "@tauri-apps/plugin-sql";
import type {
  CycleHistory,
  CycleItem,
  HabitCheckin,
  SimpleItem,
  Space,
  Sprint,
  TemplateSprint,
  Topic,
  Track,
  TrackInput,
} from "./types";

let dbPromise: Promise<Database> | null = null;

export function getDb(): Promise<Database> {
  if (!dbPromise) {
    dbPromise = Database.load("sqlite:studyplanner.db");
  }
  return dbPromise;
}

export async function listSpaces(): Promise<Space[]> {
  const db = await getDb();
  return db.select<Space[]>("SELECT * FROM space ORDER BY sort, id");
}

export async function createSpace(name: string, goal?: string): Promise<number> {
  const db = await getDb();
  const next = await db.select<{ m: number }[]>(
    "SELECT COALESCE(MAX(sort), -1) + 1 AS m FROM space"
  );
  const sort = next[0]?.m ?? 0;
  const res = await db.execute(
    "INSERT INTO space (name, goal, sort) VALUES (?, ?, ?)",
    [name, goal ?? null, sort]
  );
  return res.lastInsertId as number;
}

export async function updateSpace(
  id: number,
  fields: Partial<Pick<Space, "name" | "goal">>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  await db.execute(`UPDATE space SET ${set} WHERE id = ?`, [...values, id]);
}

export async function deleteSpace(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM space WHERE id = ?", [id]);
}

export async function setTrackSpace(trackId: number, spaceId: number | null): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE track SET space_id = ? WHERE id = ?", [spaceId, trackId]);
}

export interface ActiveTopicRow {
  id: number;
  title: string;
  est_hours: number;
  sprint_id: number;
  sprint_title: string;
  track_id: number;
  track_name: string;
  track_color: string;
  space_id: number | null;
}

export async function listActiveTopics(): Promise<ActiveTopicRow[]> {
  const db = await getDb();
  return db.select<ActiveTopicRow[]>(`
    SELECT t.id, t.title, t.est_hours,
      s.id AS sprint_id, s.title AS sprint_title,
      tr.id AS track_id, tr.name AS track_name, tr.color AS track_color, tr.space_id
    FROM topic t
    JOIN sprint s ON t.sprint_id = s.id
    JOIN track tr ON s.track_id = tr.id
    WHERE t.status = 'active'
    ORDER BY tr.sort, tr.id, s.id, t.id
  `);
}

export async function listBacklogTopics(): Promise<ActiveTopicRow[]> {
  const db = await getDb();
  return db.select<ActiveTopicRow[]>(`
    SELECT t.id, t.title, t.est_hours,
      s.id AS sprint_id, s.title AS sprint_title,
      tr.id AS track_id, tr.name AS track_name, tr.color AS track_color, tr.space_id
    FROM topic t
    JOIN sprint s ON t.sprint_id = s.id
    JOIN track tr ON s.track_id = tr.id
    WHERE t.status = 'backlog' AND tr.format = 'roadmap'
    ORDER BY tr.sort, tr.id, s.id, t.id
  `);
}

export async function reorderTracks(ids: number[]): Promise<void> {
  const db = await getDb();
  for (let i = 0; i < ids.length; i++) {
    await db.execute("UPDATE track SET sort = ? WHERE id = ?", [i, ids[i]]);
  }
}

export async function listTracks(): Promise<Track[]> {
  const db = await getDb();
  return db.select<Track[]>("SELECT * FROM track ORDER BY sort, id");
}

export async function createTrack(input: TrackInput): Promise<number> {
  const db = await getDb();
  const next = await db.select<{ m: number }[]>(
    "SELECT COALESCE(MAX(sort), -1) + 1 AS m FROM track"
  );
  const sort = next[0]?.m ?? 0;
  const settings = JSON.stringify(input.settings ?? {});
  const res = await db.execute(
    "INSERT INTO track (name, color, format, goal, description, tags, settings, sort, space_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [
      input.name,
      input.color,
      input.format,
      input.goal ?? null,
      input.description ?? null,
      input.tags ?? null,
      settings,
      sort,
      input.space_id ?? null,
    ]
  );
  return res.lastInsertId as number;
}

export async function renameTrack(id: number, name: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE track SET name = ? WHERE id = ?", [name, id]);
}

export async function updateTrack(
  id: number,
  fields: Partial<Pick<Track, "name" | "color" | "goal" | "description" | "tags">>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  await db.execute(`UPDATE track SET ${set} WHERE id = ?`, [...values, id]);
}

export async function setTrackSettings(
  id: number,
  settings: Record<string, unknown>
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE track SET settings = ? WHERE id = ?", [
    JSON.stringify(settings),
    id,
  ]);
}

export async function deleteTrack(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM track WHERE id = ?", [id]);
}

async function nextSort(table: string, col: string, id: number): Promise<number> {
  const db = await getDb();
  const rows = await db.select<{ m: number }[]>(
    `SELECT COALESCE(MAX(sort), -1) + 1 AS m FROM ${table} WHERE ${col} = ?`,
    [id]
  );
  return rows[0]?.m ?? 0;
}

export async function listSprints(trackId: number): Promise<Sprint[]> {
  const db = await getDb();
  return db.select<Sprint[]>(
    "SELECT * FROM sprint WHERE track_id = ? ORDER BY sort, id",
    [trackId]
  );
}

export async function createSprint(
  trackId: number,
  title: string,
  description?: string
): Promise<number> {
  const db = await getDb();
  const sort = await nextSort("sprint", "track_id", trackId);
  const res = await db.execute(
    "INSERT INTO sprint (track_id, title, description, sort) VALUES (?, ?, ?, ?)",
    [trackId, title, description ?? null, sort]
  );
  return res.lastInsertId as number;
}

export async function renameSprint(id: number, title: string): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sprint SET title = ? WHERE id = ?", [title, id]);
}

export async function setSprintDescription(
  id: number,
  description: string
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE sprint SET description = ? WHERE id = ?", [
    description.trim() || null,
    id,
  ]);
}

export async function deleteSprint(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM sprint WHERE id = ?", [id]);
}

export async function listTopics(sprintId: number): Promise<Topic[]> {
  const db = await getDb();
  return db.select<Topic[]>(
    "SELECT * FROM topic WHERE sprint_id = ? ORDER BY sort, id",
    [sprintId]
  );
}

export async function getTopic(id: number): Promise<Topic | undefined> {
  const db = await getDb();
  const rows = await db.select<Topic[]>("SELECT * FROM topic WHERE id = ?", [id]);
  return rows[0];
}

export async function createTopic(
  sprintId: number,
  title: string,
  estDays = 0
): Promise<number> {
  const db = await getDb();
  const sort = await nextSort("topic", "sprint_id", sprintId);
  const res = await db.execute(
    "INSERT INTO topic (sprint_id, title, est_hours, sort) VALUES (?, ?, ?, ?)",
    [sprintId, title, estDays, sort]
  );
  return res.lastInsertId as number;
}

export async function updateTopic(
  id: number,
  fields: Partial<Pick<Topic, "title" | "status" | "est_hours" | "markdown">>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  await db.execute(`UPDATE topic SET ${set} WHERE id = ?`, [...values, id]);
}

export async function deleteTopic(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM topic WHERE id = ?", [id]);
}


export async function logActivity(
  trackId: number,
  kind: string,
  delta: number
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT INTO activity (track_id, kind, delta, at) VALUES (?, ?, ?, ?)",
    [trackId, kind, delta, new Date().toISOString()]
  );
}

export async function activitySince(
  sinceIso: string
): Promise<{ track_id: number; n: number }[]> {
  const db = await getDb();
  return db.select<{ track_id: number; n: number }[]>(
    "SELECT track_id, COALESCE(SUM(delta), 0) AS n FROM activity WHERE at >= ? GROUP BY track_id",
    [sinceIso]
  );
}

export interface Progress {
  done: number;
  total: number;
}

export interface SprintProgress {
  id: number;
  title: string;
  done: number;
  total: number;
}

export async function sprintProgressList(
  trackId: number
): Promise<SprintProgress[]> {
  const db = await getDb();
  return db.select<SprintProgress[]>(
    `SELECT s.id, s.title,
       (SELECT COUNT(*) FROM topic WHERE sprint_id = s.id) AS total,
       (SELECT COUNT(*) FROM topic WHERE sprint_id = s.id AND status = 'done') AS done
     FROM sprint s WHERE s.track_id = ? ORDER BY s.sort, s.id`,
    [trackId]
  );
}

export async function roadmapProgress(trackId: number): Promise<Progress> {
  const db = await getDb();
  const rows = await db.select<Progress[]>(
    `SELECT COUNT(*) AS total,
       COALESCE(SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END), 0) AS done
     FROM topic WHERE sprint_id IN (SELECT id FROM sprint WHERE track_id = ?)`,
    [trackId]
  );
  return rows[0] ?? { done: 0, total: 0 };
}

export async function simpleProgress(trackId: number): Promise<Progress> {
  const db = await getDb();
  const rows = await db.select<Progress[]>(
    "SELECT COUNT(*) AS total, COALESCE(SUM(done), 0) AS done FROM simple_item WHERE track_id = ?",
    [trackId]
  );
  return rows[0] ?? { done: 0, total: 0 };
}

export async function listHabitCheckins(
  trackId: number
): Promise<HabitCheckin[]> {
  const db = await getDb();
  return db.select<HabitCheckin[]>(
    "SELECT * FROM habit_checkin WHERE track_id = ? ORDER BY date",
    [trackId]
  );
}

export async function addHabitCheckin(
  trackId: number,
  date: string
): Promise<void> {
  const db = await getDb();
  await db.execute(
    "INSERT OR IGNORE INTO habit_checkin (track_id, date) VALUES (?, ?)",
    [trackId, date]
  );
}

export async function removeHabitCheckin(
  trackId: number,
  date: string
): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM habit_checkin WHERE track_id = ? AND date = ?", [
    trackId,
    date,
  ]);
}

export async function listSimpleItems(trackId: number): Promise<SimpleItem[]> {
  const db = await getDb();
  return db.select<SimpleItem[]>(
    "SELECT * FROM simple_item WHERE track_id = ? ORDER BY sort, id",
    [trackId]
  );
}

export async function createSimpleItem(
  trackId: number,
  title: string,
  estDays = 0
): Promise<number> {
  const db = await getDb();
  const sort = await nextSort("simple_item", "track_id", trackId);
  const res = await db.execute(
    "INSERT INTO simple_item (track_id, title, est_days, sort) VALUES (?, ?, ?, ?)",
    [trackId, title, estDays, sort]
  );
  return res.lastInsertId as number;
}

export async function updateSimpleItem(
  id: number,
  fields: Partial<Pick<SimpleItem, "title" | "description" | "est_days">>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  await db.execute(`UPDATE simple_item SET ${set} WHERE id = ?`, [...values, id]);
}

export async function setSimpleItemDone(
  id: number,
  done: boolean
): Promise<void> {
  const db = await getDb();
  await db.execute("UPDATE simple_item SET done = ? WHERE id = ?", [
    done ? 1 : 0,
    id,
  ]);
}

export async function deleteSimpleItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM simple_item WHERE id = ?", [id]);
}

export async function listCycleItems(trackId: number): Promise<CycleItem[]> {
  const db = await getDb();
  return db.select<CycleItem[]>(
    "SELECT * FROM cycle_item WHERE track_id = ? ORDER BY sort, id",
    [trackId]
  );
}

export async function createCycleItem(
  trackId: number,
  title: string,
  target: number
): Promise<number> {
  const db = await getDb();
  const sort = await nextSort("cycle_item", "track_id", trackId);
  const res = await db.execute(
    "INSERT INTO cycle_item (track_id, title, target, sort) VALUES (?, ?, ?, ?)",
    [trackId, title, Math.max(1, target), sort]
  );
  return res.lastInsertId as number;
}

export async function bumpCycleItem(id: number, delta: number): Promise<void> {
  const db = await getDb();
  await db.execute(
    "UPDATE cycle_item SET count = MAX(0, count + ?) WHERE id = ?",
    [delta, id]
  );
}

export async function updateCycleItem(
  id: number,
  fields: Partial<Pick<CycleItem, "title" | "target" | "description">>
): Promise<void> {
  const db = await getDb();
  const keys = Object.keys(fields);
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => (fields as Record<string, unknown>)[k]);
  await db.execute(`UPDATE cycle_item SET ${set} WHERE id = ?`, [...values, id]);
}

export async function deleteCycleItem(id: number): Promise<void> {
  const db = await getDb();
  await db.execute("DELETE FROM cycle_item WHERE id = ?", [id]);
}

export async function listCycleHistory(
  trackId: number
): Promise<CycleHistory[]> {
  const db = await getDb();
  return db.select<CycleHistory[]>(
    "SELECT * FROM cycle_history WHERE track_id = ? ORDER BY idx DESC",
    [trackId]
  );
}

export async function completeCycle(
  trackId: number,
  success: boolean,
  doneCount: number,
  totalCount: number
): Promise<void> {
  const db = await getDb();
  const rows = await db.select<{ c: number }[]>(
    "SELECT COUNT(*) AS c FROM cycle_history WHERE track_id = ?",
    [trackId]
  );
  const idx = (rows[0]?.c ?? 0) + 1;
  await db.execute(
    "INSERT INTO cycle_history (track_id, idx, success, done_count, total_count, ended_at) VALUES (?, ?, ?, ?, ?, ?)",
    [trackId, idx, success ? 1 : 0, doneCount, totalCount, new Date().toISOString()]
  );
  await db.execute("UPDATE cycle_item SET count = 0 WHERE track_id = ?", [
    trackId,
  ]);
}

export async function seedRoadmap(
  trackId: number,
  sprints: TemplateSprint[]
): Promise<void> {
  for (const s of sprints) {
    if (!s?.title) continue;
    const sprintId = await createSprint(trackId, s.title, s.description);
    for (const tp of s.topics ?? []) {
      if (!tp?.title) continue;
      const topicId = await createTopic(sprintId, tp.title);
      const upd: Partial<Pick<Topic, "status" | "est_hours" | "markdown">> = {};
      if (tp.status) upd.status = tp.status;
      if (typeof tp.est_hours === "number") upd.est_hours = tp.est_hours;
      if (tp.markdown) upd.markdown = tp.markdown;
      if (Object.keys(upd).length) await updateTopic(topicId, upd);
    }
  }
}
