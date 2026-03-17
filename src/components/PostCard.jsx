import {
  BarChart3,
  Heart,
  MessageCircle,
  MoreHorizontal,
  PencilLine,
  Pin,
  Repeat2,
  Trash2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatCount, formatTime } from "../utils/format";

export default function PostCard({
  post,
  author,
  isLiked,
  isReposted,
  onLike,
  onRepost,
  onOpenProfile,
  onReplyToggle,
  showReply,
  replyValue,
  onReplyChange,
  onReplySubmit,
  canReply = true,
  replyAudience = "everyone",
  isOwnPost,
  onEdit,
  onDelete,
  onPin,
  isPinned,
  onVote,
  hasVoted,
  isOwnerPost,
  onView,
  replies,
  onToggleThread,
  isThreadOpen,
  onOpenImage,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editText, setEditText] = useState(post.text);
  const cardRef = useRef(null);
  const menuRef = useRef(null);
  const menuButtonRef = useRef(null);
  const pollTotal = post.poll
    ? post.poll.options.reduce((sum, option) => sum + option.votes, 0)
    : 0;
  const replyLabel = getReplyAudienceLabel(replyAudience);

  useEffect(() => {
    if (!onView || !cardRef.current) return;
    const element = cardRef.current;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onView();
          observer.disconnect();
        }
      },
      { threshold: 0.6 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [onView]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handlePointerDown(event) {
      if (menuRef.current?.contains(event.target)) return;
      if (menuButtonRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  function handleToggleEdit() {
    setMenuOpen(false);
    if (isEditing) {
      setEditText(post.text);
      setIsEditing(false);
      return;
    }
    setEditText(post.text);
    setIsEditing(true);
  }

  function handleToggleMenu() {
    setMenuOpen((prev) => !prev);
  }

  return (
    <article className="post-card glass" ref={cardRef}>
      <div className="post-meta">
        <button type="button" className="post-author" onClick={onOpenProfile}>
          <div className="avatar small">
            {author.avatar || post.avatar ? (
              <img src={author.avatar || post.avatar} alt={author.name} />
            ) : null}
          </div>
          <div className="post-author-copy">
            <p className="post-name">
              {author.name}
              {author.verified ? (
                <span className="verified-tooltip" title="Verified">
                  <VerifiedIcon />
                </span>
              ) : null}
            </p>
            <span className="post-handle">
              {author.handle}{" \u00B7 "}{formatTime(post.time)}
            </span>
          </div>
        </button>
        {isOwnPost ? (
          <div className="post-menu-shell">
            <button
              ref={menuButtonRef}
              className={menuOpen ? "post-menu-trigger active" : "post-menu-trigger"}
              type="button"
              aria-label="Post options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={handleToggleMenu}
            >
              <MoreHorizontal aria-hidden="true" />
            </button>
            {menuOpen ? (
              <div className="post-popout-menu" ref={menuRef} role="menu">
                <button
                  className="post-popout-item"
                  type="button"
                  role="menuitem"
                  onClick={handleToggleEdit}
                >
                  <PencilLine aria-hidden="true" />
                  <span>{isEditing ? "Cancel edit" : "Edit post"}</span>
                </button>
                <button
                  className="post-popout-item"
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onPin?.();
                  }}
                >
                  <Pin aria-hidden="true" />
                  <span>{isPinned ? "Unpin post" : "Pin post"}</span>
                </button>
                {!isOwnerPost ? (
                  <button
                    className="post-popout-item danger"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      onDelete?.();
                    }}
                  >
                    <Trash2 aria-hidden="true" />
                    <span>Delete post</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      {isPinned ? <span className="pill">Pinned</span> : null}
      {isOwnerPost ? <span className="pill owner-pill">Founder post</span> : null}
      {isEditing ? (
        <div className="edit-post">
          <textarea
            value={editText}
            onChange={(event) => setEditText(event.target.value)}
          />
          <div className="draft-actions">
            <button
              className="primary"
              type="button"
              onClick={() => {
                onEdit(editText.trim() || post.text);
                setIsEditing(false);
              }}
            >
              Save
            </button>
            <button
              className="ghost"
              type="button"
              onClick={() => {
                setEditText(post.text);
                setIsEditing(false);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <p className="post-text">{post.text}</p>
      )}
      {post.quoteOf ? (
        <div className="quote-card">
          <span>
            {post.quoteOf.authorName} - {post.quoteOf.authorHandle}
          </span>
          <p>{post.quoteOf.text}</p>
        </div>
      ) : null}
      {post.poll ? (
        <div className="poll-card">
          <p className="poll-question">{post.poll.question}</p>
          <div className="poll-options">
            {post.poll.options.map((option) => {
              const percentage =
                pollTotal > 0
                  ? Math.round((option.votes / pollTotal) * 100)
                  : 0;
              return (
                <button
                  key={option.id}
                  className="poll-option"
                  type="button"
                  disabled={hasVoted}
                  onClick={() => onVote(option.id)}
                >
                  <span>{option.text}</span>
                  <span>{percentage}%</span>
                </button>
              );
            })}
          </div>
          <span className="poll-meta">{formatCount(pollTotal)} votes</span>
        </div>
      ) : null}
      {post.image ? (
        <button
          type="button"
          className="post-media post-media-trigger"
          onClick={() =>
            onOpenImage?.({
              src: post.image,
              alt: `${author.name} post image`,
              title: author.name,
              meta: `${author.handle} · ${formatTime(post.time)}`,
              label: "Expanded post image",
            })
          }
          aria-label="Open post image"
        >
          <img src={post.image} alt={`${author.name} post image`} />
        </button>
      ) : null}
      <div className="post-actions" aria-label="Post engagement">
        <button
          className={canReply ? "post-action reply-action" : "post-action reply-action disabled"}
          type="button"
          onClick={onReplyToggle}
          disabled={!canReply}
          title={!canReply ? replyLabel : undefined}
          aria-label={
            canReply
              ? `${formatCount(post.comments)} comments`
              : `${replyLabel}. Replies disabled`
          }
        >
          <MessageCircle className="action-icon" aria-hidden="true" />
          <span className="action-count">{formatCount(post.comments)}</span>
        </button>
        <button
          className={isReposted ? "post-action repost-action active" : "post-action repost-action"}
          type="button"
          onClick={onRepost}
          aria-label={`${formatCount(post.reposts ?? 0)} reposts`}
        >
          <Repeat2 className="action-icon" aria-hidden="true" />
          <span className="action-count">{formatCount(post.reposts ?? 0)}</span>
        </button>
        <button
          className={isLiked ? "post-action like-action active" : "post-action like-action"}
          type="button"
          onClick={onLike}
          aria-label={`${formatCount(post.likes ?? 0)} likes`}
        >
          <Heart className="action-icon" aria-hidden="true" />
          <span className="action-count">{formatCount(post.likes ?? 0)}</span>
        </button>
        <span className="post-action views-action" aria-label={`${formatCount(post.views ?? 0)} views`}>
          <BarChart3 className="action-icon" aria-hidden="true" />
          <span className="action-count">{formatCount(post.views ?? 0)}</span>
        </span>
      </div>
      {canReply && showReply ? (
        <form className="reply-form" onSubmit={onReplySubmit}>
          <input
            type="text"
            placeholder="Write a reply"
            value={replyValue}
            onChange={(event) => onReplyChange(event.target.value)}
          />
          <button className="primary" type="submit">
            Reply
          </button>
        </form>
      ) : null}
      {post.comments > 0 ? (
        <button className="ghost thread-toggle" type="button" onClick={onToggleThread}>
          {isThreadOpen ? "Hide replies" : `View replies (${post.comments})`}
        </button>
      ) : null}
      {isThreadOpen && replies?.length > 0 ? (
        <div className="thread">
          {replies.map((reply) => (
            <div key={reply.id} className="thread-reply">
              <div className="avatar small" />
              <div>
                <p>
                  {reply.name} <span>{reply.handle}</span>
                </p>
                <span>{formatTime(reply.time)}</span>
                <p className="reply-text">{reply.text}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function getReplyAudienceLabel(audience) {
  if (audience === "following") return "Only accounts this author follows can reply";
  if (audience === "verified") return "Only verified accounts can reply";
  if (audience === "mentioned") return "Only mentioned accounts can reply";
  return "Everyone can reply";
}

function VerifiedIcon() {
  return (
    <svg className="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6.5l1.6 3.5 3.9.5-2.8 2.6.7 3.9-3.4-1.9-3.4 1.9.7-3.9-2.8-2.6 3.9-.5L12 6.5z" />
    </svg>
  );
}
