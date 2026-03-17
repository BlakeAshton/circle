import { Check } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  getReplyAudienceOption,
  REPLY_AUDIENCE_OPTIONS,
} from "./replyAudienceOptions";

export default function ReplyAudienceSelector({
  value = "everyone",
  onChange,
  className = "",
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  const activeAudience = useMemo(
    () => getReplyAudienceOption(value),
    [value]
  );

  useEffect(() => {
    if (!menuOpen) return undefined;
    function handleClick(event) {
      if (menuRef.current?.contains(event.target)) return;
      if (buttonRef.current?.contains(event.target)) return;
      setMenuOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  return (
    <div className={className ? `reply-audience-shell ${className}` : "reply-audience-shell"}>
      <button
        ref={buttonRef}
        type="button"
        className="reply-audience-button"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((prev) => !prev)}
      >
        <activeAudience.Icon aria-hidden="true" />
        <span>{activeAudience.label} can reply</span>
      </button>
      {menuOpen ? (
        <div className="reply-audience-menu" ref={menuRef} role="menu">
          <div className="reply-audience-copy">
            <strong>Who can reply?</strong>
            <span>Choose who can reply to this post.</span>
          </div>
          {REPLY_AUDIENCE_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              className="reply-audience-option"
              role="menuitemradio"
              aria-checked={value === option.id}
              onClick={() => {
                onChange?.(option.id);
                setMenuOpen(false);
              }}
            >
              <span className="reply-audience-icon">
                <option.Icon aria-hidden="true" />
              </span>
              <span className="reply-audience-text">
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              {value === option.id ? (
                <Check className="reply-audience-check" aria-hidden="true" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
