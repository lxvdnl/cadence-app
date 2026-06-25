import { Fragment, useEffect, useRef, useState } from "react";
import type { Space, Track, View } from "../types";
import { t } from "../i18n";

type DropPos = { spaceId: number | null; beforeTrackId: number | null } | null;

interface Props {
  tracks: Track[];
  spaces: Space[];
  view: View;
  onSelect: (view: View) => void;
  onAdd: () => void;
  onAddSpace: () => void;
  onRequestDelete: (track: Track) => void;
  onRename: (id: number, name: string) => void;
  onDeleteSpace: (space: Space) => void;
  onEditSpace: (space: Space) => void;
  onMoveTrack: (trackId: number, spaceId: number | null, beforeTrackId: number | null) => void;
  onAddTrackInSpace: (spaceId: number) => void;
}

function findDropPos(e: PointerEvent, draggedId: number): DropPos {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  if (!el) return null;

  const spaceEl = el.closest("[data-space-id]") as HTMLElement | null;
  const ungroupedEl = el.closest("[data-ungrouped]");

  let zoneEl: Element | null = null;
  let spaceId: number | null | undefined;

  if (spaceEl) {
    zoneEl = spaceEl;
    spaceId = Number(spaceEl.dataset.spaceId);
  } else if (ungroupedEl) {
    zoneEl = ungroupedEl;
    spaceId = null;
  }

  if (!zoneEl || spaceId === undefined) return null;

  const trackEls = Array.from(zoneEl.querySelectorAll("[data-track-id]")).filter(
    (el) => Number((el as HTMLElement).dataset.trackId) !== draggedId
  );

  let beforeTrackId: number | null = null;
  for (const trackEl of trackEls) {
    const rect = trackEl.getBoundingClientRect();
    if (e.clientY < rect.top + rect.height / 2) {
      beforeTrackId = Number((trackEl as HTMLElement).dataset.trackId);
      break;
    }
  }

  return { spaceId, beforeTrackId };
}

