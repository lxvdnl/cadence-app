import { useEffect, useRef, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [markdownDraft, setMarkdownDraft] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [markdownDraft, editMode]);

  useEffect(() => {
    let alive = true;
    getTopic(topicId).then((tp) => {
      if (alive && tp) {
        setTopic(tp);
        setMarkdownDraft(tp.markdown);
      }
    });
    return () => { alive = false; };
  }, [topicId]);

  const setStatus = async (status: TopicStatus) => {
    if (!topic) return;
    await updateTopic(topicId, { status });
    setTopic({ ...topic, status });
    onChanged();
  };

  const handleSave = async (title: string, estDays: number) => {
    if (!topic) return;
    const fields: Partial<Pick<Topic, "title" | "est_hours">> = {};
    if (title !== topic.title) fields.title = title;
    if (estDays !== topic.est_hours) fields.est_hours = estDays;
    if (Object.keys(fields).length > 0) {
      await updateTopic(topicId, fields);
      setTopic({ ...topic, ...fields });
      if (fields.title) onChanged();
    }
    setSettingsOpen(false);
  };

  const switchToPreview = async () => {
    if (!topic) return;
    if (markdownDraft !== topic.markdown) {
      await updateTopic(topicId, { markdown: markdownDraft });
      setTopic({ ...topic, markdown: markdownDraft });
    }
    setEditMode(false);
  };

  if (!topic) return <div className="placeholder">{t("common.loading")}</div>;

  const isDone = topic.status === "done";

  return (
    <div className={`topic-detail${isDone ? " done" : ""}`}>
      <div className="topic-header-block">
        <span className="topic-track-label">{trackName}</span>
        <div className="topic-title-row">
          <h1 className="topic-detail-title">{topic.title}</h1>
          {topic.est_hours > 0 && (
            <span className="topic-est-days">{topic.est_hours}d</span>
          )}
          <div className="topic-title-spacer" />
          <div className="topic-menu-wrap">
            <button
              className="sprint-menu-btn"
              onClick={() => setMenuOpen((v) => !v)}
            >
              ⋯
            </button>
            {menuOpen && (
              <>
                <div className="menu-backdrop" onClick={() => setMenuOpen(false)} />
                <div className="sprint-menu" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => { setMenuOpen(false); setSettingsOpen(true); }}>
                    Edit
                  </button>
                  <div className="menu-separator" />
                  <button
                    className="menu-danger"
                    onClick={() => { setMenuOpen(false); setDeleteConfirm(true); }}
                  >
                    {t("common.delete")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="status-row">
        {STATUSES.map((s) => (
          <button
            key={s}
            className={`status-btn status-btn--${s}${topic.status === s ? " active" : ""}`}
            onClick={() => setStatus(s)}
          >
            {t(`topic.status.${s}`)}
          </button>
        ))}
      </div>

      <div className="md-area">
        <div className="md-area-bar">
          <div className="md-toggle">
            <button
              className={`md-toggle-btn${!editMode ? " active" : ""}`}
              onClick={switchToPreview}
            >
              Preview
            </button>
            <button
              className={`md-toggle-btn${editMode ? " active" : ""}`}
              onClick={() => setEditMode(true)}
            >
              Edit
            </button>
          </div>
        </div>

        {editMode ? (
          <textarea
            ref={textareaRef}
            className="topic-notes-editor"
            value={markdownDraft}
            onChange={(e) => setMarkdownDraft(e.target.value)}
            placeholder={t("topic.notesPlaceholder")}
          />
        ) : (
          <div className="md-preview markdown topic-preview">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {topic.markdown || "_No notes yet_"}
            </ReactMarkdown>
          </div>
        )}
      </div>


      {settingsOpen && (
        <TopicSettingsModal
          topic={topic}
          onClose={() => setSettingsOpen(false)}
          onSave={handleSave}
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
