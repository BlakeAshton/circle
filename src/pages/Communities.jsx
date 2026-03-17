export default function Communities({
  communities,
  joined,
  onToggleJoin,
  onCreate,
  draft,
  onDraftChange,
}) {
  return (
    <div className="page-section">
      <div className="page-header">
        <h2>Communities</h2>
      </div>
      <form
        className="glass community-form"
        onSubmit={(event) => {
          event.preventDefault();
          onCreate();
        }}
      >
        <label className="field">
          Community name
          <input
            type="text"
            value={draft.name}
            onChange={(event) =>
              onDraftChange({ ...draft, name: event.target.value })
            }
          />
        </label>
        <label className="field">
          Description
          <input
            type="text"
            value={draft.description}
            onChange={(event) =>
              onDraftChange({ ...draft, description: event.target.value })
            }
          />
        </label>
        <button className="primary" type="submit">
          Create community
        </button>
      </form>
      <div className="community-list">
        {communities.map((community) => {
          const isJoined = joined.has(community.id);
          return (
            <div key={community.id} className="glass community-card">
              <div>
                <h3>{community.name}</h3>
                <p>{community.description}</p>
                <span>{community.members.toLocaleString()} members</span>
              </div>
              <button
                className={isJoined ? "ghost" : "primary"}
                type="button"
                onClick={() => onToggleJoin(community.id)}
              >
                {isJoined ? "Joined" : "Join"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