export function Sidebar({
  tracks,
  spaces,
  view,
  onSelect,
  onAdd,
  onAddSpace,
  onRequestDelete,
  onRename,
  onDeleteSpace,
  onEditSpace,
  onMoveTrack,
  onAddTrackInSpace,
}: Props) {
  const [menuId, setMenuId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [spaceMenuId, setSpaceMenuId] = useState<number | null>(null);
  const [ungroupedMenuOpen, setUngroupedMenuOpen] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<number>>(new Set());
  const [ungroupedCollapsed, setUngroupedCollapsed] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropPos, setDropPos] = useState<DropPos>(null);

  const renamingIdRef = useRef(renamingId);
  useEffect(() => { renamingIdRef.current = renamingId; }, [renamingId]);
  const onMoveTrackRef = useRef(onMoveTrack);
  useEffect(() => { onMoveTrackRef.current = onMoveTrack; }, [onMoveTrack]);
  const onSelectRef = useRef(onSelect);
  useEffect(() => { onSelectRef.current = onSelect; }, [onSelect]);

  const ghostRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<{ trackId: number; startX: number; startY: number; active: boolean } | null>(null);

  useEffect(() => {
    if (draggingId === null) return;

    document.body.style.userSelect = "none";
    (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = "none";

    const onMove = (e: PointerEvent) => {
      const ghost = ghostRef.current;
      if (ghost) {
        ghost.style.left = `${e.clientX + 14}px`;
        ghost.style.top = `${e.clientY - 14}px`;
      }
      const info = dragStateRef.current;
      if (!info) return;
      setDropPos(findDropPos(e, info.trackId));
    };

    const onUp = (e: PointerEvent) => {
      ghostRef.current?.remove();
      ghostRef.current = null;
      document.body.style.userSelect = "";
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = "";

      const info = dragStateRef.current;
      if (info) {
        const dp = findDropPos(e, info.trackId);
        if (dp !== null) {
          onMoveTrackRef.current(info.trackId, dp.spaceId, dp.beforeTrackId);
        }
      }

      dragStateRef.current = null;
      setDraggingId(null);
      setDropPos(null);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      ghostRef.current?.remove();
      ghostRef.current = null;
      document.body.style.userSelect = "";
      (document.body.style as CSSStyleDeclaration & { webkitUserSelect: string }).webkitUserSelect = "";
    };
  }, [draggingId]);

  const handleTrackPointerDown = (e: React.PointerEvent, track: Track) => {
    if (e.button !== 0) return;
    if (renamingIdRef.current === track.id) return;

    dragStateRef.current = { trackId: track.id, startX: e.clientX, startY: e.clientY, active: false };

    const onFirstMove = (ev: PointerEvent) => {
      const info = dragStateRef.current;
      if (!info) { cleanup(); return; }
      const d = Math.hypot(ev.clientX - info.startX, ev.clientY - info.startY);
      if (d < 6) return;

      cleanup();
      info.active = true;
      setMenuId(null);

      const ghost = document.createElement("div");
      ghost.className = "nav-drag-ghost";
      ghost.style.left = `${ev.clientX + 14}px`;
      ghost.style.top = `${ev.clientY - 14}px`;
      ghost.innerHTML = `<span class="nav-dot" style="background:${track.color}"></span><span>${track.name}</span>`;
      document.body.appendChild(ghost);
      ghostRef.current = ghost;

      setDraggingId(track.id);
    };

    const onFirstUp = () => {
      cleanup();
      const info = dragStateRef.current;
      if (info && !info.active) {
        dragStateRef.current = null;
        if (renamingIdRef.current !== track.id) {
          onSelectRef.current({ type: "track", id: track.id });
        }
      }
    };

    const cleanup = () => {
      document.removeEventListener("pointermove", onFirstMove);
      document.removeEventListener("pointerup", onFirstUp);
    };

    document.addEventListener("pointermove", onFirstMove);
    document.addEventListener("pointerup", onFirstUp);
  };

  const startRename = (track: Track) => {
    setMenuId(null);
    setRenamingId(track.id);
    setRenameValue(track.name);
  };

  const commitRename = () => {
    if (renamingId != null) {
      const name = renameValue.trim();
      if (name) onRename(renamingId, name);
    }
    setRenamingId(null);
  };

  const toggleCollapse = (spaceId: number) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(spaceId)) next.delete(spaceId);
      else next.add(spaceId);
      return next;
    });
  };

  const bySpace: Record<number, Track[]> = {};
  const ungrouped: Track[] = [];
  for (const track of tracks) {
    if (track.space_id != null) {
      (bySpace[track.space_id] ??= []).push(track);
    } else {
      ungrouped.push(track);
    }
  }

  const renderTrack = (track: Track, indented = false) => (
    <div
      key={track.id}
      data-track-id={track.id}
      className={
        "nav-item nav-draggable" +
        (indented ? " nav-indented" : "") +
        (view.type === "track" && view.id === track.id ? " active" : "") +
        (draggingId === track.id ? " dragging" : "")
      }
      style={{ "--tc": track.color } as React.CSSProperties}
      onPointerDown={(e) => handleTrackPointerDown(e, track)}
    >
      <span className="nav-drag-handle">⠿</span>

      {renamingId === track.id ? (
        <input
          className="nav-rename"
          autoFocus
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") setRenamingId(null);
          }}
        />
      ) : (
        <span className="nav-label">{track.name}</span>
      )}

      <button
        className="nav-menu-btn"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          setMenuId(menuId === track.id ? null : track.id);
          setSpaceMenuId(null);
        }}
      >
        ⋯
      </button>

      {menuId === track.id && (
        <>
          <div className="menu-backdrop" onClick={(e) => { e.stopPropagation(); setMenuId(null); }} />
          <div className="track-menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
            <button onClick={() => startRename(track)}>{t("common.rename")}</button>
            <button
              className="menu-danger"
              onClick={() => { setMenuId(null); onRequestDelete(track); }}
            >
              {t("common.delete")}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderZoneTracks = (zoneTracks: Track[], zoneSpaceId: number | null, indented: boolean) => (
    <>
      {zoneTracks.map((tr) => (
        <Fragment key={tr.id}>
          {dropPos !== null && dropPos.spaceId === zoneSpaceId && dropPos.beforeTrackId === tr.id && (
            <div className="drop-line" />
          )}
          {renderTrack(tr, indented)}
        </Fragment>
      ))}
      {dropPos !== null && dropPos.spaceId === zoneSpaceId && dropPos.beforeTrackId === null && (
        <div className="drop-line" />
      )}
    </>
  );

  const isDragging = draggingId != null;

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="sidebar-brand">{t("app.brand")}</div>

        <div className="nav-views">
          <button
            className={"nav-view-item" + (view.type === "dashboard" ? " active" : "")}
            onClick={() => onSelect({ type: "dashboard" })}
          >
            <span className="nav-view-icon">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1.5"/>
                <rect x="9" y="1" width="6" height="6" rx="1.5"/>
                <rect x="1" y="9" width="6" height="6" rx="1.5"/>
                <rect x="9" y="9" width="6" height="6" rx="1.5"/>
              </svg>
            </span>
            <span className="nav-view-text">{t("nav.dashboard")}</span>
          </button>
          <button
            className={"nav-view-item" + (view.type === "daily" ? " active" : "")}
            onClick={() => onSelect({ type: "daily" })}
          >
            <span className="nav-view-icon">
              <svg width="20" height="20" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="3" width="12" height="11" rx="1.5"/>
                <path d="M5 1v4M11 1v4M2 7h12"/>
              </svg>
            </span>
            <span className="nav-view-text">{t("nav.daily")}</span>
          </button>
        </div>
      </div>

      <div className="sidebar-body">
        <div className="nav-views-divider">
          <svg className="nav-divider-gem" width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path
              d="M 6 0 A 10 10 0 0 0 12 6 A 10 10 0 0 0 6 12 A 10 10 0 0 0 0 6 A 10 10 0 0 0 6 0 Z"
              fill="var(--panel)"
              stroke="var(--border)"
              strokeWidth="1"
            />
          </svg>
        </div>

      {spaces.map((space) => {
        const isCollapsed = collapsed.has(space.id);
        const spaceTracks = bySpace[space.id] ?? [];
        const isDropOver = dropPos !== null && dropPos.spaceId === space.id;

        return (
          <div
            key={space.id}
            data-space-id={space.id}
            className={"sidebar-space" + (isDropOver ? " drop-over" : "")}
          >
            <div
              className="sidebar-space-header"
              onClick={() => toggleCollapse(space.id)}
            >
              <span className={`sidebar-space-arrow${isCollapsed ? " collapsed" : ""}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <polyline points="2,3 5,7 8,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="sidebar-space-name">{space.name}</span>
              <button
                className="nav-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setSpaceMenuId(spaceMenuId === space.id ? null : space.id);
                  setMenuId(null);
                }}
              >
                ⋯
              </button>
              {spaceMenuId === space.id && (
                <>
                  <div className="menu-backdrop" onClick={(e) => { e.stopPropagation(); setSpaceMenuId(null); }} />
                  <div className="track-menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={() => { setSpaceMenuId(null); onAddTrackInSpace(space.id); }}>
                      New track
                    </button>
                    <button onClick={() => { setSpaceMenuId(null); onEditSpace(space); }}>Edit</button>
                    <button
                      className="menu-danger"
                      onClick={() => { setSpaceMenuId(null); onDeleteSpace(space); }}
                    >
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
            {!isCollapsed && (
              <div className="sidebar-space-tracks">
                {renderZoneTracks(spaceTracks, space.id, true)}
              </div>
            )}
          </div>
        );
      })}

      {(ungrouped.length > 0 || isDragging) && (
        <div
          data-ungrouped="true"
          className={"sidebar-space sidebar-ungrouped-zone" + (dropPos !== null && dropPos.spaceId === null ? " drop-over" : "")}
        >
          {spaces.length > 0 && (
            <div
              className="sidebar-space-header"
              onClick={() => setUngroupedCollapsed((v) => !v)}
            >
              <span className={`sidebar-space-arrow${ungroupedCollapsed ? " collapsed" : ""}`}>
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <polyline points="2,3 5,7 8,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <span className="sidebar-space-name">{t("nav.ungrouped")}</span>
              <button
                className="nav-menu-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setUngroupedMenuOpen((v) => !v);
                  setSpaceMenuId(null);
                  setMenuId(null);
                }}
              >
                ⋯
              </button>
              {ungroupedMenuOpen && (
                <>
                  <div className="menu-backdrop" onClick={(e) => { e.stopPropagation(); setUngroupedMenuOpen(false); }} />
                  <div className="track-menu" onClick={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()}>
                    <button onClick={() => { setUngroupedMenuOpen(false); onAdd(); }}>
                      New track
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
          {!ungroupedCollapsed && (
            <div className="sidebar-space-tracks">
              {renderZoneTracks(ungrouped, null, spaces.length > 0)}
            </div>
          )}
        </div>
      )}

      {tracks.length === 0 && spaces.length === 0 && (
        <div className="sidebar-empty">{t("nav.empty")}</div>
      )}

      <div className="sidebar-actions">
        <button className="btn-add" onClick={onAddSpace}>
          {t("nav.addSpace")}
        </button>
        <button className="btn-add" onClick={onAdd}>
          {t("nav.add")}
        </button>
      </div>
      </div>

    </aside>
  );
}
