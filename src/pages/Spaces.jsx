export default function Spaces({ spaces, onStart, onToggleJoin, joined }) {
  return (
    <div className="page-section">
      <div className="page-header">
        <h2>Spaces</h2>
        <button className="primary" type="button" onClick={onStart}>
          Start a space
        </button>
      </div>
      <div className="list">
        {spaces.map((space) => (
          <div key={space.id} className="list-item">
            <div>
              <p>{space.title}</p>
              <span>
                Host: {space.host} · {space.live ? "Live" : "Scheduled"}
              </span>
              <span>
                {space.live
                  ? `${space.listeners} listening`
                  : space.scheduled}
              </span>
            </div>
            <button
              className="ghost"
              type="button"
              onClick={() => onToggleJoin(space.id)}
            >
              {joined.has(space.id) ? "Leave" : "Join"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
