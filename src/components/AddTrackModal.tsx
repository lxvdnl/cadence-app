import { useState } from "react";
import type { Space, TrackFormat, TrackInput, TrackSeed } from "../types";
import { ModalBackdrop } from "./ModalBackdrop";
import { TRACK_FORMATS, formatLabel, formatDesc } from "../types";
import { t } from "../i18n";

const COLORS = ["#6c8cff", "#4cc38a", "#f5a623", "#e5534b", "#a36cff", "#3ac6c6"];

const TEMPLATES: Partial<Record<TrackFormat, string>> = {
  roadmap: `{
  "sprints": [
    {
      "title": "Sprint name",
      "description": "Optional description",
      "topics": [
        {
          "title": "Topic name",
          "status": "backlog",
          "est_hours": 4
        }
      ]
    }
  ]
}`,
  cycle: `{
  "items": [
    { "title": "Item name", "target": 3 },
    { "title": "Another item", "target": 5 }
  ]
}`,
  simple: `{
  "items": [
    { "title": "Item name" },
    { "title": "Another item" }
  ]
}`,
};

const FIELDS: Partial<Record<TrackFormat, { key: string; desc: string }[]>> = {
  roadmap: [
    { key: "sprints", desc: "Array of sprints to create." },
    { key: "sprints[].title", desc: "Sprint name (required)." },
    { key: "sprints[].description", desc: "Sprint scope description (optional)." },
    { key: "sprints[].topics[]", desc: "Array of topics (optional)." },
    { key: "topics[].title", desc: "Topic name (required)." },
    { key: "topics[].status", desc: '"backlog" | "active" | "done" — defaults to "backlog".' },
    { key: "topics[].est_hours", desc: "Estimated days to complete (optional number)." },
  ],
  cycle: [
    { key: "items", desc: "Array of cycle items to create." },
    { key: "items[].title", desc: "Item name (required)." },
    { key: "items[].target", desc: "Target count per cycle (optional, default: 1)." },
  ],
  simple: [
    { key: "items", desc: "Array of checklist items to create." },
    { key: "items[].title", desc: "Item name (required)." },
  ],
};

interface Props {
  spaces: Space[];
  defaultSpaceId?: number | null;
  onClose: () => void;
  onCreate: (input: TrackInput, seed?: TrackSeed) => void;
}

