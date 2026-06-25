import { useState } from "react";
import type { Track } from "../types";
import { formatLabel } from "../types";
import { RoadmapModule } from "./RoadmapModule";
import { CycleModule } from "./CycleModule";
import { SimpleModule } from "./SimpleModule";
import { HabitModule } from "./HabitModule";
import { t } from "../i18n";

interface Props {
  track: Track;
  onOpenTopic: (topicId: number) => void;
}

export function TrackView({ track, onOpenTopic }: Props) {
  const [headerActionsEl, setHeaderActionsEl] = useState<HTMLDivElement | null>(null);

  return (
    <div className="view">
      <div className="view-header">
        <span className="view-dot" style={{ background: track.color }} />
        <h1>{track.name}</h1>
        <span className="view-badge">{track.format}</span>
        <div className="view-header-spacer" />
        <div ref={setHeaderActionsEl} className="view-header-actions" />
      </div>

      {track.format === "roadmap" ? (
        <RoadmapModule track={track} onOpenTopic={onOpenTopic} />
      ) : track.format === "cycle" ? (
        <CycleModule track={track} headerActionsEl={headerActionsEl} />
      ) : track.format === "simple" ? (
        <SimpleModule track={track} />
      ) : track.format === "habit" ? (
        <HabitModule track={track} />
      ) : (
        <div className="placeholder">
          <p>{t("view.placeholder", { format: track.format })}</p>
          <p className="placeholder-sub">{formatLabel(track.format)}</p>
        </div>
      )}
    </div>
  );
}
