import { Check, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import PostCard from "../components/PostCard";
import PostComposer from "../components/PostComposer";
import ReplyAudienceSelector from "../components/ReplyAudienceSelector";
import { formatCount } from "../utils/format";

export default function Profile({
  profile,
  profileTab,
  onProfileTabChange,
  posts,
  postCount,
  liked,
  reposted,
  onLike,
  onRepost,
  onShare,
  onOpenProfile,
  getAuthor,
  isFollowing,
  onFollowToggle,
  isCurrentUser,
  composer,
  onComposerChange,
  composerImage,
  onImageSelect,
  onImageClear,
  onPostToProfile,
  replyAudience,
  onReplyAudienceChange,
  currentUser,
  replyPostId,
  replyDraft,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  onOpenSettings,
  isMuted,
  isBlocked,
  onMuteToggle,
  onBlockToggle,
  onReport,
  followingList,
  followersList,
  onToggleFollow,
  onToggleFollower,
  currentUserId,
  pinnedPost,
  pinnedPostId,
  onPinPost,
  onEditPost,
  onDeletePost,
  onVote,
  pollVotes,
  onView,
  repliesByPostId,
  expandedReplies,
  onToggleReplies,
  onOpenImage,
}) {
  const [tabMenuOpen, setTabMenuOpen] = useState(false);
  const tabMenuRef = useRef(null);
  const tabMenuButtonRef = useRef(null);
  const tabList = [
    "Posts",
    "Replies",
    "Highlights",
    "Articles",
    "Media",
    "Likes",
    "Followers",
    "Following",
  ];
  const isLocked = profile?.isPrivate && !isCurrentUser && !isFollowing;
  const avatarScale = profile?.avatarScale ?? 1;
  const bannerScale = profile?.bannerScale ?? 1;
  const bannerPositionX = profile?.bannerPositionX ?? 50;
  const bannerPositionY = profile?.bannerPositionY ?? 50;

  useEffect(() => {
    if (!tabMenuOpen) return undefined;
    function handlePointerDown(event) {
      if (tabMenuRef.current?.contains(event.target)) return;
      if (tabMenuButtonRef.current?.contains(event.target)) return;
      setTabMenuOpen(false);
    }
    function handleEscape(event) {
      if (event.key === "Escape") {
        setTabMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [tabMenuOpen]);

  function handleSelectTab(tab) {
    onProfileTabChange?.(tab);
    setTabMenuOpen(false);
  }

  return (
    <div className="page-section profile-page">
      <div className="profile-header glass">
        {profile?.banner ? (
          <button
            type="button"
            className={
              profile?.isOwner
                ? "profile-banner owner-banner profile-media-button"
                : "profile-banner profile-media-button"
            }
            onClick={() =>
              onOpenImage?.({
                src: profile.banner,
                alt: `${profile?.name ?? "Profile"} cover photo`,
                title: profile?.name ?? "Profile",
                meta: "Cover photo",
                label: "Expanded cover photo",
                profileMedia: {
                  userId: profile?.id,
                  kind: "banner",
                },
              })
            }
            aria-label="Open cover photo"
          >
            <img
              src={profile.banner}
              alt="Profile banner"
              style={{
                transform: `scale(${bannerScale})`,
                objectPosition: `${bannerPositionX}% ${bannerPositionY}%`,
              }}
            />
          </button>
        ) : (
          <div
            className={
              profile?.isOwner ? "profile-banner owner-banner" : "profile-banner"
            }
          />
        )}
        <div className="profile-content">
          {profile?.avatar ? (
            <button
              type="button"
              className={
                profile?.isOwner
                  ? "profile-avatar large owner-avatar profile-media-button"
                  : "profile-avatar large profile-media-button"
              }
              onClick={() =>
                onOpenImage?.({
                  src: profile.avatar,
                  alt: `${profile?.name ?? "Profile"} profile photo`,
                  title: profile?.name ?? "Profile",
                  meta: "Profile photo",
                  label: "Expanded profile photo",
                  profileMedia: {
                    userId: profile?.id,
                    kind: "avatar",
                  },
                })
              }
              aria-label="Open profile photo"
            >
              <img
                src={profile.avatar}
                alt={profile.name}
                style={{ transform: `scale(${avatarScale})` }}
              />
            </button>
          ) : (
            <div
              className={
                profile?.isOwner
                  ? "profile-avatar large owner-avatar"
                  : "profile-avatar large"
              }
            />
          )}
          <div className="profile-actions">
            {isCurrentUser ? (
              <button className="ghost" type="button" onClick={onOpenSettings}>
                Edit profile
              </button>
            ) : (
              <button
                className={isFollowing ? "ghost" : "primary"}
                type="button"
                onClick={onFollowToggle}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            )}
            <div className="profile-tab-menu-shell">
              <button
                ref={tabMenuButtonRef}
                className={
                  tabMenuOpen
                    ? "profile-tab-menu-trigger active"
                    : "profile-tab-menu-trigger"
                }
                type="button"
                aria-label={`Open profile sections menu. Current section ${profileTab}.`}
                aria-haspopup="menu"
                aria-expanded={tabMenuOpen}
                onClick={() => setTabMenuOpen((prev) => !prev)}
              >
                <MoreHorizontal aria-hidden="true" />
              </button>
              {tabMenuOpen ? (
                <div
                  ref={tabMenuRef}
                  className="profile-tab-popout-menu"
                  role="menu"
                >
                  <div className="profile-tab-popout-copy">
                    <strong>Profile sections</strong>
                    <span>Choose what to view on this profile.</span>
                  </div>
                  {tabList.map((tab) => (
                    <button
                      key={tab}
                      className={
                        tab === profileTab
                          ? "profile-tab-popout-item active"
                          : "profile-tab-popout-item"
                      }
                      type="button"
                      role="menuitemradio"
                      aria-checked={tab === profileTab}
                      onClick={() => handleSelectTab(tab)}
                    >
                      <span>{tab}</span>
                      {tab === profileTab ? <Check aria-hidden="true" /> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className="profile-identity">
          <div>
            <h2>
              {profile?.name ?? "Profile"}
              {profile?.verified ? (
                <span className="verified-tooltip">
                  <VerifiedIcon />
                </span>
              ) : null}
            </h2>
            <span className="post-handle">{profile?.handle ?? ""}</span>
            {profile?.isOwner ? (
              <span className="owner-line">{profile?.ownerTag}</span>
            ) : null}
          </div>
        </div>
        <p className="profile-bio-text">{profile?.bio ?? ""}</p>
        <div className="profile-meta">
          <span>{profile?.location ?? ""}</span>
          <span>{profile?.link ?? ""}</span>
          <span>Joined {profile?.joined ?? ""}</span>
          {profile?.isPrivate ? <span>Private</span> : null}
        </div>
        <div className="profile-stats">
          <div>
            <p>{formatCount(profile?.following ?? 0)}</p>
            <span>Following</span>
          </div>
          <div>
            <p>{formatCount(profile?.followers ?? 0)}</p>
            <span>Followers</span>
          </div>
          <div>
            <p>{formatCount(postCount ?? profile?.posts ?? 0)}</p>
            <span>Posts</span>
          </div>
        </div>
        {!isCurrentUser ? (
          <div className="moderation">
            <button className="ghost" type="button" onClick={onMuteToggle}>
              {isMuted ? "Unmute" : "Mute"}
            </button>
            <button className="ghost" type="button" onClick={onBlockToggle}>
              {isBlocked ? "Unblock" : "Block"}
            </button>
            <button className="ghost" type="button" onClick={onReport}>
              Report
            </button>
          </div>
        ) : null}
      </div>
      {!isLocked ? (
        <div className="glass profile-composer">
          <PostComposer
            value={composer}
            onChange={onComposerChange}
            onSubmit={onPostToProfile}
            onSaveDraft={() => {}}
            onSchedule={() => {}}
            imageValue={composerImage}
            onImageSelect={onImageSelect}
            onImageClear={onImageClear}
            avatarUrl={currentUser?.avatar}
            avatarAlt={currentUser?.name ?? "Your avatar"}
            scheduleEnabled={false}
            onScheduleToggle={() => {}}
            scheduleTime=""
            onScheduleChange={() => {}}
            pollEnabled={false}
            onPollToggle={() => {}}
            pollQuestion=""
            onPollQuestionChange={() => {}}
            pollOptions={["", ""]}
            onPollOptionsChange={() => {}}
            onPollReset={() => {}}
            extraTopContent={
              <ReplyAudienceSelector
                value={replyAudience}
                onChange={onReplyAudienceChange}
                className="profile-reply-audience"
              />
            }
            placeholder={
              profile?.handle
                ? `Post on ${profile.handle}`
                : "Post on profile"
            }
            submitLabel="Post to profile"
            showExtras={false}
          />
        </div>
      ) : null}
      {isLocked ? (
        <div className="glass empty">
          This profile is private. Follow to see posts and activity.
        </div>
      ) : null}

      {!isLocked && profileTab === "Followers" ? (
        <div className="list">
          {followersList.map((user) => (
            <div key={user.id} className="list-item">
              <p>
                {user.name} <span>{user.handle}</span>
              </p>
              <button
                className="ghost"
                type="button"
                onClick={() => onToggleFollower(user.id)}
              >
                Remove
              </button>
            </div>
          ))}
          {followersList.length === 0 ? (
            <span className="empty">No followers yet.</span>
          ) : null}
        </div>
      ) : null}

      {!isLocked && profileTab === "Following" ? (
        <div className="list">
          {followingList.map((user) => (
            <div key={user.id} className="list-item">
              <p>
                {user.name} <span>{user.handle}</span>
              </p>
              <button
                className="ghost"
                type="button"
                onClick={() => onToggleFollow(user.id)}
              >
                Unfollow
              </button>
            </div>
          ))}
          {followingList.length === 0 ? (
            <span className="empty">You’re not following anyone yet.</span>
          ) : null}
        </div>
      ) : null}

      {!isLocked && profileTab !== "Followers" && profileTab !== "Following" ? (
        <div className="post-list">
          {pinnedPost ? (
            <PostCard
              key={`pinned-${pinnedPost.id}`}
              post={pinnedPost}
              author={getAuthor(pinnedPost)}
              isLiked={liked.has(pinnedPost.id)}
              isReposted={reposted.has(pinnedPost.id)}
              onLike={() => onLike(pinnedPost.id)}
              onRepost={() => onRepost(pinnedPost.id)}
              onShare={() => onShare(pinnedPost.id)}
              onOpenProfile={() => onOpenProfile(pinnedPost.userId)}
              onReplyToggle={() => onReplyToggle(pinnedPost.id)}
              showReply={replyPostId === pinnedPost.id}
              replyValue={replyDraft}
              onReplyChange={onReplyChange}
              onReplySubmit={(event) => onReplySubmit(event, pinnedPost.id)}
              canReply={pinnedPost.canReply !== false}
              replyAudience={pinnedPost.replyAudience}
              isOwnPost={pinnedPost.userId === currentUserId}
              onEdit={(text) => onEditPost(pinnedPost.id, text)}
              onDelete={() => onDeletePost(pinnedPost.id)}
              onPin={() => onPinPost(pinnedPost.id)}
              isPinned={pinnedPostId === pinnedPost.id}
              onVote={(optionId) => onVote(pinnedPost.id, optionId)}
              hasVoted={pollVotes.has(pinnedPost.id)}
              isOwnerPost={pinnedPost.isOwnerPost}
              onView={() => onView(pinnedPost.id)}
              replies={repliesByPostId?.[pinnedPost.id] ?? []}
              isThreadOpen={expandedReplies?.has(pinnedPost.id)}
              onToggleThread={() => onToggleReplies?.(pinnedPost.id)}
              onOpenImage={onOpenImage}
            />
          ) : null}
          {posts
            .filter((post) => post.id !== pinnedPostId)
            .map((post) => (
            <PostCard
              key={post.id}
              post={post}
              author={getAuthor(post)}
              isLiked={liked.has(post.id)}
              isReposted={reposted.has(post.id)}
              onLike={() => onLike(post.id)}
              onRepost={() => onRepost(post.id)}
              onShare={() => onShare(post.id)}
              onOpenProfile={() => onOpenProfile(post.userId)}
              onReplyToggle={() => onReplyToggle(post.id)}
              showReply={replyPostId === post.id}
              replyValue={replyDraft}
              onReplyChange={onReplyChange}
              onReplySubmit={(event) => onReplySubmit(event, post.id)}
              canReply={post.canReply !== false}
              replyAudience={post.replyAudience}
              isOwnPost={post.userId === currentUserId}
              onEdit={(text) => onEditPost(post.id, text)}
              onDelete={() => onDeletePost(post.id)}
              onPin={() => onPinPost(post.id)}
              isPinned={pinnedPostId === post.id}
              onVote={(optionId) => onVote(post.id, optionId)}
              hasVoted={pollVotes.has(post.id)}
              isOwnerPost={post.isOwnerPost}
              onView={() => onView(post.id)}
              replies={repliesByPostId?.[post.id] ?? []}
              isThreadOpen={expandedReplies?.has(post.id)}
              onToggleThread={() => onToggleReplies?.(post.id)}
              onOpenImage={onOpenImage}
            />
          ))}
        </div>
      ) : null}
    </div>
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











