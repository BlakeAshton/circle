import { formatCount, formatTime } from "../utils/format";

export default function Explore({
  trends,
  users,
  searchQuery,
  onSearchChange,
  results,
  status,
  onOpenProfile,
}) {
  const query = searchQuery.trim().toLowerCase();
  const filteredTrends = query
    ? trends.filter((trend) => trend.tag.toLowerCase().includes(query))
    : trends;
  const filteredUsers = query ? results.users : users;
  const filteredPosts = query ? results.posts : [];

  return (
    <div className="page-section">
      <h2>Explore</h2>
      <div className="search glass">
        <input
          type="text"
          placeholder="Search creators or trends"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      {query ? (
        <div className="explore-results">
          <div className="glass explore-block">
            <h3>Creators</h3>
            <div className="list">
              {filteredUsers.map((user) => (
                <div key={user.id} className="list-item">
                  <p>
                    {user.name} <span>{user.handle}</span>
                  </p>
                  <span>{formatCount(user.followers)} followers</span>
                </div>
              ))}
              {filteredUsers.length === 0 ? (
                <span className="empty">
                  {status === "loading" ? "Searching..." : "No creators found."}
                </span>
              ) : null}
            </div>
          </div>
          <div className="glass explore-block">
            <h3>Posts</h3>
            <div className="list">
              {filteredPosts.map((post) => (
                <button
                  key={post.id}
                  type="button"
                  className="list-item"
                  onClick={() => onOpenProfile?.(post.userId)}
                >
                  <p>{post.text}</p>
                  <span>{formatTime(post.time)}</span>
                </button>
              ))}
              {filteredPosts.length === 0 ? (
                <span className="empty">
                  {status === "loading" ? "Searching..." : "No posts found."}
                </span>
              ) : null}
            </div>
          </div>
          <div className="glass explore-block">
            <h3>Trends</h3>
            <div className="trend-list">
              {filteredTrends.map((trend) => (
                <div key={trend.tag} className="trend-item">
                  <p>{trend.tag}</p>
                  <span>{trend.posts} posts</span>
                </div>
              ))}
              {filteredTrends.length === 0 ? (
                <span className="empty">No matching trends.</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : (
        <div className="trend-list">
          {trends.map((trend) => (
            <div key={trend.tag} className="trend-item">
              <p>{trend.tag}</p>
              <span>{trend.posts} posts</span>
            </div>
          ))}
          {trends.length === 0 ? (
            <span className="empty">No trends yet.</span>
          ) : null}
        </div>
      )}
    </div>
  );
}
