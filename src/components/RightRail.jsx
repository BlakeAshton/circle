import { Search } from "lucide-react";

export default function RightRail({
  searchQuery,
  onSearchChange,
  users,
  following,
  onFollowToggle,
  currentUserId,
}) {
  const suggestions = users
    .filter((user) => user.id !== currentUserId && !following.has(user.id))
    .slice(0, 3);

  return (
    <aside className="right-rail">
      <div className="search glass rail-search">
        <Search className="rail-search-icon" aria-hidden="true" />
        <input
          type="text"
          placeholder="Search"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>
      <div className="rail-card glass">
        <h3>Who to follow</h3>
        <div className="trend-list">
          {suggestions.map((user) => (
            <div key={user.id} className="follow-item">
              <div>
                <p>{user.name}</p>
                <span>{user.handle}</span>
              </div>
              <button
                className="ghost"
                type="button"
                onClick={() => onFollowToggle(user.id)}
              >
                Follow
              </button>
            </div>
          ))}
          {suggestions.length === 0 ? (
            <span className="empty">You're following everyone here.</span>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
