import {
  Archive,
  ArrowLeft,
  BellOff,
  CheckCheck,
  FileImage,
  FileVideo,
  Link2,
  Mic,
  MoreHorizontal,
  Paperclip,
  Phone,
  Pin,
  PinOff,
  Plus,
  Search,
  SendHorizontal,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Users,
  Video,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatTime } from "../utils/format";

const MESSAGE_FILTERS = [
  "All",
  "Unread",
  "Requests",
  "Groups",
  "Pinned",
  "Archived",
  "Muted",
];

const MESSAGE_FOLDERS = ["inbox", "priority", "work", "friends"];

const STICKER_PRESETS = [
  { emoji: "🔥", label: "Fire" },
  { emoji: "💙", label: "Blue heart" },
  { emoji: "✨", label: "Sparkles" },
  { emoji: "🫡", label: "Salute" },
  { emoji: "😈", label: "Rogue" },
];

const GIF_PRESETS = [
  {
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExZ3Nkc2Q4bmxhM2xtYjB3M21qMHFjNWg0YjV1ZnhiaG0wazg4dHh1aSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/l0MYt5jPR6QX5pnqM/giphy.gif",
    name: "Celebration",
  },
  {
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExczl1eTg4em10em91ZGlwNTRkYXc2aWtlNzFwdGdrcnh4Z2c1aXQxZSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/3o7TKTDn976rzVgky4/giphy.gif",
    name: "Typing mood",
  },
  {
    url: "https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExcTR3NW1xcWt5b3N6eWw0eTVpYTM3eXJpMmd2aWdtNmNkbnFiZWxkcSZlcD12MV9naWZzX3NlYXJjaCZjdD1n/26ufdipQqU2lhNA4g/giphy.gif",
    name: "Approved",
  },
];

const DISPLAY_STICKER_PRESETS = STICKER_PRESETS.map((preset, index) => ({
  ...preset,
  emoji:
    [
      "\uD83D\uDD25",
      "\uD83D\uDC99",
      "\u2728",
      "\uD83E\uDEE1",
      "\uD83D\uDE08",
    ][index] ?? preset.emoji,
}));

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function filesToAttachments(fileList, forcedType = "") {
  const files = Array.from(fileList ?? []).slice(0, 4);
  const attachments = [];
  for (const file of files) {
    const result = await readFileAsDataUrl(file);
    if (typeof result !== "string") continue;
    const type = forcedType || inferAttachmentType(file);
    attachments.push({
      type,
      url: result,
      name: file.name,
      size: file.size,
      voiceNote: forcedType === "audio",
    });
  }
  return attachments;
}

function inferAttachmentType(file) {
  const mime = file?.type ?? "";
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  return "file";
}

function formatAbsoluteTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-AU", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getLinkPreviews(text) {
  const matches = `${text ?? ""}`.match(/https?:\/\/[^\s]+/g) ?? [];
  return matches.slice(0, 2).map((url) => {
    try {
      const parsed = new URL(url);
      const cleanPath = parsed.pathname === "/" ? "" : parsed.pathname;
      return {
        url,
        host: parsed.hostname.replace(/^www\./, ""),
        title: cleanPath ? `${parsed.hostname}${cleanPath}` : parsed.hostname,
      };
    } catch {
      return {
        url,
        host: "Link",
        title: url,
      };
    }
  });
}

function getDirectPartner(thread, currentUserId) {
  if (!thread || thread.isGroup) return null;
  return (
    thread.participants?.find((participant) => participant.id !== currentUserId) ??
    null
  );
}

