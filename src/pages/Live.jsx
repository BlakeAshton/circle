export default function Live({ lives, onGoLive, onToggleNotify, notified }) {
  return (
    <div className="page-section">
      <div className="page-header">
        <h2>Live</h2>
        <button className="primary" type="button" onClick={onGoLive}>
          Go live
        </button>
      </div>
      <div className="list">
        {lives.map((item) => (
          <div key={item.id} className="list-item">
            <div>
              <p>{item.title}</p>
              <span>
                {item.host} · {item.live ? "Live" : "Scheduled"}
              </span>
              <span>
                {item.live
                  ? `${item.viewers} watching`
                  : item.scheduled}
              </span>
            </div>
            <button
              className="ghost"
              type="button"
              onClick={() => onToggleNotify(item.id)}
            >
              {notified.has(item.id) ? "Notified" : "Remind me"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
