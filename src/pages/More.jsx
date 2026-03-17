import {
  AlertTriangle,
  BadgeCheck,
  Crown,
  Eye,
  FileText,
  Globe,
  KeyRound,
  Lock,
  RefreshCw,
  Search,
  Shield,
  Users,
  XCircle,
} from "lucide-react";
import { createElement, useEffect, useMemo, useState } from "react";
import { formatCount, formatTime } from "../utils/format";

const ADMIN_USER_FILTERS = ["All", "Verified", "Banned", "Private", "Owners"];

function formatClock(value) {
  if (!value) return "--";
  try {
    return new Date(value).toLocaleString("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return "--";
  }
}

function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return "--";
  const total = Math.max(0, Math.floor(seconds));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function AdminStatCard({ icon, label, value, tone = "default", note }) {
  return (
    <div className={`glass admin-stat-card admin-stat-${tone}`}>
      <div className="admin-stat-top">
        <span className="admin-stat-icon">
          {icon ? createElement(icon, { "aria-hidden": "true" }) : null}
        </span>
        <span>{label}</span>
      </div>
      <strong>{value}</strong>
      {note ? <small>{note}</small> : null}
    </div>
  );
}

function UserBadge({ tone = "default", children }) {
  return <span className={`admin-user-badge admin-badge-${tone}`}>{children}</span>;
}

function ShieldBanIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 3.5l6 2.3v5c0 4.4-2.7 8.4-6 9.7-3.3-1.3-6-5.3-6-9.7v-5l6-2.3z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M8.5 15.5l7-7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Trash2Icon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4.5 6.5h15"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M9 6.5V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M7 6.5l.8 12a1.5 1.5 0 0 0 1.5 1.4h5.4a1.5 1.5 0 0 0 1.5-1.4l.8-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10 10.5v5M14 10.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function More({
  section,
  onSectionChange,
  settingsDraft,
  onDraftChange,
  onSave,
  onAvatarSelect,
  onBannerSelect,
  analytics,
  isOwner,
  adminUsers,
  adminStatus,
  onRefreshAdmin,
  onOpenProfile,
  adminSummary,
  adminPosts,
  adminQuery,
  onAdminQueryChange,
  adminSelectedUserId,
  adminSelectedUserPosts,
  adminSelectedUserPostsStatus,
  adminSystemStatus,
  adminLastUpdatedAt,
  onAdminSelectUser,
  onAdminUpdate,
  onAdminDeletePost,
}) {
  const [adminUserFilter, setAdminUserFilter] = useState("All");
  const [adminPostQuery, setAdminPostQuery] = useState("");
  const tabs = ["Settings", "Analytics", "Help Center"];
  if (isOwner) tabs.push("Admin");

  const loweredQuery = adminQuery.trim().toLowerCase();
  const filteredUsers = useMemo(() => {
    let next = adminUsers;
    if (loweredQuery) {
      next = next.filter(
        (user) =>
          user.name.toLowerCase().includes(loweredQuery) ||
          user.handle.toLowerCase().includes(loweredQuery) ||
          user.email?.toLowerCase().includes(loweredQuery)
      );
    }
    if (adminUserFilter === "Verified") next = next.filter((user) => user.verified);
    if (adminUserFilter === "Banned") next = next.filter((user) => user.isBanned);
    if (adminUserFilter === "Private") next = next.filter((user) => user.isPrivate);
    if (adminUserFilter === "Owners") next = next.filter((user) => user.isOwner);
    return next;
  }, [adminUsers, adminUserFilter, loweredQuery]);

  const selectedUser = useMemo(
    () =>
      adminUsers.find((user) => user.id === adminSelectedUserId) ??
      filteredUsers[0] ??
      null,
    [adminUsers, adminSelectedUserId, filteredUsers]
  );

  const filteredAdminPosts = useMemo(() => {
    const lowered = adminPostQuery.trim().toLowerCase();
    if (!lowered) return adminPosts;
    return adminPosts.filter(
      (post) =>
        post.text.toLowerCase().includes(lowered) ||
        post.handle.toLowerCase().includes(lowered) ||
        post.name.toLowerCase().includes(lowered)
    );
  }, [adminPostQuery, adminPosts]);

  const computedSummary = useMemo(() => {
    const verified = adminUsers.filter((user) => user.verified).length;
    const isPrivate = adminUsers.filter((user) => user.isPrivate).length;
    const owners = adminUsers.filter((user) => user.isOwner).length;
    const banned = adminUsers.filter((user) => user.isBanned).length;
    return {
      users: adminSummary?.users ?? adminUsers.length,
      posts: adminSummary?.posts ?? adminPosts.length,
      banned: adminSummary?.banned ?? banned,
      verified,
      private: isPrivate,
      owners,
    };
  }, [adminPosts.length, adminSummary, adminUsers]);

  useEffect(() => {
    if (section !== "Admin" || !isOwner) return;
    if (adminStatus !== "idle") return;
    onRefreshAdmin?.();
  }, [adminStatus, isOwner, onRefreshAdmin, section]);

  useEffect(() => {
    if (section !== "Admin") return;
    if (selectedUser || !filteredUsers[0]) return;
    onAdminSelectUser?.(filteredUsers[0].id);
  }, [filteredUsers, onAdminSelectUser, section, selectedUser]);

  function handleBanToggle(user) {
    if (user.isBanned) {
      onAdminUpdate?.(user.id, { isBanned: false, banReason: "" });
      return;
    }
    const reason = prompt("Ban reason for this user", user.banReason || "Admin action");
    if (reason === null) return;
    onAdminUpdate?.(user.id, {
      isBanned: true,
      banReason: reason.trim() || "Admin action",
    });
  }

  function handlePasswordReset(user) {
    const next = prompt(`Set a new password for ${user.handle}`);
    if (!next) return;
    onAdminUpdate?.(user.id, { password: next });
  }

  function handleOwnerToggle(user) {
    if (user.isOwner) {
      onAdminUpdate?.(user.id, { isOwner: false, ownerTag: "" });
      return;
    }
    const ownerTag = prompt("Owner tag", user.ownerTag || "Circle team");
    if (ownerTag === null) return;
    onAdminUpdate?.(user.id, {
      isOwner: true,
      verified: true,
      ownerTag: ownerTag.trim() || "Circle team",
    });
  }

  function handleClearMedia(user, kind) {
    if (kind === "avatar") {
      onAdminUpdate?.(user.id, { avatar: "", avatarScale: 1 });
      return;
    }
    onAdminUpdate?.(user.id, {
      banner: "",
      bannerScale: 1,
      bannerPositionX: 50,
      bannerPositionY: 50,
    });
  }

  return (
    <div className="page-section">
      <h2>More</h2>
      <div className="more-tabs glass">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === section ? "tab active" : "tab"}
            onClick={() => {
              onSectionChange(tab);
              if (tab === "Admin") onRefreshAdmin?.();
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {section === "Settings" ? (
        <form className="settings-panel glass" onSubmit={onSave}>
          <label className="field">
            Display name
            <input
              type="text"
              value={settingsDraft.name}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, name: event.target.value })
              }
            />
          </label>
          <label className="field">
            Handle
            <input
              type="text"
              value={settingsDraft.handle}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, handle: event.target.value })
              }
            />
          </label>
          <label className="field">
            Bio
            <input
              type="text"
              value={settingsDraft.bio}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, bio: event.target.value })
              }
            />
          </label>
          <label className="field">
            Location
            <input
              type="text"
              value={settingsDraft.location}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, location: event.target.value })
              }
            />
          </label>
          <label className="field">
            Link
            <input
              type="text"
              value={settingsDraft.link}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, link: event.target.value })
              }
            />
          </label>
          <label className="field">
            Avatar URL
            <input
              type="text"
              value={settingsDraft.avatar}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, avatar: event.target.value })
              }
            />
          </label>
          <label className="field">
            Banner URL
            <input
              type="text"
              value={settingsDraft.banner}
              onChange={(event) =>
                onDraftChange({ ...settingsDraft, banner: event.target.value })
              }
            />
          </label>
          <div className="settings-media">
            <label className="file-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onAvatarSelect?.(event.target.files?.[0])}
              />
              <span>Upload avatar</span>
            </label>
            <label className="file-upload">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onBannerSelect?.(event.target.files?.[0])}
              />
              <span>Upload banner</span>
            </label>
          </div>
          <p className="settings-note">
            Uploading a new avatar or banner opens a resize popup before it is applied.
          </p>
          <label className="field">
            Privacy
            <div className="toggle-row">
              <span>{settingsDraft.isPrivate ? "Private profile" : "Public profile"}</span>
              <button
                type="button"
                className="ghost"
                onClick={() =>
                  onDraftChange({
                    ...settingsDraft,
                    isPrivate: !settingsDraft.isPrivate,
                  })
                }
              >
                Toggle
              </button>
            </div>
          </label>
          <button className="primary" type="submit">
            Save changes
          </button>
        </form>
      ) : null}

      {section === "Analytics" ? (
        <div className="settings-panel glass">
          {analytics.map((item) => (
            <div key={item.label} className="setting-row">
              <div>
                <p>{item.label}</p>
                <span>{item.value} / {item.delta} this week</span>
              </div>
              <button className="ghost" type="button">
                View
              </button>
            </div>
          ))}
        </div>
      ) : null}

      {section === "Admin" ? (
        <div className="settings-panel glass admin-workspace">
          <div className="admin-hero">
            <div>
              <div className="admin-kicker">Owner Tools</div>
              <h3>Admin control room</h3>
              <p>
                Moderate accounts, inspect user activity, and manage system state
                from one place.
              </p>
            </div>
            <div className="admin-toolbar">
              <label className="admin-search">
                <Search aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search users, handles, or emails"
                  value={adminQuery}
                  onChange={(event) => onAdminQueryChange(event.target.value)}
                />
              </label>
              <button className="ghost" type="button" onClick={onRefreshAdmin}>
                <RefreshCw aria-hidden="true" />
                <span>Refresh</span>
              </button>
            </div>
          </div>

          <div className="admin-stat-grid">
            <AdminStatCard icon={Users} label="Total users" value={formatCount(computedSummary.users)} />
            <AdminStatCard icon={FileText} label="Total posts" value={formatCount(computedSummary.posts)} />
            <AdminStatCard
              icon={BadgeCheck}
              label="Verified"
              value={formatCount(computedSummary.verified)}
              tone="blue"
            />
            <AdminStatCard icon={Lock} label="Private" value={formatCount(computedSummary.private)} />
            <AdminStatCard
              icon={Shield}
              label="Banned"
              value={formatCount(computedSummary.banned)}
              tone="danger"
            />
            <AdminStatCard
              icon={Crown}
              label="Owners"
              value={formatCount(computedSummary.owners)}
              tone="gold"
            />
          </div>

          <div className="admin-grid">
            <section className="glass admin-users-panel">
              <div className="admin-section-head">
                <div>
                  <h4>Users</h4>
                  <span>Pick an account to inspect and moderate.</span>
                </div>
              </div>

              <div className="admin-filter-row">
                {ADMIN_USER_FILTERS.map((filter) => (
                  <button
                    key={filter}
                    type="button"
                    className={filter === adminUserFilter ? "admin-filter-chip active" : "admin-filter-chip"}
                    onClick={() => setAdminUserFilter(filter)}
                  >
                    {filter}
                  </button>
                ))}
              </div>

              {adminStatus === "loading" ? <p className="empty">Loading admin data...</p> : null}
              {adminStatus === "error" ? <p className="empty">Failed to load admin data.</p> : null}

              <div className="admin-user-list">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className={user.id === selectedUser?.id ? "admin-user-row active" : "admin-user-row"}
                    onClick={() => onAdminSelectUser?.(user.id)}
                  >
                    <div className={user.isOwner ? "avatar small owner-avatar admin-user-avatar" : "avatar small admin-user-avatar"}>
                      {user.avatar ? <img src={user.avatar} alt={user.name} /> : null}
                    </div>
                    <div className="admin-user-copy">
                      <div className="admin-user-title">
                        <strong>{user.name}</strong>
                        <span>{user.handle}</span>
                      </div>
                      <div className="admin-user-badges">
                        {user.verified ? <UserBadge tone="blue">Verified</UserBadge> : null}
                        {user.isOwner ? <UserBadge tone="gold">Owner</UserBadge> : null}
                        {user.isPrivate ? <UserBadge>Private</UserBadge> : null}
                        {user.isBanned ? <UserBadge tone="danger">Banned</UserBadge> : null}
                      </div>
                      <small>{user.email || "No email available"}</small>
                    </div>
                  </button>
                ))}
                {filteredUsers.length === 0 && adminStatus === "ready" ? (
                  <span className="empty">No users match this filter.</span>
                ) : null}
              </div>
            </section>

            <section className="glass admin-detail-panel">
              <div className="admin-section-head">
                <div>
                  <h4>User detail</h4>
                  <span>
                    {selectedUser
                      ? "Moderate the selected account and inspect recent activity."
                      : "Select a user to inspect their account."}
                  </span>
                </div>
              </div>

              {selectedUser ? (
                <>
                  <div className="admin-user-hero">
                    <div className="admin-user-banner">
                      {selectedUser.banner ? (
                        <img src={selectedUser.banner} alt={`${selectedUser.name} banner`} />
                      ) : null}
                    </div>
                    <div className="admin-user-hero-body">
                      <div className={selectedUser.isOwner ? "profile-avatar large owner-avatar admin-profile-avatar" : "profile-avatar large admin-profile-avatar"}>
                        {selectedUser.avatar ? <img src={selectedUser.avatar} alt={selectedUser.name} /> : null}
                      </div>
                      <div className="admin-user-main">
                        <div className="admin-user-heading">
                          <div>
                            <h4>{selectedUser.name}</h4>
                            <span>{selectedUser.handle}</span>
                          </div>
                          <button className="ghost" type="button" onClick={() => onOpenProfile?.(selectedUser.id)}>
                            <Eye aria-hidden="true" />
                            <span>Open profile</span>
                          </button>
                        </div>
                        <div className="admin-user-badges">
                          {selectedUser.verified ? <UserBadge tone="blue">Verified</UserBadge> : null}
                          {selectedUser.isOwner ? <UserBadge tone="gold">Owner</UserBadge> : null}
                          {selectedUser.isPrivate ? <UserBadge>Private</UserBadge> : null}
                          {selectedUser.isBanned ? <UserBadge tone="danger">Banned</UserBadge> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="admin-user-metrics">
                    <div className="admin-metric-card">
                      <span>Followers</span>
                      <strong>{formatCount(selectedUser.followers ?? 0)}</strong>
                    </div>
                    <div className="admin-metric-card">
                      <span>Following</span>
                      <strong>{formatCount(selectedUser.following ?? 0)}</strong>
                    </div>
                    <div className="admin-metric-card">
                      <span>Posts</span>
                      <strong>{formatCount(selectedUser.posts ?? 0)}</strong>
                    </div>
                  </div>

                  <div className="admin-detail-meta">
                    <div className="admin-detail-row">
                      <span>Email</span>
                      <strong>{selectedUser.email || "No email"}</strong>
                    </div>
                    <div className="admin-detail-row">
                      <span>Joined</span>
                      <strong>{selectedUser.joined || "--"}</strong>
                    </div>
                    <div className="admin-detail-row">
                      <span>Owner tag</span>
                      <strong>{selectedUser.ownerTag || "--"}</strong>
                    </div>
                    <div className="admin-detail-row">
                      <span>Ban reason</span>
                      <strong>{selectedUser.banReason || "--"}</strong>
                    </div>
                  </div>

                  <div className="admin-action-grid">
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => onAdminUpdate?.(selectedUser.id, { verified: !selectedUser.verified })}
                    >
                      <BadgeCheck aria-hidden="true" />
                      <span>{selectedUser.verified ? "Unverify" : "Verify"}</span>
                    </button>
                    <button className="ghost" type="button" onClick={() => handleOwnerToggle(selectedUser)}>
                      <Crown aria-hidden="true" />
                      <span>{selectedUser.isOwner ? "Remove owner" : "Promote owner"}</span>
                    </button>
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => onAdminUpdate?.(selectedUser.id, { isPrivate: !selectedUser.isPrivate })}
                    >
                      {selectedUser.isPrivate ? <Globe aria-hidden="true" /> : <Lock aria-hidden="true" />}
                      <span>{selectedUser.isPrivate ? "Make public" : "Make private"}</span>
                    </button>
                    <button className="ghost danger" type="button" onClick={() => handleBanToggle(selectedUser)}>
                      <ShieldBanIcon />
                      <span>{selectedUser.isBanned ? "Unban user" : "Ban user"}</span>
                    </button>
                    <button className="ghost" type="button" onClick={() => handlePasswordReset(selectedUser)}>
                      <KeyRound aria-hidden="true" />
                      <span>Reset password</span>
                    </button>
                    <button
                      className="ghost"
                      type="button"
                      onClick={() => {
                        const nextOwnerTag = prompt("Owner tag", selectedUser.ownerTag || "");
                        if (nextOwnerTag === null) return;
                        onAdminUpdate?.(selectedUser.id, { ownerTag: nextOwnerTag.trim() });
                      }}
                    >
                      <Shield aria-hidden="true" />
                      <span>Edit owner tag</span>
                    </button>
                    <button className="ghost" type="button" onClick={() => handleClearMedia(selectedUser, "avatar")}>
                      <XCircle aria-hidden="true" />
                      <span>Clear avatar</span>
                    </button>
                    <button className="ghost" type="button" onClick={() => handleClearMedia(selectedUser, "banner")}>
                      <XCircle aria-hidden="true" />
                      <span>Clear banner</span>
                    </button>
                  </div>

                  <div className="admin-subpanel">
                    <div className="admin-subhead">
                      <h5>Selected user posts</h5>
                      <span>Recent authored posts for fast moderation.</span>
                    </div>
                    {adminSelectedUserPostsStatus === "loading" ? <span className="empty">Loading user posts...</span> : null}
                    {adminSelectedUserPostsStatus === "error" ? <span className="empty">Failed to load user posts.</span> : null}
                    <div className="admin-mini-posts">
                      {adminSelectedUserPosts.map((post) => (
                        <div key={post.id} className="admin-mini-post">
                          <div>
                            <p>{post.text || "Untitled post"}</p>
                            <span>{formatTime(post.time)}</span>
                          </div>
                          <button className="ghost danger" type="button" onClick={() => onAdminDeletePost?.(post.id)}>
                            <Trash2Icon />
                            <span>Delete</span>
                          </button>
                        </div>
                      ))}
                      {adminSelectedUserPosts.length === 0 && adminSelectedUserPostsStatus === "ready" ? (
                        <span className="empty">No posts from this user yet.</span>
                      ) : null}
                    </div>
                  </div>
                </>
              ) : (
                <p className="empty">No user selected.</p>
              )}
            </section>
          </div>

          <div className="admin-lower-grid">
            <section className="glass admin-posts-panel">
              <div className="admin-section-head">
                <div>
                  <h4>Recent posts</h4>
                  <span>Moderate the latest content across the app.</span>
                </div>
                <label className="admin-search admin-search-compact">
                  <Search aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search post text or handle"
                    value={adminPostQuery}
                    onChange={(event) => setAdminPostQuery(event.target.value)}
                  />
                </label>
              </div>

              <div className="admin-post-list">
                {filteredAdminPosts.map((post) => (
                  <div key={post.id} className="admin-post-row">
                    <div className="admin-post-copy">
                      <p>{post.text || "Untitled post"}</p>
                      <span>{post.name} {post.handle} {formatTime(post.time)}</span>
                    </div>
                    <div className="admin-post-actions">
                      <button className="ghost" type="button" onClick={() => onOpenProfile?.(post.userId)}>
                        <Eye aria-hidden="true" />
                        <span>Profile</span>
                      </button>
                      <button className="ghost danger" type="button" onClick={() => onAdminDeletePost?.(post.id)}>
                        <Trash2Icon />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ))}
                {filteredAdminPosts.length === 0 ? <span className="empty">No posts match this search.</span> : null}
              </div>
            </section>

            <section className="glass admin-system-panel">
              <div className="admin-section-head">
                <div>
                  <h4>System</h4>
                  <span>Owner-only backend and runtime snapshot.</span>
                </div>
              </div>

              <div className="admin-system-grid">
                <div className="admin-system-item">
                  <span>Runtime status</span>
                  <strong>{adminSystemStatus?.status ?? "--"}</strong>
                </div>
                <div className="admin-system-item">
                  <span>Uptime</span>
                  <strong>{formatUptime(adminSystemStatus?.uptime)}</strong>
                </div>
                <div className="admin-system-item">
                  <span>Server time</span>
                  <strong>{formatClock(adminSystemStatus?.time)}</strong>
                </div>
                <div className="admin-system-item">
                  <span>Memory RSS</span>
                  <strong>
                    {Number.isFinite(adminSystemStatus?.memoryRssMb)
                      ? `${adminSystemStatus.memoryRssMb} MB`
                      : "--"}
                  </strong>
                </div>
                <div className="admin-system-item">
                  <span>Node</span>
                  <strong>{adminSystemStatus?.node ?? "--"}</strong>
                </div>
                <div className="admin-system-item">
                  <span>Last refreshed</span>
                  <strong>{formatClock(adminLastUpdatedAt)}</strong>
                </div>
              </div>

              <div className="admin-note">
                <AlertTriangle aria-hidden="true" />
                <p>
                  Admin tools act live on the current database. Use bans and password
                  resets carefully.
                </p>
              </div>
            </section>
          </div>
        </div>
      ) : null}

      {section === "Help Center" ? (
        <div className="settings-panel glass">
          <div className="setting-row">
            <div>
              <p>Support</p>
              <span>Get help with your account</span>
            </div>
            <button className="ghost" type="button">
              Open
            </button>
          </div>
          <div className="setting-row">
            <div>
              <p>Report a problem</p>
              <span>Let us know about issues</span>
            </div>
            <button className="ghost" type="button">
              Report
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
