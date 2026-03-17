export default function FeedTabs({ tabs, activeTab, onChange }) {
  return (
    <div className="feed-tabs glass">
      {tabs.map((tab) => (
        <button
          key={tab}
          type="button"
          className={tab === activeTab ? "tab active" : "tab"}
          onClick={() => onChange(tab)}
        >
          {tab}
        </button>
      ))}
    </div>
  );
}
