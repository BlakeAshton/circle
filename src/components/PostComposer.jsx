import { BarChart3, CalendarDays, ImagePlus } from "lucide-react";
import { useEffect, useRef } from "react";

export default function PostComposer({
  value,
  onChange,
  onSubmit,
  onSaveDraft,
  onSchedule,
  imageValue,
  onImageSelect,
  onImageClear,
  avatarUrl,
  avatarAlt,
  autoFocus,
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
  placeholder = "What's happening?",
  submitLabel = "Post",
  showExtras = true,
  className = "composer-inline",
  extraTopContent = null,
}) {
  const textareaRef = useRef(null);
  const maxChars = 280;
  const remaining = maxChars - value.length;
  const isOverLimit = remaining < 0;

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  return (
    <form className={className} onSubmit={onSubmit}>
      <div className="avatar">
        {avatarUrl ? <img src={avatarUrl} alt={avatarAlt} /> : null}
      </div>
      <div className="composer-body">
        <textarea
          ref={textareaRef}
          rows="2"
          placeholder={placeholder}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {extraTopContent}
        <div className="composer-actions">
          <div className="composer-icons">
            <label className="composer-tool" title="Add image">
              <input
                type="file"
                accept="image/*"
                onChange={(event) => onImageSelect(event.target.files?.[0])}
              />
              <ImagePlus aria-hidden="true" />
            </label>
            {showExtras ? (
              <>
                <button
                  className={pollEnabled ? "composer-tool active" : "composer-tool"}
                  type="button"
                  onClick={onPollToggle}
                  title="Create poll"
                >
                  <BarChart3 aria-hidden="true" />
                </button>
                <button
                  className={
                    scheduleEnabled ? "composer-tool active" : "composer-tool"
                  }
                  type="button"
                  onClick={onScheduleToggle}
                  title="Schedule post"
                >
                  <CalendarDays aria-hidden="true" />
                </button>
              </>
            ) : null}
            <span className={remaining < 0 ? "count over" : "count"}>
              {remaining}
            </span>
          </div>
          <div className="composer-buttons">
            {showExtras ? (
              <>
                <button className="text-button" type="button" onClick={onSaveDraft}>
                  Save draft
                </button>
                {scheduleEnabled ? (
                  <button
                    className="text-button"
                    type="button"
                    onClick={onSchedule}
                    disabled={isOverLimit}
                  >
                    Queue
                  </button>
                ) : null}
              </>
            ) : null}
            <button
              className="primary composer-submit"
              type="submit"
              disabled={isOverLimit}
            >
              {submitLabel}
            </button>
          </div>
        </div>
        {showExtras && pollEnabled ? (
          <div className="composer-poll">
            <label className="field">
              Poll question
              <input
                type="text"
                value={pollQuestion}
                onChange={(event) => onPollQuestionChange(event.target.value)}
              />
            </label>
            <div className="poll-options">
              {pollOptions.map((option, index) => (
                <input
                  key={index}
                  type="text"
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(event) => {
                    const next = [...pollOptions];
                    next[index] = event.target.value;
                    onPollOptionsChange(next);
                  }}
                />
              ))}
            </div>
            <div className="composer-poll-actions">
              <button
                className="ghost"
                type="button"
                onClick={() => onPollOptionsChange([...pollOptions, ""])}
              >
                Add option
              </button>
              <button className="ghost" type="button" onClick={onPollReset}>
                Clear poll
              </button>
            </div>
          </div>
        ) : null}
        {showExtras && scheduleEnabled ? (
          <div className="composer-schedule">
            <label className="field">
              Schedule time
              <input
                type="datetime-local"
                value={scheduleTime}
                onChange={(event) => onScheduleChange(event.target.value)}
              />
            </label>
          </div>
        ) : null}
        <div className="composer-media">
          {imageValue ? (
            <>
              <img src={imageValue} alt="Upload preview" />
              <button className="ghost" type="button" onClick={onImageClear}>
                Remove image
              </button>
            </>
          ) : null}
        </div>
      </div>
    </form>
  );
}
