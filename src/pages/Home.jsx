import PostComposer from "../components/PostComposer";
import PostCard from "../components/PostCard";

export default function Home({
  activeFeed,
  onFeedChange,
  posts,
  liked,
  reposted,
  onLike,
  onRepost,
  onShare,
  onOpenProfile,
  composer,
  onComposerChange,
  composerImage,
  onImageSelect,
  onImageClear,
  onPost,
  onSaveDraft,
  drafts,
  onPostDraft,
  onDeleteDraft,
  scheduledPosts,
  onPostScheduled,
  onDeleteScheduled,
  onSchedule,
  scheduleEnabled,
  onScheduleToggle,
  scheduleTime,
  onScheduleChange,
  pollEnabled,
  onPollToggle,
  pollQuestion,
  onPollQuestionChange,
  pollOptions,
  onPollOptionsChange,
  onPollReset,
  getAuthor,
  focusComposer,
  replyPostId,
  replyDraft,
  onReplyToggle,
  onReplyChange,
  onReplySubmit,
  currentUser,
  currentUserId,
  onEditPost,
  onDeletePost,
  onPinPost,
  pinnedPostId,
  onVote,
  pollVotes,
  repliesByPostId,
  expandedReplies,
  onToggleReplies,
  onView,
  onOpenImage,
}) {
  return (
    <>
      <header className="feed-header">
        <div className="tabs">
          {["For you", "Following"].map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === activeFeed ? "tab active" : "tab"}
              onClick={() => onFeedChange(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </header>

      <PostComposer
        value={composer}
        onChange={onComposerChange}
        onSubmit={onPost}
        onSaveDraft={onSaveDraft}
        onSchedule={onSchedule}
        autoFocus={focusComposer}
        imageValue={composerImage}
        onImageSelect={onImageSelect}
        onImageClear={onImageClear}
        avatarUrl={currentUser?.avatar}
        avatarAlt={currentUser?.name ?? "Your avatar"}
        scheduleEnabled={scheduleEnabled}
        onScheduleToggle={onScheduleToggle}
        scheduleTime={scheduleTime}
        onScheduleChange={onScheduleChange}
        pollEnabled={pollEnabled}
        onPollToggle={onPollToggle}
        pollQuestion={pollQuestion}
        onPollQuestionChange={onPollQuestionChange}
        pollOptions={pollOptions}
        onPollOptionsChange={onPollOptionsChange}
        onPollReset={onPollReset}
      />

      {drafts.length > 0 ? (
        <div className="drafts glass">
          <div className="drafts-header">
            <h3>Drafts</h3>
            <span>{drafts.length} saved</span>
          </div>
          <div className="drafts-list">
            {drafts.map((draft) => (
              <div key={draft.id} className="draft-item">
                <p>{draft.text}</p>
                <div className="draft-actions">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => onPostDraft(draft.id)}
                  >
                    Post
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => onDeleteDraft(draft.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {scheduledPosts.length > 0 ? (
        <div className="drafts glass">
          <div className="drafts-header">
            <h3>Scheduled</h3>
            <span>{scheduledPosts.length} queued</span>
          </div>
          <div className="drafts-list">
            {scheduledPosts.map((post) => (
              <div key={post.id} className="draft-item">
                <p>{post.text}</p>
                <span>Scheduled for {post.time}</span>
                <div className="draft-actions">
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => onPostScheduled(post.id)}
                  >
                    Post now
                  </button>
                  <button
                    className="ghost"
                    type="button"
                    onClick={() => onDeleteScheduled(post.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="post-list">
        {posts.length === 0 ? (
          <p className="empty">No posts yet. Create the first moment.</p>
        ) : (
          posts.map((post) => (
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
          ))
        )}
      </div>
    </>
  );
}
