import { useEffect, useState } from "react";
import type { Space, Track } from "../types";
import { getSegmentSummary, type TrackSummary } from "../metrics";
import { t } from "../i18n";

interface Props {
  tracks: Track[];
  spaces: Space[];
  onOpen: (id: number) => void;
}

export function Dashboard({ tracks, spaces, onOpen }: Props) {
  const [spaceFilter, setSpaceFilter] = useState<number | "all">("all");
  const [segments, setSegments] = useState<Record<number, TrackSummary>>({});

  const visibleTracks =
    spaceFilter === "all"
      ? tracks
      : tracks.filter((tr) => tr.space_id === spaceFilter);

  const selectedSpace =
    spaceFilter !== "all" ? spaces.find((s) => s.id === spaceFilter) : null;

  useEffect(() => {
    let alive = true;
    (async () => {
      const entries = await Promise.all(
        tracks.map(async (tr) => [tr.id, await getSegmentSummary(tr)] as const)
      );
      if (alive) setSegments(Object.fromEntries(entries));
    })();
    return () => { alive = false; };
  }, [tracks]);

  return (
    <div className="view">
      <div className="view-header">
        <div>
          <h1>{selectedSpace ? selectedSpace.name : t("nav.dashboard")}</h1>
          {selectedSpace?.goal && (
            <div className="dash-space-goal">{selectedSpace.goal}</div>
          )}
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

      {visibleTracks.length === 0 ? (
        <div className="placeholder">
          <p>{t("dashboard.empty")}</p>
        </div>
      ) : (
        <div className="dash-grid">
          {visibleTracks.map((track) => {
            const s = segments[track.id];
            return (
              <button
                key={track.id}
                className={"dash-card" + (s?.pct === 100 ? " dash-card--done" : "")}
                onClick={() => onOpen(track.id)}
              >
                <div className="dash-card-head">
                  <span className="nav-dot" style={{ background: track.color }} />
                  <span className="dash-name">{track.name}</span>
                  <span className="dash-badge">{track.format}</span>
                </div>
                {s ? (
                  <>
                    <div className="dash-value">{s.value}</div>
                    <div className="dash-metric">{s.metric}</div>
                    {s.pct !== null && (
                      <div className="bar">
                        <div className="bar-fill" style={{ width: `${s.pct}%` }} />
                      </div>
                    )}
                    {s.sub && <div className="dash-sub">{s.sub}</div>}
                  </>
                ) : (
                  <div className="dash-metric">{t("dash.empty")}</div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
