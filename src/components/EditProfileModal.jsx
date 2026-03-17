import { Camera, Link2, MapPin, UserRound, X } from "lucide-react";
import { useEffect } from "react";

export default function EditProfileModal({
  open,
  draft,
  onDraftChange,
  onAvatarSelect,
  onBannerSelect,
  onSave,
  onClose,
}) {
  useEffect(() => {
    if (!open) return undefined;
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
  }, [onClose, open]);

  if (!open) return null;

  async function handleSubmit(event) {
    const ok = await onSave?.(event);
    if (ok === false) return;
    onClose?.();
  }

  return (
    <div className="edit-profile-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <form
        className="edit-profile-shell glass"
        onClick={(event) => event.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <div className="edit-profile-header">
          <button
            type="button"
            className="edit-profile-close"
            aria-label="Close edit profile"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
          <h2>Edit profile</h2>
          <button className="edit-profile-save" type="submit">
            Save
          </button>
        </div>

        <div className="edit-profile-scroll">
          <section className="edit-profile-hero">
            <div className="edit-profile-banner-preview">
              {draft.banner ? (
                <img
                  src={draft.banner}
                  alt="Profile banner preview"
                  style={{
                    transform: `scale(${draft.bannerScale ?? 1})`,
                    objectPosition: `${draft.bannerPositionX ?? 50}% ${draft.bannerPositionY ?? 50}%`,
                  }}
                />
              ) : null}
              {!draft.banner ? <div className="edit-profile-banner-fallback" /> : null}
              <div className="edit-profile-banner-actions">
                <label className="edit-profile-media-action">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onBannerSelect?.(event.target.files?.[0])}
                  />
                  <Camera aria-hidden="true" />
                  <span>Edit banner</span>
                </label>
              </div>
            </div>

            <div className="edit-profile-avatar-row">
              <label className="edit-profile-avatar-picker">
                <div className="edit-profile-avatar-frame">
                  {draft.avatar ? (
                    <img
                      src={draft.avatar}
                      alt="Profile avatar preview"
                      style={{ transform: `scale(${draft.avatarScale ?? 1})` }}
                    />
                  ) : null}
                  <span className="edit-profile-avatar-overlay">
                    <Camera aria-hidden="true" />
                  </span>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => onAvatarSelect?.(event.target.files?.[0])}
                />
              </label>

              <div className="edit-profile-photo-card">
                <div>
                  <strong>Edit your photo</strong>
                  <span>Upload a new image. Resize opens automatically.</span>
                </div>
                <label className="edit-profile-photo-button">
                  <Camera aria-hidden="true" />
                  <span>Edit photo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(event) => onAvatarSelect?.(event.target.files?.[0])}
                  />
                </label>
              </div>
            </div>
          </section>

          <section className="edit-profile-fields">
            <label className="edit-profile-field">
              <span>Name</span>
              <div className="edit-profile-input-shell">
                <UserRound aria-hidden="true" />
                <input
                  type="text"
                  value={draft.name}
                  onChange={(event) =>
                    onDraftChange({ ...draft, name: event.target.value })
                  }
                />
              </div>
            </label>

            <label className="edit-profile-field">
              <span>Handle</span>
              <input
                type="text"
                value={draft.handle}
                onChange={(event) =>
                  onDraftChange({ ...draft, handle: event.target.value })
                }
              />
            </label>

            <label className="edit-profile-field edit-profile-field-bio">
              <span>Bio</span>
              <textarea
                rows="4"
                value={draft.bio}
                onChange={(event) =>
                  onDraftChange({ ...draft, bio: event.target.value })
                }
              />
            </label>

            <label className="edit-profile-field">
              <span>Location</span>
              <div className="edit-profile-input-shell">
                <MapPin aria-hidden="true" />
                <input
                  type="text"
                  value={draft.location}
                  onChange={(event) =>
                    onDraftChange({ ...draft, location: event.target.value })
                  }
                />
              </div>
            </label>

            <label className="edit-profile-field">
              <span>Website</span>
              <div className="edit-profile-input-shell">
                <Link2 aria-hidden="true" />
                <input
                  type="text"
                  value={draft.link}
                  placeholder="https://your-site.com"
                  onChange={(event) =>
                    onDraftChange({ ...draft, link: event.target.value })
                  }
                />
              </div>
            </label>

            <div className="edit-profile-privacy-row">
              <div>
                <strong>{draft.isPrivate ? "Private profile" : "Public profile"}</strong>
                <span>
                  {draft.isPrivate
                    ? "Only approved followers can view your profile activity."
                    : "Anyone signed in can view your profile activity."}
                </span>
              </div>
              <button
                type="button"
                className={
                  draft.isPrivate
                    ? "edit-profile-privacy-toggle active"
                    : "edit-profile-privacy-toggle"
                }
                onClick={() =>
                  onDraftChange({ ...draft, isPrivate: !draft.isPrivate })
                }
              >
                {draft.isPrivate ? "Private" : "Public"}
              </button>
            </div>
          </section>
        </div>
      </form>
    </div>
  );
}
