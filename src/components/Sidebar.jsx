import { MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { getNavIcon } from "./navIcons";

export default function Sidebar({
  navItems,
  activePage,
  onNavigate,
  currentUser,
  unreadCount,
  messageUnreadCount,
  onOpenProfile,
  onOpenSettings,
  onLogout,
  onPostClick,
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(event) {
      if (!menuRef.current || menuRef.current.contains(event.target)) return;
      setMenuOpen(false);
    }
    function handleEscape(event) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [menuOpen]);

  return (
    <aside className="sidebar">
      <nav className="nav-list">
        {navItems.map((item) => {
          const Icon = getNavIcon(item.label);
          return (
            <button
              key={item.label}
              type="button"
              className={
                activePage === item.label ? "nav-item active" : "nav-item"
              }
              onClick={() => onNavigate(item.label)}
            >
              <span className="nav-icon">
                <Icon aria-hidden="true" />
              </span>
              <span className="nav-label">
                {item.label}
                {item.label === "Notifications" && unreadCount > 0 ? (
                  <span className="nav-badge">{unreadCount}</span>
                ) : null}
                {item.label === "Messages" && messageUnreadCount > 0 ? (
                  <span className="nav-badge">{messageUnreadCount}</span>
                ) : null}
              </span>
            </button>
          );
        })}
      </nav>
      <button className="primary post-button" type="button" onClick={onPostClick}>
        Post
      </button>
      <div
        className={
          currentUser?.isOwner
            ? "profile-card mini owner-card sidebar-account"
            : "profile-card mini sidebar-account"
        }
        ref={menuRef}
      >
        <button type="button" className="profile-main" onClick={onOpenProfile}>
          <div className={currentUser?.isOwner ? "avatar owner-avatar" : "avatar"}>
            {currentUser?.avatar ? (
              <img src={currentUser.avatar} alt={currentUser.name} />
            ) : null}
          </div>
          <div>
            <p>
              {currentUser?.name ?? "Your profile"}
              {currentUser?.verified ? (
                <span className="mini-verified" title="Verified">
                  <VerifiedIcon />
                </span>
              ) : null}
            </p>
            <span className="profile-handle">
              {currentUser?.handle ?? "@you"}
            </span>
          </div>
        </button>
        <div className="profile-actions">
          <button
            className="profile-menu-trigger"
            type="button"
            aria-label="Profile menu"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            <MoreHorizontal aria-hidden="true" />
          </button>
          {menuOpen ? (
            <div className="profile-menu glass" role="menu">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenProfile();
                }}
              >
                View profile
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onOpenSettings?.();
                }}
              >
                Settings
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout?.();
                }}
              >
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

function VerifiedIcon() {
  return (
    <svg className="verified-icon" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6.5l1.6 3.5 3.9.5-2.8 2.6.7 3.9-3.4-1.9-3.4 1.9.7-3.9-2.8-2.6 3.9-.5L12 6.5z" />
    </svg>
  );
}
