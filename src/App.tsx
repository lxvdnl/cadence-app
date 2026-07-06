import { useEffect, useState } from "react";
import type { Space, Track, TrackInput, TrackSeed, View } from "./types";
import {
  createSpace,
  createTrack,
  deleteSpace,
  deleteTrack,
  listSpaces,
  listTracks,
  renameTrack,
  reorderTracks,
  seedRoadmap,
  seedCycleItems,
  seedSimpleItems,
  setTrackSpace,
  updateSpace,
} from "./db";
import { Sidebar } from "./components/Sidebar";
import { AddTrackModal } from "./components/AddTrackModal";
import { AddSpaceModal } from "./components/AddSpaceModal";
import { SpaceEditModal } from "./components/SpaceEditModal";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { TrackView } from "./views/TrackView";
import { Dashboard } from "./views/Dashboard";
import { DailyView } from "./views/DailyView";
import { TopicDetail } from "./views/TopicDetail";
import { t } from "./i18n";
import "./App.css";

function App() {
  const [tracks, setTracks] = useState<Track[]>([]);
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [viewStack, setViewStack] = useState<View[]>([{ type: "dashboard" }]);
  const [adding, setAdding] = useState(false);
  const [addingDefaultSpace, setAddingDefaultSpace] = useState<number | null>(null);
  const [addingSpace, setAddingSpace] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Track | null>(null);
  const [pendingDeleteSpace, setPendingDeleteSpace] = useState<Space | null>(null);
  const [editingSpace, setEditingSpace] = useState<Space | null>(null);
  const [ready, setReady] = useState(false);

  const view = viewStack[viewStack.length - 1];
  const canGoBack = viewStack.length > 1;

  const navigate = (newView: View) =>
    setViewStack((prev) => [...prev, newView]);

  const goBack = () =>
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));

  const resetTo = (newView: View) => setViewStack([newView]);

  const refresh = async () => {
    const [tr, sp] = await Promise.all([listTracks(), listSpaces()]);
    setTracks(tr);
    setSpaces(sp);
  };

  useEffect(() => {
    refresh()
      .catch((e) => console.error(e))
      .finally(() => setReady(true));
  }, []);

  const handleCreate = async (input: TrackInput, seed?: TrackSeed) => {
    const id = await createTrack(input);
    if (seed?.sprints?.length) await seedRoadmap(id, seed.sprints);
    if (seed?.cycleItems?.length) await seedCycleItems(id, seed.cycleItems);
    if (seed?.simpleItems?.length) await seedSimpleItems(id, seed.simpleItems);
    setAdding(false);
    await refresh();
    resetTo({ type: "track", id });
  };

  const handleRename = async (id: number, name: string) => {
    await renameTrack(id, name);
    await refresh();
  };

  const handleDelete = async (id: number) => {
    await deleteTrack(id);
    setPendingDelete(null);
    await refresh();
    if (view.type === "track" && view.id === id) resetTo({ type: "dashboard" });
  };

  const handleCreateSpace = async (name: string, goal?: string) => {
    await createSpace(name, goal);
    setAddingSpace(false);
    await refresh();
  };

  const handleEditSpace = async (name: string, goal: string | null) => {
    if (!editingSpace) return;
    await updateSpace(editingSpace.id, { name, goal });
    setEditingSpace(null);
    await refresh();
  };

  const handleDeleteSpace = async (id: number) => {
    await deleteSpace(id);
    setPendingDeleteSpace(null);
    await refresh();
  };

  const handleMoveTrack = async (
    trackId: number,
    spaceId: number | null,
    beforeTrackId: number | null = null
  ) => {
    const targetTracks = tracks
      .filter((t) => t.space_id === spaceId && t.id !== trackId)
      .sort((a, b) => a.sort - b.sort || a.id - b.id);
    const rawIdx = beforeTrackId === null ? -1 : targetTracks.findIndex((t) => t.id === beforeTrackId);
    const pos = rawIdx === -1 ? targetTracks.length : rawIdx;
    const newIds = targetTracks.map((t) => t.id);
    newIds.splice(pos, 0, trackId);
    await setTrackSpace(trackId, spaceId);
    await reorderTracks(newIds);
    await refresh();
  };

  const activeTrack =
    view.type === "track" ? tracks.find((t) => t.id === view.id) : undefined;

  return (
    <div className="app">
      <Sidebar
        tracks={tracks}
        spaces={spaces}
        view={view}
        onSelect={resetTo}
        onAdd={() => { setAddingDefaultSpace(null); setAdding(true); }}
        onAddTrackInSpace={(spaceId) => { setAddingDefaultSpace(spaceId); setAdding(true); }}
        onAddSpace={() => setAddingSpace(true)}
        onRequestDelete={setPendingDelete}
        onRename={handleRename}
        onDeleteSpace={setPendingDeleteSpace}
        onEditSpace={setEditingSpace}
        onMoveTrack={handleMoveTrack}
      />

      <main className="main">
        {canGoBack && (
          <button className="back-btn" onClick={goBack}>
            ← Back
          </button>
        )}
        {!ready ? (
          <div className="placeholder">{t("common.loading")}</div>
        ) : view.type === "dashboard" ? (
          <Dashboard
            tracks={tracks}
            spaces={spaces}
            onOpen={(id) => navigate({ type: "track", id })}
          />
        ) : view.type === "daily" ? (
          <DailyView
            tracks={tracks}
            onOpenTopic={(topicId, trackId) => navigate({ type: "topic", topicId, trackId })}
            onOpenTrack={(id) => navigate({ type: "track", id })}
          />
        ) : view.type === "topic" ? (
          (() => {
            const tr = tracks.find((t) => t.id === view.trackId);
            return (
              <TopicDetail
                topicId={view.topicId}
                trackId={view.trackId}
                trackName={tr?.name ?? ""}
                onChanged={refresh}
                onDelete={async () => { await refresh(); goBack(); }}
              />
            );
          })()
        ) : activeTrack ? (
          <TrackView
            track={activeTrack}
            onOpenTopic={(topicId) => navigate({ type: "topic", topicId, trackId: activeTrack.id })}
          />
        ) : (
          <div className="placeholder">{t("track.notFound")}</div>
        )}
      </main>

      {adding && (
        <AddTrackModal
          spaces={spaces}
          defaultSpaceId={addingDefaultSpace}
          onClose={() => { setAdding(false); setAddingDefaultSpace(null); }}
          onCreate={handleCreate}
        />
      )}

      {addingSpace && (
        <AddSpaceModal
          onClose={() => setAddingSpace(false)}
          onCreate={handleCreateSpace}
        />
      )}

      {pendingDelete && (
        <ConfirmDialog
          title={t("confirm.delete.title")}
          body={t("confirm.delete.body", { name: pendingDelete.name })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={() => handleDelete(pendingDelete.id)}
          onCancel={() => setPendingDelete(null)}
        />
      )}

      {editingSpace && (
        <SpaceEditModal
          space={editingSpace}
          onClose={() => setEditingSpace(null)}
          onSave={handleEditSpace}
        />
      )}

      {pendingDeleteSpace && (
        <ConfirmDialog
          title={t("space.deleteTitle")}
          body={t("space.deleteBody", { name: pendingDeleteSpace.name })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={() => handleDeleteSpace(pendingDeleteSpace.id)}
          onCancel={() => setPendingDeleteSpace(null)}
        />
      )}
    </div>
  );
}

export default App;
