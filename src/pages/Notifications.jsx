import FeedTabs from "../components/FeedTabs";

export default function Notifications({
  items,
  filter,
  onFilterChange,
  onToggleRead,
  onMarkAllRead,
}) {
  return (
    <div className="page-section">
      <div className="page-header">
        <h2>Notifications</h2>
        <button className="ghost" type="button" onClick={onMarkAllRead}>
          Mark all read
        </button>
      </div>
      <FeedTabs
        tabs={["All", "Like", "Repost", "Reply", "Follow"]}
        activeTab={filter}
        onChange={onFilterChange}
      />
      <div className="list">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={item.read ? "list-item" : "list-item unread"}
            onClick={() => onToggleRead(item.id)}
          >
            <p>{item.text}</p>
            <span>{item.time}</span>
          </button>
        ))}
        {items.length === 0 ? (
          <span className="empty">No notifications yet.</span>
        ) : null}
      </div>
    </div>
  );
}
