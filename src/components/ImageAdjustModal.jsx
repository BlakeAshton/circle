import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const MODAL_COPY = {
  avatar: {
    title: "Adjust profile photo",
    subtitle: "Use the slider to resize your profile photo before saving it.",
    label: "Profile photo zoom",
    meta: "Profile photo",
  },
  banner: {
    title: "Adjust cover photo",
    subtitle:
      "Zoom and drag to place the part of your cover photo that should stay inside the 1500 x 500 frame.",
    label: "Cover photo zoom",
    meta: "Cover photo",
  },
};

function clampPosition(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 50;
  return Number(Math.min(100, Math.max(0, parsed)).toFixed(2));
}

export default function ImageAdjustModal({ media, onApply, onClose }) {
  const frameRef = useRef(null);
  const dragRef = useRef(null);
  const [scale, setScale] = useState(media?.scale ?? 1);
  const [positionX, setPositionX] = useState(clampPosition(media?.positionX ?? 50));
  const [positionY, setPositionY] = useState(clampPosition(media?.positionY ?? 50));
  const [isDragging, setIsDragging] = useState(false);

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

  if (!media?.src || !media?.kind) return null;

  const copy = MODAL_COPY[media.kind] ?? MODAL_COPY.avatar;
  const imageStyle =
    media.kind === "banner"
      ? {
          transform: `scale(${scale})`,
          objectPosition: `${positionX}% ${positionY}%`,
        }
      : { transform: `scale(${scale})` };

  function handleBannerPointerDown(event) {
    if (media.kind !== "banner") return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startPositionX: positionX,
      startPositionY: positionY,
      width: rect.width || 1,
      height: rect.height || 1,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }

  function handleBannerPointerMove(event) {
    if (media.kind !== "banner") return;
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - activeDrag.startX;
    const deltaY = event.clientY - activeDrag.startY;
    setPositionX(clampPosition(activeDrag.startPositionX - (deltaX / activeDrag.width) * 100));
    setPositionY(clampPosition(activeDrag.startPositionY - (deltaY / activeDrag.height) * 100));
  }

  function handleBannerPointerEnd(event) {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
  }

  return (
    <div
      className="image-adjust-modal"
      role="dialog"
      aria-modal="true"
      aria-label={copy.title}
      onClick={onClose}
    >
      <div
        className="image-adjust-shell glass"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="image-adjust-close"
          aria-label="Close image adjuster"
          onClick={onClose}
        >
          <X aria-hidden="true" />
        </button>
        <div className="image-adjust-copy">
          <p className="image-adjust-meta">{copy.meta}</p>
          <h3>{copy.title}</h3>
          <p>{copy.subtitle}</p>
        </div>
        <div className="image-adjust-preview">
          {media.kind === "avatar" ? (
            <div className="image-adjust-avatar-frame">
              <img src={media.src} alt={copy.title} style={imageStyle} />
            </div>
          ) : (
            <div
              ref={frameRef}
              className={
                isDragging
                  ? "image-adjust-banner-frame is-dragging"
                  : "image-adjust-banner-frame"
              }
              onPointerDown={handleBannerPointerDown}
              onPointerMove={handleBannerPointerMove}
              onPointerUp={handleBannerPointerEnd}
              onPointerCancel={handleBannerPointerEnd}
              onLostPointerCapture={handleBannerPointerEnd}
            >
              <img src={media.src} alt={copy.title} style={imageStyle} />
              <span className="image-adjust-banner-hint">
                Drag to reposition inside the 1500 x 500 frame
              </span>
            </div>
          )}
        </div>
        <label className="field image-adjust-field">
          {copy.label}
          <div className="range-row">
            <input
              type="range"
              min="1"
              max="2.2"
              step="0.05"
              value={scale}
              onChange={(event) => setScale(Number(event.target.value))}
            />
            <span>{Math.round(scale * 100)}%</span>
          </div>
        </label>
        <div className="image-adjust-actions">
          <button className="ghost" type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="primary"
            type="button"
            onClick={() =>
              onApply?.({
                src: media.src,
                scale,
                positionX,
                positionY,
              })
            }
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
