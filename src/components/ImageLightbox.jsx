import { Heart, MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  apiCommentProfileMedia,
  apiGetProfileMedia,
  apiToggleProfileMediaLike,
} from "../api/client";
import { formatCount, formatTime } from "../utils/format";

function getDefaultInteractionState(isLoading = false) {
  return {
    loading: isLoading,
    error: "",
    likes: 0,
    likedByMe: false,
    comments: [],
  };
}

function mapProfileMediaState(payload) {
  return {
    loading: false,
    error: "",
    likes: payload?.likes ?? 0,
    likedByMe: Boolean(payload?.likedByMe),
    comments: payload?.comments ?? [],
  };
}

export default function ImageLightbox({ media, onClose }) {
  const profileMedia = media?.profileMedia;
  const [interactionState, setInteractionState] = useState(() =>
    getDefaultInteractionState(Boolean(profileMedia?.userId && profileMedia?.kind))
  );
  const [commentDraft, setCommentDraft] = useState("");
  const [likePending, setLikePending] = useState(false);
  const [submitPending, setSubmitPending] = useState(false);

  useEffect(() => {
    if (!media) return undefined;
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [media, onClose]);

  const applyProfileMediaState = useCallback((payload) => {
    setInteractionState(mapProfileMediaState(payload));
  }, []);

  const loadProfileMediaState = useCallback(async () => {
    if (!profileMedia?.userId || !profileMedia?.kind) return null;
    const data = await apiGetProfileMedia(profileMedia.userId, profileMedia.kind);
    return data.media ?? null;
  }, [profileMedia?.kind, profileMedia?.userId]);

  useEffect(() => {
    if (!profileMedia?.userId || !profileMedia?.kind) {
      setInteractionState(getDefaultInteractionState(false));
      return undefined;
    }
    let active = true;
    setInteractionState(getDefaultInteractionState(true));
    loadProfileMediaState()
      .then((data) => {
        if (!active) return;
        if (!data) return setInteractionState(getDefaultInteractionState(false));
        applyProfileMediaState(data);
      })
      .catch(() => {
        if (!active) return;
        setInteractionState((prev) => ({
          ...prev,
          loading: false,
          error: "Couldn't load reactions right now.",
        }));
      });
    return () => {
      active = false;
    };
  }, [applyProfileMediaState, loadProfileMediaState, profileMedia?.kind, profileMedia?.userId]);

  if (!media?.src) return null;

  async function handleLike(event) {
    event.preventDefault();
    event.stopPropagation();
    if (!profileMedia?.userId || !profileMedia?.kind || likePending) return;
    setLikePending(true);
    setInteractionState((prev) => ({ ...prev, error: "" }));
    try {
      const data = await apiToggleProfileMediaLike(profileMedia.userId, profileMedia.kind);
      if (data.media) {
        applyProfileMediaState(data.media);
      } else {
        setInteractionState((prev) => ({
          ...prev,
          likes: data.likes ?? prev.likes,
          likedByMe: typeof data.liked === "boolean" ? data.liked : prev.likedByMe,
        }));
      }
    } catch {
      setInteractionState((prev) => ({
        ...prev,
        error: "Couldn't update that like. Try again after the server refreshes.",
      }));
    } finally {
      setLikePending(false);
    }
  }

  async function handleCommentSubmit(event) {
    event.preventDefault();
    const text = commentDraft.trim();
    if (!text || !profileMedia?.userId || !profileMedia?.kind) return;
    setSubmitPending(true);
    setInteractionState((prev) => ({ ...prev, error: "" }));
    try {
      const data = await apiCommentProfileMedia(profileMedia.userId, profileMedia.kind, {
        text,
      });
      if (data.media) {
        applyProfileMediaState(data.media);
      } else if (data.comment) {
        setInteractionState((prev) => ({
          ...prev,
          comments: [data.comment, ...prev.comments],
        }));
      }
      setCommentDraft("");
    } catch {
      setInteractionState((prev) => ({
        ...prev,
        error: "Couldn't post that comment right now.",
      }));
    } finally {
      setSubmitPending(false);
    }
  }

  return (
    <div
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={media.label ?? "Expanded image"}
      onClick={onClose}
    >
      <div className="image-lightbox-shell" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          className="image-lightbox-close"
          aria-label="Close image viewer"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
        <figure className="image-lightbox-figure">
          <div className="image-lightbox-frame">
            <img src={media.src} alt={media.alt ?? media.title ?? "Expanded image"} />
          </div>
          {media.title || media.meta ? (
            <figcaption className="image-lightbox-caption">
              {media.title ? <strong>{media.title}</strong> : null}
              {media.meta ? <span>{media.meta}</span> : null}
            </figcaption>
          ) : null}
        </figure>
        {profileMedia?.userId && profileMedia?.kind ? (
          <div className="image-lightbox-social">
            <div className="image-lightbox-media-actions">
              <button
                type="button"
                className={
                  interactionState.likedByMe
                    ? "image-lightbox-action active"
                    : "image-lightbox-action"
                }
                disabled={likePending || interactionState.loading}
                onClick={handleLike}
              >
                <Heart aria-hidden="true" />
                <span>{formatCount(interactionState.likes)}</span>
              </button>
              <span className="image-lightbox-action image-lightbox-static">
                <MessageCircle aria-hidden="true" />
                <span>{formatCount(interactionState.comments.length)}</span>
              </span>
            </div>
            {interactionState.error ? (
              <span className="image-lightbox-error">{interactionState.error}</span>
            ) : null}
            <form className="image-lightbox-comment-form" onSubmit={handleCommentSubmit}>
              <input
                type="text"
                placeholder={`Comment on this ${
                  profileMedia.kind === "avatar" ? "profile photo" : "cover photo"
                }`}
                value={commentDraft}
                onChange={(event) => setCommentDraft(event.target.value)}
              />
              <button className="primary" type="submit" disabled={submitPending || !commentDraft.trim()}>
                Reply
              </button>
            </form>
            <div className="image-lightbox-comments">
              {interactionState.loading ? (
                <span className="empty">Loading reactions...</span>
              ) : null}
              {!interactionState.loading && interactionState.comments.length === 0 ? (
                <span className="empty">No comments yet.</span>
              ) : null}
              {interactionState.comments.map((comment) => (
                <div key={comment.id} className="image-lightbox-comment">
                  <div className="avatar small">
                    {comment.avatar ? <img src={comment.avatar} alt={comment.name} /> : null}
                  </div>
                  <div className="image-lightbox-comment-copy">
                    <p>
                      {comment.name} <span>{comment.handle}</span>
                    </p>
                    <small>{formatTime(comment.time)}</small>
                    <p className="image-lightbox-comment-text">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
