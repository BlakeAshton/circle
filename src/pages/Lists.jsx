import { useState } from "react";

export default function Lists({ lists, onAddList, onRemoveList }) {
  const [name, setName] = useState("");

  return (
    <div className="page-section">
      <h2>Lists</h2>
      <form
        className="list-create glass"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) return;
          onAddList(name.trim());
          setName("");
        }}
      >
        <input
          type="text"
          placeholder="Create a new list"
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        <button className="primary" type="submit">
          Add
        </button>
      </form>
      <div className="list">
        {lists.map((item) => (
          <div key={item.id} className="list-item">
            <div>
              <p>{item.name}</p>
              <span>{item.members} members</span>
            </div>
            <button className="ghost" type="button" onClick={() => onRemoveList(item.id)}>
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
