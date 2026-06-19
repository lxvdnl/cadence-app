import { useEffect, useState } from "react";
import type { Sprint, Topic, TopicStatus, Track } from "../types";
import {
  createSprint,
  createTopic,
  deleteSprint,
  listSprints,
  listTopics,
  renameSprint,
  setSprintDescription,
  updateTopic,
} from "../db";
import { ConfirmDialog } from "../components/ConfirmDialog";
import {
  BulkAddSprintsModal,
  type BulkSprint,
} from "../components/BulkAddSprintsModal";
import {
  BulkAddTopicsModal,
  type BulkTopic,
} from "../components/BulkAddTopicsModal";
import { SprintSettingsModal } from "../components/SprintDescriptionModal";
import { AddTopicModal } from "../components/AddTopicModal";
import { t } from "../i18n";

interface Props {
  track: Track;
  onOpenTopic: (topicId: number) => void;
}

export function RoadmapModule({ track, onOpenTopic }: Props) {
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [topics, setTopics] = useState<Record<number, Topic[]>>({});

  const [addingSprint, setAddingSprint] = useState(false);
  const [sprintDraft, setSprintDraft] = useState("");
  const [addTopicSprint, setAddTopicSprint] = useState<number | null>(null);
  const [bulkTopicSprint, setBulkTopicSprint] = useState<number | null>(null);
  const [editSprint, setEditSprint] = useState<Sprint | null>(null);
  const [deleteSprint_, setDeleteSprint] = useState<{ id: number; name: string } | null>(null);
  const [bulkOpen, setBulkOpen] = useState(false);

  const loadTopics = async (sprintList: Sprint[]) => {
    const map: Record<number, Topic[]> = {};
    for (const s of sprintList) {
      map[s.id] = await listTopics(s.id);
    }
    setTopics(map);
  };

  const refresh = async () => {
    const list = await listSprints(track.id);
    setSprints(list);
    await loadTopics(list);
  };

  useEffect(() => {
    refresh();
  }, [track.id]);

  const refreshSprintTopics = async (sprintId: number) => {
    const list = await listTopics(sprintId);
    setTopics((prev) => ({ ...prev, [sprintId]: list }));
  };

  const addSprint = async () => {
    const v = sprintDraft.trim();
    if (!v) return;
    await createSprint(track.id, v);
    setSprintDraft("");
    setAddingSprint(false);
    await refresh();
  };

  const addBulkSprints = async (items: BulkSprint[]) => {
    for (const item of items) {
      await createSprint(track.id, item.title, item.description);
    }
    setBulkOpen(false);
    await refresh();
  };

  const saveSprint = async (title: string, description: string) => {
    if (!editSprint) return;
    if (title !== editSprint.title) await renameSprint(editSprint.id, title);
    if (description !== (editSprint.description ?? ""))
      await setSprintDescription(editSprint.id, description);
    setEditSprint(null);
    await refresh();
  };

  const addTopic = async (title: string, estDays: number) => {
    if (addTopicSprint == null) return;
    await createTopic(addTopicSprint, title, estDays);
    const sprintId = addTopicSprint;
    setAddTopicSprint(null);
    await refreshSprintTopics(sprintId);
  };

  const addBulkTopics = async (bulkTopics: BulkTopic[]) => {
    if (bulkTopicSprint == null) return;
    const sprintId = bulkTopicSprint;
    for (const tp of bulkTopics) {
      await createTopic(sprintId, tp.title, tp.estDays);
    }
    setBulkTopicSprint(null);
    await refreshSprintTopics(sprintId);
  };

  const toggleTopicDone = async (topic: Topic, sprintId: number) => {
    const next: TopicStatus = topic.status === "done" ? "active" : "done";
    await updateTopic(topic.id, { status: next });
    await refreshSprintTopics(sprintId);
  };

  return (
    <div className="roadmap">
      {sprints.length === 0 && !addingSprint && (
        <div className="placeholder">{t("roadmap.empty")}</div>
      )}

      {sprints.map((sprint) => {
        const list = topics[sprint.id] ?? [];
        const total = list.length;
        const done = list.filter((x) => x.status === "done").length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return (
          <div
            key={sprint.id}
            className="sprint-card"
            onClick={() => setEditSprint(sprint)}
          >
            <div className="sprint-head">
              <h3 className="sprint-title">{sprint.title}</h3>
              <span className="sprint-progress">{done}/{total}</span>
            </div>

            {sprint.description && (
              <p className="sprint-desc">{sprint.description}</p>
            )}

            <div className="bar">
              <div className="bar-fill" style={{ width: `${pct}%` }} />
            </div>

            <ul className="topic-list">
              {list.map((topic) => (
                <li
                  key={topic.id}
                  className="topic-row"
                  onClick={(e) => { e.stopPropagation(); onOpenTopic(topic.id); }}
                >
                  <span
                    className="topic-check-wrap"
                    onClick={(e) => { e.stopPropagation(); toggleTopicDone(topic, sprint.id); }}
                  >
                    <input
                      type="checkbox"
                      className="topic-check"
                      checked={topic.status === "done"}
                      onChange={() => {}}
                    />
                  </span>
                  <span className={"status-pill " + topic.status}>
                    {t(`topic.status.${topic.status}`)}
                  </span>
                  <span className="topic-name">{topic.title}</span>
                </li>
              ))}
              {list.length === 0 && (
                <li className="topic-empty">{t("roadmap.noTopics")}</li>
              )}
            </ul>

            <div className="sprint-add-topic">
              <button
                className="btn-add"
                onClick={(e) => { e.stopPropagation(); setAddTopicSprint(sprint.id); }}
              >
                {t("roadmap.addTopic")}
              </button>
              <button
                className="btn-add"
                onClick={(e) => { e.stopPropagation(); setBulkTopicSprint(sprint.id); }}
              >
                {t("roadmap.addManyTopics")}
              </button>
            </div>
          </div>
        );
      })}

      {addingSprint ? (
        <div className="add-row add-sprint">
          <input
            autoFocus
            value={sprintDraft}
            onChange={(e) => setSprintDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") addSprint();
              if (e.key === "Escape") { setAddingSprint(false); setSprintDraft(""); }
            }}
            placeholder={t("roadmap.sprintPlaceholder")}
          />
          <button className="btn-primary" onClick={addSprint} disabled={!sprintDraft.trim()}>
            {t("roadmap.add")}
          </button>
        </div>
      ) : (
        <div className="sprint-add-row">
          <button className="btn-add" onClick={() => setAddingSprint(true)}>
            {t("roadmap.addSprint")}
          </button>
          <button className="btn-add" onClick={() => setBulkOpen(true)}>
            {t("roadmap.addMany")}
          </button>
        </div>
      )}

      {bulkOpen && (
        <BulkAddSprintsModal
          onClose={() => setBulkOpen(false)}
          onSubmit={addBulkSprints}
        />
      )}

      {addTopicSprint != null && (
        <AddTopicModal
          onClose={() => setAddTopicSprint(null)}
          onCreate={addTopic}
        />
      )}

      {bulkTopicSprint != null && (
        <BulkAddTopicsModal
          onClose={() => setBulkTopicSprint(null)}
          onSubmit={addBulkTopics}
        />
      )}

      {editSprint && (
        <SprintSettingsModal
          sprint={editSprint}
          onClose={() => setEditSprint(null)}
          onSave={saveSprint}
          onDelete={() => {
            setEditSprint(null);
            setDeleteSprint({ id: editSprint.id, name: editSprint.title });
          }}
        />
      )}

      {deleteSprint_ && (
        <ConfirmDialog
          title={t("confirm.deleteSprint.title")}
          body={t("confirm.deleteSprint.body", { name: deleteSprint_.name })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={async () => {
            await deleteSprint(deleteSprint_.id);
            setDeleteSprint(null);
            await refresh();
          }}
          onCancel={() => setDeleteSprint(null)}
        />
      )}
    </div>
  );
}
