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
}: Props) {
  const [menuId, setMenuId] = useState<number | null>(null);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [spaceMenuId, setSpaceMenuId] = useState<number | null>(null);
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
      onPointerDown={(e) => handleTrackPointerDown(e, track)}
    >
      <span className="nav-drag-handle">⠿</span>
      <span className="nav-dot" style={{ background: track.color }} />

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
          <div className="track-menu" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => startRename(track)}>{t("menu.rename")}</button>
            {spaces.length > 0 && (
              <>
                <div className="menu-separator" />
                <div className="menu-section-label">{t("space.moveTo")}</div>
                <button
                  className={track.space_id === null ? "menu-check" : ""}
                  onClick={() => { setMenuId(null); onMoveTrack(track.id, null, null); }}
                >
                  {t("space.none")}
                </button>
                {spaces.map((s) => (
                  <button
                    key={s.id}
                    className={track.space_id === s.id ? "menu-check" : ""}
                    onClick={() => { setMenuId(null); onMoveTrack(track.id, s.id, null); }}
                  >
                    {s.name}
                  </button>
                ))}
                <div className="menu-separator" />
              </>
            )}
            <button
              className="menu-danger"
              onClick={() => { setMenuId(null); onRequestDelete(track); }}
            >
              {t("menu.delete")}
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
      <div className="sidebar-brand">{t("app.brand")}</div>

      <div className="nav-views">
        <button
          className={"nav-view-item" + (view.type === "dashboard" ? " active" : "")}
          onClick={() => onSelect({ type: "dashboard" })}
        >
          {t("nav.dashboard")}
        </button>
        <button
          className={"nav-view-item" + (view.type === "daily" ? " active" : "")}
          onClick={() => onSelect({ type: "daily" })}
        >
          {t("nav.daily")}
        </button>
      </div>

      <div className="nav-views-divider" />

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
              <span className="sidebar-space-arrow">{isCollapsed ? "▶" : "▼"}</span>
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
                  <div className="track-menu" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => { setSpaceMenuId(null); onEditSpace(space); }}>{t("space.edit")}</button>
                    <button
                      className="menu-danger"
                      onClick={() => { setSpaceMenuId(null); onDeleteSpace(space); }}
                    >
                      {t("space.delete")}
                    </button>
                  </div>
                </>
              )}
            </div>
            {!isCollapsed && (
              <div className="sidebar-space-tracks">
                {renderZoneTracks(spaceTracks, space.id, true)}
                {spaceTracks.length === 0 && dropPos?.spaceId !== space.id && (
                  <div className="sidebar-empty sidebar-empty-indent">{t("nav.empty")}</div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {(ungrouped.length > 0 || isDragging) && (
        <div
          data-ungrouped="true"
          className={"sidebar-ungrouped-zone" + (dropPos !== null && dropPos.spaceId === null ? " drop-over" : "")}
        >
          {spaces.length > 0 && (
            <div
              className="sidebar-space-header"
              onClick={() => setUngroupedCollapsed((v) => !v)}
            >
              <span className="sidebar-space-arrow">{ungroupedCollapsed ? "▶" : "▼"}</span>
              <span className="sidebar-space-name">{t("nav.ungrouped")}</span>
            </div>
          )}
          {!ungroupedCollapsed && renderZoneTracks(ungrouped, null, spaces.length > 0)}
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
    </aside>
  );
}
