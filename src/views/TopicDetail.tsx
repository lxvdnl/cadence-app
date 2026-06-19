import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import type { Topic, TopicStatus } from "../types";
import { deleteTopic, getTopic, updateTopic } from "../db";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { TopicSettingsModal } from "../components/TopicSettingsModal";
import { t } from "../i18n";

const STATUSES: TopicStatus[] = ["backlog", "active", "done"];

interface Props {
  topicId: number;
  trackId: number;
  trackName: string;
  onChanged: () => void;
  onDelete: () => Promise<void>;
}

export function TopicDetail({ topicId, trackName, onChanged, onDelete }: Props) {
  const [topic, setTopic] = useState<Topic | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    let alive = true;
    getTopic(topicId).then((tp) => {
      if (alive && tp) setTopic(tp);
    });
    return () => { alive = false; };
  }, [topicId]);

  const setStatus = async (status: TopicStatus) => {
    if (!topic) return;
    await updateTopic(topicId, { status });
    setTopic({ ...topic, status });
    onChanged();
  };

  const handleSave = async (title: string, estDays: number, markdown: string) => {
    if (!topic) return;
    const fields: Partial<Pick<Topic, "title" | "est_hours" | "markdown">> = {};
    if (title !== topic.title) fields.title = title;
    if (estDays !== topic.est_hours) fields.est_hours = estDays;
    if (markdown !== topic.markdown) fields.markdown = markdown;
    if (Object.keys(fields).length > 0) {
      await updateTopic(topicId, fields);
      setTopic({ ...topic, ...fields });
      if (fields.title) onChanged();
    }
    setSettingsOpen(false);
  };

  if (!topic) return <div className="placeholder">{t("common.loading")}</div>;

  return (
    <div className="topic-detail">
      <div className="topic-breadcrumb">
        <span className="breadcrumb-track">{trackName}</span>
        <span className="breadcrumb-sep">/</span>
        <span className="breadcrumb-current">{topic.title}</span>
        <div className="breadcrumb-gap" />
        <button className="btn-icon-sm" onClick={() => setSettingsOpen(true)}>
          ⚙
        </button>
      </div>

      <div className="status-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={"status-btn" + (topic.status === s ? " active" : "")}
            onClick={() => setStatus(s)}
          >
            {t(`topic.status.${s}`)}
          </button>
        ))}
        {topic.est_hours > 0 && (
          <span className="topic-est-days">{topic.est_hours}d</span>
        )}
      </div>

      <div className="md-preview markdown topic-preview">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {topic.markdown || "_No notes yet — open ⚙ to add_"}
        </ReactMarkdown>
      </div>

      {settingsOpen && (
        <TopicSettingsModal
          topic={topic}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSave}
          onDelete={() => {
            setSettingsOpen(false);
            setDeleteConfirm(true);
          }}
        />
      )}

      {deleteConfirm && (
        <ConfirmDialog
          title={t("confirm.deleteTopic.title")}
          body={t("confirm.deleteTopic.body", { name: topic.title })}
          confirmLabel={t("common.delete")}
          cancelLabel={t("common.cancel")}
          danger
          onConfirm={async () => {
            await deleteTopic(topicId);
            await onDelete();
          }}
          onCancel={() => setDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
