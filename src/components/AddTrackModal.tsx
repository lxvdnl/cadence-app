import { useState } from "react";
import type { Space, TrackFormat, TrackInput } from "../types";
import { TRACK_FORMATS, formatLabel, formatDesc } from "../types";
import type { TrackTemplate } from "../types";
import { parseTemplate } from "../templates";
import { t } from "../i18n";

const COLORS = ["#6c8cff", "#4cc38a", "#f5a623", "#e5534b", "#a36cff", "#3ac6c6"];

const TEMPLATE_EXAMPLE = `{
  "schema": "studyplanner.track",
  "version": 1,
  "name": "Java & frameworks",
  "format": "roadmap",
  "color": "#6c8cff",
  "goal": "Land a senior backend offer",
  "description": "Deep dive into Java backend and the ecosystem.",
  "tags": ["backend", "java", "interview"],
  "sprints": [
    {
      "title": "Kafka",
      "description": "Messaging fundamentals",
      "topics": [
        {
          "title": "Producers & Consumers",
          "status": "active",
          "est_hours": 6,
          "tasks": ["Read the docs", { "title": "Write a demo", "done": false }]
        }
      ]
    },
    { "title": "Spring Boot" }
  ]
}`;


const TEMPLATE_FIELDS: { key: string; required: boolean }[] = [
  { key: "schema", required: true },
  { key: "version", required: true },
  { key: "name", required: true },
  { key: "format", required: true },
  { key: "color", required: false },
  { key: "goal", required: false },
  { key: "description", required: false },
  { key: "tags", required: false },
  { key: "settings", required: false },
  { key: "sprints", required: false },
];

interface Props {
  spaces: Space[];
  onClose: () => void;
  onCreate: (input: TrackInput) => void;
  onCreateFromTemplate: (tpl: TrackTemplate) => void;
}

export function AddTrackModal({
  spaces,
  onClose,
  onCreate,
  onCreateFromTemplate,
}: Props) {
  const [tab, setTab] = useState<"blank" | "template">("blank");

  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [format, setFormat] = useState<TrackFormat>("roadmap");
  const [goal, setGoal] = useState("");
  const [cycleDays, setCycleDays] = useState("14");
  const [habitMode, setHabitMode] = useState<"daily" | "weekly">("weekly");
  const [habitTarget, setHabitTarget] = useState("7");
  const [selectedSpace, setSelectedSpace] = useState<number | null>(null);

  const [infoFormat, setInfoFormat] = useState<TrackFormat | null>(null);

  const [raw, setRaw] = useState("");
  const [error, setError] = useState("");
  const [showFields, setShowFields] = useState(false);

  const submitBlank = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const settings =
      format === "cycle"
        ? {
            cycleDays: Math.max(1, parseInt(cycleDays, 10) || 14),
            startDate: new Date().toISOString(),
          }
        : format === "habit"
          ? {
              mode: habitMode,
              daysPerWeek: habitMode === "weekly"
                ? Math.max(1, Math.min(7, parseInt(habitTarget, 10) || 7))
                : 1,
              startDate: new Date().toISOString(),
            }
          : undefined;
    onCreate({
      name: trimmed,
      color,
      format,
      goal: goal.trim() || undefined,
      settings,
      space_id: selectedSpace,
    });
  };

  const submitTemplate = () => {
    try {
      const tpl = parseTemplate(raw);
      onCreateFromTemplate(tpl);
    } catch {
      setError(t("addTrack.templateError"));
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>{t("addTrack.title")}</h2>

        <div className="tabs">
          <button
            className={"tab" + (tab === "blank" ? " active" : "")}
            onClick={() => setTab("blank")}
          >
            {t("addTrack.tab.blank")}
          </button>
          <button
            className={"tab" + (tab === "template" ? " active" : "")}
            onClick={() => setTab("template")}
          >
            {t("addTrack.tab.template")}
          </button>
        </div>

        {tab === "blank" ? (
          <>
            <label>{t("addTrack.name")}</label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitBlank()}
              placeholder={t("addTrack.namePlaceholder")}
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
                <div
                  key={f}
                  className={"format-option" + (f === format ? " active" : "")}
                >
                  <div className="format-row">
                    <button className="format-pick" onClick={() => setFormat(f)}>
                      {formatLabel(f)}
                    </button>
                    <button
                      className="format-info"
                      title={t("addTrack.formatInfo")}
                      onClick={() =>
                        setInfoFormat(infoFormat === f ? null : f)
                      }
                    >
                      i
                    </button>
                  </div>
                  {infoFormat === f && (
                    <div className="format-desc">{formatDesc(f)}</div>
                  )}
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
                <div className="habit-mode-cards">
                  <button
                    className={`habit-mode-card${habitMode === "daily" ? " active" : ""}`}
                    onClick={() => setHabitMode("daily")}
                  >
                    <div className="habit-mode-icon">🔥</div>
                    <div className="habit-mode-name">{t("habit.mode.daily")}</div>
                    <div className="habit-mode-desc">{t("habit.mode.daily.desc")}</div>
                  </button>
                  <button
                    className={`habit-mode-card${habitMode === "weekly" ? " active" : ""}`}
                    onClick={() => setHabitMode("weekly")}
                  >
                    <div className="habit-mode-icon">📅</div>
                    <div className="habit-mode-name">{t("habit.mode.weekly")}</div>
                    <div className="habit-mode-desc">{t("habit.mode.weekly.desc")}</div>
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
                      onChange={(e) => setHabitTarget(e.target.value)}
                    />
                  </>
                )}
              </>
            )}

            <label>{t("addTrack.goal")}</label>
            <input
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder={t("addTrack.goalPlaceholder")}
            />

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

            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={submitBlank}
                disabled={!name.trim()}
              >
                {t("common.create")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="label-row">
              <label>{t("addTrack.templatePaste")}</label>
              <button
                className="format-info"
                title={t("addTrack.templateInfo")}
                onClick={() => setShowFields((v) => !v)}
              >
                i
              </button>
            </div>

            {showFields && (
              <div className="template-help">
                <div className="template-help-title">
                  {t("addTrack.templateFields")}
                </div>
                {TEMPLATE_FIELDS.map((f) => (
                  <div key={f.key} className="tpl-field">
                    <div className="tpl-field-head">
                      <code className="tpl-key">{f.key}</code>
                      <span
                        className={"tpl-tag" + (f.required ? " req" : " opt")}
                      >
                        {t(f.required ? "tpl.required" : "tpl.optional")}
                      </span>
                    </div>
                    <div className="tpl-desc">{t(`tpl.${f.key}`)}</div>
                  </div>
                ))}
                <div className="tpl-example-label">
                  {t("addTrack.templateExample")}
                </div>
                <pre className="tpl-example">{TEMPLATE_EXAMPLE}</pre>
                <button
                  className="tpl-insert"
                  onClick={() => {
                    setRaw(TEMPLATE_EXAMPLE);
                    setError("");
                  }}
                >
                  {t("addTrack.templateUseExample")}
                </button>
              </div>
            )}

            <textarea
              className="template-input"
              autoFocus
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value);
                setError("");
              }}
              placeholder='{ "schema": "studyplanner.track", "version": 1, ... }'
              rows={10}
            />
            {error && <div className="form-error">{error}</div>}

            <div className="modal-actions">
              <button className="btn-ghost" onClick={onClose}>
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary"
                onClick={submitTemplate}
                disabled={!raw.trim()}
              >
                {t("common.import")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
