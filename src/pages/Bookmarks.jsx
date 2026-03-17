import PostCard from "../components/PostCard";

export default function Bookmarks({
  posts,
  liked,
  reposted,
  onLike,
  onRepost,
  onShare,
  onOpenProfile,
  getAuthor,
  currentUserId,
  onEditPost,
  onDeletePost,
  onPinPost,
  pinnedPostId,
  onVote,
  pollVotes,
  onView,
  repliesByPostId,
  expandedReplies,
  onToggleReplies,
  onOpenImage,
}) {
  return (
    <div className="page-section">
      <h2>Bookmarks</h2>
      <div className="post-list">
        {posts.length === 0 ? (
          <p className="empty">No bookmarks yet.</p>
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
              onReplyToggle={() => {}}
              showReply={false}
              replyValue=""
              onReplyChange={() => {}}
              onReplySubmit={(event) => event.preventDefault()}
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
    </div>
  );
}