export function AddTrackModal({ spaces, defaultSpaceId, onClose, onCreate }: Props) {
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [format, setFormat] = useState<TrackFormat>("roadmap");
  const [cycleDays, setCycleDays] = useState("14");
  const [habitMode, setHabitMode] = useState<"daily" | "weekly">("weekly");
  const [habitTarget, setHabitTarget] = useState("7");
  const [selectedSpace, setSelectedSpace] = useState<number | null>(defaultSpaceId ?? null);

  const [sprintsOpen, setSprintsOpen] = useState(false);
  const [showFields, setShowFields] = useState(false);
  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const tpl = TEMPLATES[format];
  const fields = FIELDS[format];

  const copyTemplate = () => {
    if (!tpl && !fields) return;
    const lines: string[] = [];
    if (fields?.length) {
      lines.push("Fields:");
      for (const f of fields) lines.push(`${f.key} — ${f.desc}`);
    }
    if (tpl) {
      if (lines.length) lines.push("");
      lines.push("Example:");
      lines.push(tpl);
    }
    navigator.clipboard.writeText(lines.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    const settings =
      format === "cycle"
        ? { cycleDays: Math.max(1, parseInt(cycleDays, 10) || 14), startDate: new Date().toISOString() }
        : format === "habit"
          ? {
              mode: habitMode,
              daysPerWeek: habitMode === "weekly"
                ? Math.max(1, Math.min(7, parseInt(habitTarget, 10) || 7))
                : 1,
              startDate: new Date().toISOString(),
            }
          : undefined;

    const input: TrackInput = {
      name: trimmed,
      color,
      format,
      settings,
      space_id: selectedSpace,
    };

    if (raw.trim()) {
      try {
        const parsed = JSON.parse(raw);
        const seed: TrackSeed = {};
        if (format === "roadmap") seed.sprints = parsed.sprints;
        else if (format === "cycle") seed.cycleItems = parsed.items;
        else if (format === "simple") seed.simpleItems = parsed.items;
        onCreate(input, seed);
      } catch {
        setError(t("addTrack.templateError"));
        return;
      }
    } else {
      onCreate(input);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="modal">
        <h2>{t("addTrack.title")}</h2>

        <label>{t("addTrack.name")}</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />

        <label>{t("addTrack.color")}</label>
        <div className="color-row">
          {COLORS.map((c) => (
            <button
              key={c}
              className={"color-dot" + (c === color ? " active" : "")}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>

        <label>{t("addTrack.format")}</label>
        <div className="format-list">
          {TRACK_FORMATS.map((f) => (
            <div key={f} className={"format-option" + (f === format ? " active" : "")}>
              <button className="format-pick" onClick={() => setFormat(f)}>
                {formatLabel(f)}
              </button>
              {f === format && <div className="format-desc">{formatDesc(f)}</div>}
            </div>
          ))}
        </div>

        {format === "cycle" && (
          <>
            <label>{t("addTrack.cycleDays")}</label>
            <input
              type="number"
              min="1"
              value={cycleDays}
              onChange={(e) => setCycleDays(e.target.value)}
            />
          </>
        )}

        {format === "habit" && (
          <>
            <div className="habit-mode-row">
              <button
                className={`habit-mode-btn${habitMode === "daily" ? " active" : ""}`}
                onClick={() => setHabitMode("daily")}
              >
                <span className="habit-mode-icon">🔥</span>
                <span className="habit-mode-label">{t("habit.mode.daily")}</span>
              </button>
              <button
                className={`habit-mode-btn${habitMode === "weekly" ? " active" : ""}`}
                onClick={() => setHabitMode("weekly")}
              >
                <span className="habit-mode-icon">📅</span>
                <span className="habit-mode-label">{t("habit.mode.weekly")}</span>
              </button>
            </div>
            {habitMode === "weekly" && (
              <>
                <label>{t("habit.daysPerWeek")}</label>
                <input
                  type="number"
                  min="1"
                  max="7"
                  value={habitTarget}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") { setHabitTarget(""); return; }
                    const n = parseInt(raw, 10);
                    if (isNaN(n)) return;
                    setHabitTarget(String(Math.max(1, Math.min(7, n))));
                  }}
                />
              </>
            )}
          </>
        )}

        {spaces.length > 0 && (
          <>
            <label>{t("space.assign")}</label>
            <div className="space-picker">
              <button
                className={"space-chip" + (selectedSpace === null ? " active" : "")}
                onClick={() => setSelectedSpace(null)}
              >
                {t("space.none")}
              </button>
              {spaces.map((s) => (
                <button
                  key={s.id}
                  className={"space-chip" + (selectedSpace === s.id ? " active" : "")}
                  onClick={() => setSelectedSpace(s.id)}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </>
        )}

        {tpl && (
          <div className={"sprints-card" + (sprintsOpen ? " open" : "")}>
            <button
              className="sprints-toggle"
              onClick={() => setSprintsOpen((v) => !v)}
            >
              <span>{sprintsOpen ? "▼" : "▶"}</span>
              {t("addTrack.sprintsSection")}
            </button>

            {sprintsOpen && (
              <div className="sprints-body">
                <div className="sprints-section-head">
                  {fields && (
                    <button
                      className="format-info"
                      title={t("addTrack.templateInfo")}
                      onClick={() => setShowFields((v) => !v)}
                    >
                      i
                    </button>
                  )}
                  <button className="tpl-copy-btn" onClick={copyTemplate}>
                    {copied ? t("addTrack.copied") : t("addTrack.copyTemplate")}
                  </button>
                </div>

                {showFields && fields && (
                  <div className="template-help">
                    <div className="template-help-title">{t("addTrack.templateFields")}</div>
                    {fields.map((f) => (
                      <div key={f.key} className="tpl-field">
                        <div className="tpl-field-head">
                          <code className="tpl-key">{f.key}</code>
                        </div>
                        <div className="tpl-desc">{f.desc}</div>
                      </div>
                    ))}
                  </div>
                )}

                <textarea
                  className="template-input"
                  value={raw}
                  onChange={(e) => { setRaw(e.target.value); setError(""); }}
                  placeholder={tpl}
                  rows={8}
                />
                {error && <div className="form-error">{error}</div>}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-ghost" onClick={onClose}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary" onClick={submit} disabled={!name.trim()}>
            {t("common.create")}
          </button>
        </div>
      </div>
    </ModalBackdrop>
  );
}
