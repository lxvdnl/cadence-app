import { TRACK_FORMATS, type TrackInput, type TrackTemplate } from "./types";

export function parseTemplate(raw: string): TrackTemplate {
  const data = JSON.parse(raw) as Partial<TrackTemplate>;
  if (
    data.schema !== "studyplanner.track" ||
    data.version !== 1 ||
    typeof data.name !== "string" ||
    !data.name.trim() ||
    typeof data.format !== "string" ||
    !TRACK_FORMATS.includes(data.format as never)
  ) {
    throw new Error("invalid template");
  }
  if (data.sprints !== undefined && !Array.isArray(data.sprints)) {
    throw new Error("invalid template");
  }
  return data as TrackTemplate;
}

export function templateToInput(tpl: TrackTemplate): TrackInput {
  const tags = Array.isArray(tpl.tags) ? tpl.tags.join(", ") : tpl.tags;
  return {
    name: tpl.name.trim(),
    color: tpl.color ?? "#6c8cff",
    format: tpl.format,
    goal: tpl.goal?.trim() || undefined,
    description: tpl.description?.trim() || undefined,
    tags: tags?.trim() || undefined,
    settings: tpl.settings ?? {},
  };
}