function ThreadAvatar({ thread }) {
  const avatars = thread.isGroup
    ? thread.participants?.filter((participant) => participant.avatar).slice(0, 3) ?? []
    : thread.avatar
      ? [{ avatar: thread.avatar }]
      : [];

  if (thread.isGroup) {
    return (
      <div className="message-avatar-stack" aria-hidden="true">
        {avatars.length > 0 ? (
          avatars.map((participant, index) => (
            <span
              key={`${participant.avatar}-${index}`}
              className="message-avatar message-avatar-collage"
              style={{ zIndex: avatars.length - index }}
            >
              <img src={participant.avatar} alt="" />
            </span>
          ))
        ) : (
          <span className="message-avatar message-avatar-fallback">
            <Users aria-hidden="true" />
          </span>
        )}
      </div>
    );
  }

  return (
    <span className="message-avatar">
      {avatars[0]?.avatar ? <img src={avatars[0].avatar} alt="" /> : null}
    </span>
  );
}

function AttachmentPreview({ attachment, onRemove }) {
  return (
    <div className={`message-attachment-pill attachment-${attachment.type}`}>
      <div>
        <strong>{attachment.name || attachment.type}</strong>
        <span>{attachment.voiceNote ? "Voice note" : attachment.type}</span>
      </div>
      <button type="button" onClick={onRemove} aria-label="Remove attachment">
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

function MessageAttachment({ attachment }) {
  if (attachment.type === "image" || attachment.type === "gif") {
    return (
      <a
        className="message-media-card"
        href={attachment.url}
        target="_blank"
        rel="noreferrer"
      >
        <img src={attachment.url} alt={attachment.name || "Shared media"} />
      </a>
    );
  }

  if (attachment.type === "video") {
    return (
      <div className="message-media-card">
        <video src={attachment.url} controls preload="metadata" />
      </div>
    );
  }

  if (attachment.type === "audio") {
    return (
      <div className="message-file-card">
        <div className="message-file-copy">
          <Mic aria-hidden="true" />
          <div>
            <strong>{attachment.name || "Voice note"}</strong>
            <span>{attachment.voiceNote ? "Audio note" : "Audio file"}</span>
          </div>
        </div>
        <audio controls src={attachment.url} preload="metadata" />
      </div>
    );
  }

  if (attachment.type === "sticker") {
    return (
      <div className="message-sticker-card" aria-label={attachment.name || "Sticker"}>
        <span>{attachment.emoji || "✨"}</span>
      </div>
    );
  }

  return (
    <a
      className="message-file-card"
      href={attachment.url}
      target="_blank"
      rel="noreferrer"
    >
      <div className="message-file-copy">
        <Paperclip aria-hidden="true" />
        <div>
          <strong>{attachment.name || "File"}</strong>
          <span>Open attachment</span>
        </div>
      </div>
    </a>
  );
}

function MessageComposerModal({
  open,
  users,
  currentUserId,
  blocked,
  onClose,
  onCreate,
}) {
  const [mode, setMode] = useState("direct");
  const [title, setTitle] = useState("");
  const [selected, setSelected] = useState([]);
  const [query, setQuery] = useState("");

  const candidates = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return users.filter((user) => {
      if (user.id === currentUserId) return false;
      if (blocked.has(user.id)) return false;
      if (!lowered) return true;
      return (
        user.name.toLowerCase().includes(lowered) ||
        user.handle.toLowerCase().includes(lowered)
      );
    });
  }, [blocked, currentUserId, query, users]);

  if (!open) return null;

  function resetModalState() {
    setMode("direct");
    setTitle("");
    setSelected([]);
    setQuery("");
  }

  function handleClose() {
    resetModalState();
    onClose();
  }

  function toggleUser(userId) {
    setSelected((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  async function handleCreate(event) {
    event.preventDefault();
    if (mode === "direct") {
      if (!selected[0]) return;
      await onCreate({ userId: selected[0] });
      return;
    }
    if (selected.length === 0) return;
    await onCreate({ memberIds: selected, title });
  }

  return (
    <div className="message-modal-backdrop" onClick={handleClose}>
      <div
        className="message-modal glass"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="message-modal-header">
          <div>
            <h3>New conversation</h3>
            <p>Start a direct message or build a group chat.</p>
          </div>
          <button type="button" className="icon-button" onClick={handleClose}>
            <X aria-hidden="true" />
          </button>
        </div>

        <div className="message-modal-switch">
          <button
            type="button"
            className={mode === "direct" ? "tab active" : "tab"}
            onClick={() => {
              setMode("direct");
              setSelected((prev) => prev.slice(0, 1));
            }}
          >
            Direct
          </button>
          <button
            type="button"
            className={mode === "group" ? "tab active" : "tab"}
            onClick={() => setMode("group")}
          >
            Group
          </button>
        </div>

        <form className="message-modal-form" onSubmit={handleCreate}>
          {mode === "group" ? (
            <label className="field">
              Group name
              <input
                type="text"
                placeholder="Design room"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
          ) : null}

          <label className="message-search compact">
            <Search aria-hidden="true" />
            <input
              type="text"
              placeholder="Search people"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>

          <div className="message-modal-users">
            {candidates.map((user) => {
              const active = selected.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  className={active ? "message-member-card active" : "message-member-card"}
                  onClick={() => {
                    if (mode === "direct") {
                      setSelected([user.id]);
                    } else {
                      toggleUser(user.id);
                    }
                  }}
                >
                  <span className={user.isOwner ? "avatar small owner-avatar" : "avatar small"}>
                    {user.avatar ? <img src={user.avatar} alt={user.name} /> : null}
                  </span>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.handle}</span>
                  </div>
                </button>
              );
            })}
          </div>

          <button className="primary" type="submit">
            {mode === "direct" ? "Start chat" : "Create group"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Messages({
  currentUser,
  users,
  threads,
  activeThreadId,
  activeCall,
  searchResults,
  searchStatus,
  blocked,
  onSearch,
  onSelect,
  onSend,
  onStartCall,
  onCreateThread,
  onUpdateThread,
  onAcceptThread,
  onDeclineThread,
  onTyping,
  onUpdateMessage,
  onOpenProfile,
  onBlockUser,
  onReportUser,
}) {
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const [attachments, setAttachments] = useState([]);
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [isCompactLayout, setIsCompactLayout] = useState(false);
  const [showStageOnCompact, setShowStageOnCompact] = useState(false);
  const [messageMenuId, setMessageMenuId] = useState(null);
  const [threadMenuOpen, setThreadMenuOpen] = useState(false);
  const [showStickers, setShowStickers] = useState(false);
  const [showGifs, setShowGifs] = useState(false);
  const streamRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const threadMenuRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const audioInputRef = useRef(null);

  const activeThread = useMemo(
    () => threads.find((item) => item.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const directPartner = getDirectPartner(activeThread, currentUser?.id);
  const blockedPartner = directPartner ? blocked.has(directPartner.id) : false;
  const threadHasLiveCall =
    activeThread &&
    activeCall?.threadId === activeThread.id &&
    ["ringing", "active"].includes(activeCall.status);
  const canStartThreadCall =
    activeThread &&
    !activeThread.isGroup &&
    (!activeCall || activeCall.threadId === activeThread.id);
  const showSidebar = !isCompactLayout || !activeThreadId || !showStageOnCompact;
  const showStage = !isCompactLayout || (Boolean(activeThreadId) && showStageOnCompact);

  const pinnedMessages = useMemo(
    () => activeThread?.messages?.filter((message) => message.pinned) ?? [],
    [activeThread]
  );

  const filteredThreads = useMemo(() => {
    return threads.filter((thread) => {
      if (filter === "Unread" && !(thread.unreadCount > 0)) return false;
      if (filter === "Requests" && !thread.isRequest) return false;
      if (filter === "Groups" && !thread.isGroup) return false;
      if (filter === "Pinned" && !thread.pinned) return false;
      if (filter === "Archived" && !thread.archived) return false;
      if (filter === "Muted" && !thread.muted) return false;
      if (filter === "All" && thread.archived) return false;
      return true;
    });
  }, [filter, threads]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mediaQuery = window.matchMedia("(max-width: 900px)");
    const handleChange = () => setIsCompactLayout(mediaQuery.matches);
    handleChange();
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(search);
    }, 220);
    return () => clearTimeout(timer);
  }, [onSearch, search]);

  useEffect(() => {
    const resetTimer = setTimeout(() => {
      setDraft("");
      setAttachments([]);
      setShowStickers(false);
      setShowGifs(false);
      setMessageMenuId(null);
      setThreadMenuOpen(false);
    }, 0);
    return () => clearTimeout(resetTimer);
  }, [activeThreadId]);

  useEffect(() => {
    if (!streamRef.current) return;
    streamRef.current.scrollTop = streamRef.current.scrollHeight;
  }, [activeThreadId, activeThread?.messages?.length]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!threadMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!threadMenuRef.current?.contains(event.target)) {
        setThreadMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setThreadMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [threadMenuOpen]);

  function pulseTyping(nextValue) {
    setDraft(nextValue);
    if (!activeThreadId) return;
    onTyping(activeThreadId, true);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(activeThreadId, false);
    }, 1200);
  }

  async function handleFileAttach(fileList, forcedType = "") {
    const nextAttachments = await filesToAttachments(fileList, forcedType);
    setAttachments((prev) => [...prev, ...nextAttachments].slice(0, 4));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!activeThreadId) return;
    if (!draft.trim() && attachments.length === 0) return;
    await onSend(activeThreadId, {
      text: draft.trim(),
      attachments,
    });
    setDraft("");
    setAttachments([]);
    setShowStickers(false);
    setShowGifs(false);
    onTyping(activeThreadId, false);
  }

  function addSticker(sticker) {
    setAttachments((prev) => [
      ...prev,
      {
        type: "sticker",
        name: sticker.label,
        emoji: sticker.emoji,
      },
    ].slice(0, 4));
    setShowStickers(false);
  }

  function addGif(gif) {
    setAttachments((prev) => [
      ...prev,
      {
        type: "gif",
        url: gif.url,
        name: gif.name,
      },
    ].slice(0, 4));
    setShowGifs(false);
  }

  function handleSelectThread(threadId) {
    if (isCompactLayout) {
      setShowStageOnCompact(true);
    }
    onSelect(threadId);
  }

  const activeSearchThreads = search.trim() ? searchResults.threads ?? [] : [];
  const activeSearchMessages = search.trim() ? searchResults.messages ?? [] : [];
  const shellClassName =
    showStage && !showSidebar
      ? "page-section messages messages-shell stage-only"
      : "page-section messages messages-shell";

  return (
    <div className={shellClassName}>
      {showSidebar ? (
      <aside className="message-sidebar glass">
        <div className="message-sidebar-head">
          <div>
            <h3>Messages</h3>
            <span>DMs, requests, groups, media, and sync.</span>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={() => setCreatorOpen(true)}
            aria-label="New conversation"
          >
            <Plus aria-hidden="true" />
          </button>
        </div>

        <label className="message-search">
          <Search aria-hidden="true" />
          <input
            type="text"
            placeholder="Search conversations"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <div className="message-filter-row">
          {MESSAGE_FILTERS.map((label) => (
            <button
              key={label}
              type="button"
              className={filter === label ? "message-filter active" : "message-filter"}
              onClick={() => setFilter(label)}
            >
              {label}
            </button>
          ))}
        </div>

        {search.trim() ? (
          <div className="message-search-results">
            <div className="message-search-results-head">
              <strong>Search results</strong>
              <span>{searchStatus === "loading" ? "Searching..." : "Threads + messages"}</span>
            </div>
            {activeSearchThreads.map((thread) => (
              <button
                key={`thread-${thread.id}`}
                type="button"
                className="message-search-hit"
                onClick={() => handleSelectThread(thread.id)}
              >
                <strong>{thread.name}</strong>
                <span>{thread.preview || thread.handle}</span>
              </button>
            ))}
            {activeSearchMessages.map((message) => (
              <button
                key={`message-${message.id}`}
                type="button"
                className="message-search-hit"
                onClick={() => handleSelectThread(message.threadId)}
              >
                <strong>{message.threadName}</strong>
                <span>{message.text}</span>
              </button>
            ))}
            {searchStatus === "ready" &&
            activeSearchThreads.length === 0 &&
            activeSearchMessages.length === 0 ? (
              <span className="empty">No conversations matched.</span>
            ) : null}
          </div>
        ) : null}

        <div className="message-thread-list">
          {filteredThreads.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={
                activeThreadId === thread.id ? "message-thread-card active" : "message-thread-card"
              }
              onClick={() => handleSelectThread(thread.id)}
            >
              <ThreadAvatar thread={thread} />
              <div className="message-thread-copy">
                <div className="message-thread-topline">
                  <strong>{thread.name}</strong>
                  <span>{formatTime(thread.time)}</span>
                </div>
                <span className="message-thread-subline">
                  {thread.typingUsers?.length
                    ? `${thread.typingUsers[0].name} is typing...`
                    : thread.preview || thread.handle}
                </span>
                <div className="message-thread-tags">
                  {thread.isGroup ? <span>Group</span> : null}
                  {thread.isRequest ? <span>Request</span> : null}
                  {thread.pinned ? <span>Pinned</span> : null}
                  {thread.muted ? <span>Muted</span> : null}
                  {thread.unreadCount > 0 ? <span>{thread.unreadCount} unread</span> : null}
                </div>
              </div>
            </button>
          ))}
          {filteredThreads.length === 0 ? (
            <span className="empty">No conversations in this folder yet.</span>
          ) : null}
        </div>
      </aside>
      ) : null}
      {showStage ? (
      <section className="message-stage glass">
        {activeThread ? (
          <>
            <div className="message-stage-header">
              <div className="message-stage-identity">
                {isCompactLayout ? (
                  <button
                    type="button"
                    className="message-back-button icon-button"
                    onClick={() => setShowStageOnCompact(false)}
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft aria-hidden="true" />
                  </button>
                ) : null}
                <ThreadAvatar thread={activeThread} />
                <div className="message-stage-copy">
                  <div className="message-stage-title-row">
                    <strong>{activeThread.name}</strong>
                    <div className="message-stage-title-actions">
                      {!activeThread.isGroup ? (
                        <>
                          <button
                            type="button"
                            className={
                              threadHasLiveCall ? "message-call-icon live" : "message-call-icon"
                            }
                            onClick={() => onStartCall(activeThread.id, "audio")}
                            disabled={!canStartThreadCall}
                            aria-label={
                              threadHasLiveCall ? "Join voice call" : "Start voice call"
                            }
                            title={threadHasLiveCall ? "Voice live" : "Voice call"}
                          >
                            <Phone aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className={
                              threadHasLiveCall
                                ? "message-call-icon video live"
                                : "message-call-icon video"
                            }
                            onClick={() => onStartCall(activeThread.id, "video")}
                            disabled={!canStartThreadCall}
                            aria-label={
                              threadHasLiveCall ? "Join video call" : "Start video call"
                            }
                            title={threadHasLiveCall ? "Video live" : "Video call"}
                          >
                            <Video aria-hidden="true" />
                          </button>
                        </>
                      ) : null}

                      <div className="message-thread-menu-shell" ref={threadMenuRef}>
                        <button
                          type="button"
                          className="message-thread-menu-trigger"
                          aria-label="Open conversation options"
                          aria-expanded={threadMenuOpen}
                          onClick={() => setThreadMenuOpen((prev) => !prev)}
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </button>

                        {threadMenuOpen ? (
                          <div className="message-thread-menu-panel glass">
                            <label className="message-thread-menu-field">
                              <span className="message-thread-menu-label">Folder</span>
                              <select
                                className="message-thread-menu-select"
                                value={activeThread.folder || "inbox"}
                                onChange={(event) => {
                                  onUpdateThread(activeThread.id, {
                                    folder: event.target.value,
                                  });
                                  setThreadMenuOpen(false);
                                }}
                              >
                                {MESSAGE_FOLDERS.map((folder) => (
                                  <option key={folder} value={folder}>
                                    {folder}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <button
                              type="button"
                              className="message-thread-menu-item"
                              onClick={() => {
                                onUpdateThread(activeThread.id, {
                                  muted: !activeThread.muted,
                                });
                                setThreadMenuOpen(false);
                              }}
                            >
                              <BellOff aria-hidden="true" />
                              <span>{activeThread.muted ? "Unmute" : "Mute"}</span>
                            </button>

                            <button
                              type="button"
                              className="message-thread-menu-item"
                              onClick={() => {
                                onUpdateThread(activeThread.id, {
                                  pinned: !activeThread.pinned,
                                });
                                setThreadMenuOpen(false);
                              }}
                            >
                              {activeThread.pinned ? (
                                <PinOff aria-hidden="true" />
                              ) : (
                                <Pin aria-hidden="true" />
                              )}
                              <span>{activeThread.pinned ? "Unpin chat" : "Pin chat"}</span>
                            </button>

                            <button
                              type="button"
                              className="message-thread-menu-item"
                              onClick={() => {
                                onUpdateThread(activeThread.id, {
                                  archived: !activeThread.archived,
                                });
                                setThreadMenuOpen(false);
                              }}
                            >
                              <Archive aria-hidden="true" />
                              <span>{activeThread.archived ? "Restore" : "Archive"}</span>
                            </button>

                            {!activeThread.isGroup && directPartner ? (
                              <>
                                <div className="message-thread-menu-divider" />

                                <button
                                  type="button"
                                  className="message-thread-menu-item"
                                  onClick={() => {
                                    onOpenProfile(directPartner.id);
                                    setThreadMenuOpen(false);
                                  }}
                                >
                                  <UserPlus aria-hidden="true" />
                                  <span>Profile</span>
                                </button>

                                <button
                                  type="button"
                                  className="message-thread-menu-item"
                                  onClick={() => {
                                    onBlockUser(directPartner.id);
                                    setThreadMenuOpen(false);
                                  }}
                                >
                                  <ShieldAlert aria-hidden="true" />
                                  <span>{blockedPartner ? "Unblock" : "Block"}</span>
                                </button>

                                <button
                                  type="button"
                                  className="message-thread-menu-item"
                                  onClick={() => {
                                    onReportUser(directPartner.id);
                                    setThreadMenuOpen(false);
                                  }}
                                >
                                  <MoreHorizontal aria-hidden="true" />
                                  <span>Report</span>
                                </button>
                              </>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span>
                    {activeThread.typingUsers?.length
                      ? `${activeThread.typingUsers[0].name} is typing...`
                      : activeThread.isGroup
                        ? `${activeThread.memberCount} members`
                    : activeThread.handle}
                  </span>
                </div>
              </div>
            </div>

            {activeThread.isRequest ? (
              <div className="message-request-banner">
                <div>
                  <strong>Message request</strong>
                  <span>
                    Accept this conversation to move it into your inbox, or decline
                    it to archive the request.
                  </span>
                </div>
                <div className="message-request-actions">
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => onDeclineThread(activeThread.id)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="primary"
                    onClick={() => onAcceptThread(activeThread.id)}
                  >
                    Accept
                  </button>
                </div>
              </div>
            ) : null}

            {pinnedMessages.length > 0 ? (
              <div className="message-pinned-strip">
                <div className="message-pinned-head">
                  <Pin aria-hidden="true" />
                  <strong>Pinned in this chat</strong>
                </div>
                <div className="message-pinned-list">
                  {pinnedMessages.slice(-3).map((message) => (
                    <button
                      key={message.id}
                      type="button"
                      className="message-pinned-item"
                      onClick={() => setMessageMenuId(message.id)}
                    >
                      <span>{message.text || message.attachments?.[0]?.name || "Pinned message"}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="message-stream" ref={streamRef}>
              {activeThread.messages.map((message) => {
                const previews = getLinkPreviews(message.text);
                return (
                  <article
                    key={message.id}
                    className={message.isOwn ? "message-row own" : "message-row"}
                  >
                    {!message.isOwn ? (
                      <span className="message-sender-avatar">
                        {message.sender?.avatar ? (
                          <img src={message.sender.avatar} alt={message.sender.name} />
                        ) : null}
                      </span>
                    ) : null}

                    <div className={message.isOwn ? "message-bubble own" : "message-bubble"}>
                      <div className="message-bubble-head">
                        <div>
                          {!message.isOwn ? (
                            <strong>{message.sender?.name || "Unknown"}</strong>
                          ) : null}
                          <span>{formatAbsoluteTime(message.time)}</span>
                        </div>
                        <button
                          type="button"
                          className="message-inline-menu"
                          onClick={() =>
                            setMessageMenuId((prev) => (prev === message.id ? null : message.id))
                          }
                        >
                          <MoreHorizontal aria-hidden="true" />
                        </button>
                      </div>

                      {message.unsent ? (
                        <p className="message-unsent-copy">This message was unsent.</p>
                      ) : message.text ? (
                        <p>{message.text}</p>
                      ) : null}

                      {message.attachments?.length ? (
                        <div className="message-attachment-stack">
                          {message.attachments.map((attachment, index) => (
                            <MessageAttachment
                              key={`${message.id}-${attachment.type}-${index}`}
                              attachment={attachment}
                            />
                          ))}
                        </div>
                      ) : null}

                      {previews.length > 0 && !message.unsent ? (
                        <div className="message-link-preview-list">
                          {previews.map((preview) => (
                            <a
                              key={preview.url}
                              href={preview.url}
                              target="_blank"
                              rel="noreferrer"
                              className="message-link-preview"
                            >
                              <Link2 aria-hidden="true" />
                              <div>
                                <strong>{preview.host}</strong>
                                <span>{preview.title}</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      ) : null}

                      {messageMenuId === message.id ? (
                        <div className="message-inline-actions">
                          {message.isOwn && !message.unsent ? (
                            <button
                              type="button"
                              className="ghost"
                              onClick={() => onUpdateMessage(activeThread.id, message.id, "unsend")}
                            >
                              Unsend
                            </button>
                          ) : null}
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              onUpdateMessage(activeThread.id, message.id, "delete_self")
                            }
                          >
                            Delete for me
                          </button>
                          <button
                            type="button"
                            className="ghost"
                            onClick={() =>
                              onUpdateMessage(
                                activeThread.id,
                                message.id,
                                message.pinned ? "unpin" : "pin"
                              )
                            }
                          >
                            {message.pinned ? "Unpin" : "Pin"}
                          </button>
                        </div>
                      ) : null}

                      <div className="message-bubble-foot">
                        {message.pinned ? (
                          <span className="message-pin-badge">
                            <Pin aria-hidden="true" />
                            Pinned
                          </span>
                        ) : null}
                        {message.isOwn ? (
                          <span className="message-status-pill">
                            <CheckCheck aria-hidden="true" />
                            {message.statusLabel}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}

              {activeThread.typingUsers?.length ? (
                <div className="message-typing">
                  <span className="message-typing-dots">
                    <span />
                    <span />
                    <span />
                  </span>
                  <strong>{activeThread.typingUsers[0].name}</strong>
                  <span>is typing...</span>
                </div>
              ) : null}
            </div>

            {blockedPartner ? (
              <div className="message-blocked-banner">
                <ShieldAlert aria-hidden="true" />
                <div>
                  <strong>This user is blocked.</strong>
                  <span>Unblock them to send messages again.</span>
                </div>
              </div>
            ) : (
              <form className="message-composer-card" onSubmit={handleSubmit}>
                {attachments.length > 0 ? (
                  <div className="message-attachment-preview-row">
                    {attachments.map((attachment, index) => (
                      <AttachmentPreview
                        key={`${attachment.type}-${index}`}
                        attachment={attachment}
                        onRemove={() =>
                          setAttachments((prev) =>
                            prev.filter((_, attachmentIndex) => attachmentIndex !== index)
                          )
                        }
                      />
                    ))}
                  </div>
                ) : null}

                <textarea
                  value={draft}
                  onChange={(event) => pulseTyping(event.target.value)}
                  placeholder={
                    activeThread.isGroup
                      ? "Send a message to the group"
                      : "Write a message"
                  }
                  rows={3}
                />

                <div className="message-composer-tools">
                  <div className="message-tool-row">
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => imageInputRef.current?.click()}
                    >
                      <FileImage aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => videoInputRef.current?.click()}
                    >
                      <FileVideo aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Paperclip aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => audioInputRef.current?.click()}
                    >
                      <Mic aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => {
                        setShowStickers((prev) => !prev);
                        setShowGifs(false);
                      }}
                    >
                      <Sparkles aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="message-tool"
                      onClick={() => {
                        setShowGifs((prev) => !prev);
                        setShowStickers(false);
                      }}
                    >
                      <FileImage aria-hidden="true" />
                    </button>
                  </div>

                  <button className="primary" type="submit">
                    <SendHorizontal aria-hidden="true" />
                    <span>Send</span>
                  </button>
                </div>

                {showStickers ? (
                  <div className="message-picker-panel">
                    {DISPLAY_STICKER_PRESETS.map((sticker) => (
                      <button
                        key={sticker.label}
                        type="button"
                        className="message-sticker-option"
                        onClick={() => addSticker(sticker)}
                      >
                        <span>{sticker.emoji}</span>
                        <strong>{sticker.label}</strong>
                      </button>
                    ))}
                  </div>
                ) : null}

                {showGifs ? (
                  <div className="message-picker-panel gif-grid">
                    {GIF_PRESETS.map((gif) => (
                      <button
                        key={gif.name}
                        type="button"
                        className="message-gif-option"
                        onClick={() => addGif(gif)}
                      >
                        <img src={gif.url} alt={gif.name} />
                        <span>{gif.name}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(event) => handleFileAttach(event.target.files, "image")}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  hidden
                  onChange={(event) => handleFileAttach(event.target.files, "video")}
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={(event) => handleFileAttach(event.target.files)}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/*"
                  hidden
                  onChange={(event) => handleFileAttach(event.target.files, "audio")}
                />
              </form>
            )}
          </>
        ) : (
          <div className="message-empty-state">
            <Users aria-hidden="true" />
            <h3>Start a real conversation</h3>
            <p>
              Build DMs and group chats with search, requests, pinned messages,
              media, typing indicators, and read states.
            </p>
            <button
              type="button"
              className="primary"
              onClick={() => setCreatorOpen(true)}
            >
              <Plus aria-hidden="true" />
              <span>New chat</span>
            </button>
          </div>
        )}
      </section>
      ) : null}

      {creatorOpen ? (
        <MessageComposerModal
          open={creatorOpen}
          users={users}
          currentUserId={currentUser?.id}
          blocked={blocked}
          onClose={() => setCreatorOpen(false)}
          onCreate={async (payload) => {
            await onCreateThread(payload);
            setCreatorOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
