import { X } from "lucide-react";
import { useEffect } from "react";
import PostComposer from "./PostComposer";
import ReplyAudienceSelector from "./ReplyAudienceSelector";

export default function ComposeModal({
  currentUser,
  composer,
  onComposerChange,
  composerImage,
  onImageSelect,
  onImageClear,
  onSubmit,
  onSaveDraft,
  onSchedule,
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
  replyAudience,
  onReplyAudienceChange,
  onClose,
  onOpenDrafts,
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose?.();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div className="compose-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="compose-modal-shell glass" onClick={(event) => event.stopPropagation()}>
        <div className="compose-modal-header">
          <button
            type="button"
            className="compose-modal-close"
            aria-label="Close composer"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
          <button
            type="button"
            className="compose-modal-link"
            onClick={() => {
              onOpenDrafts?.();
            }}
          >
            Drafts
          </button>
        </div>
        <PostComposer
          className="composer-inline compose-modal-composer"
          value={composer}
          onChange={onComposerChange}
          onSubmit={onSubmit}
          onSaveDraft={onSaveDraft}
          onSchedule={onSchedule}
          imageValue={composerImage}
          onImageSelect={onImageSelect}
          onImageClear={onImageClear}
          avatarUrl={currentUser?.avatar}
          avatarAlt={currentUser?.name ?? "Your avatar"}
          autoFocus
          scheduleEnabled={scheduleEnabled}
          onScheduleToggle={onScheduleToggle}
          scheduleTime={scheduleTime}
          onScheduleChange={onScheduleChange}
          pollEnabled={pollEnabled}
          onPollToggle={onPollToggle}
          pollQuestion={pollQuestion}
          onPollQuestionChange={onPollQuestionChange}
          pollOptions={pollOptions}
          onPollOptionsChange={onPollOptionsChange}
          onPollReset={onPollReset}
          extraTopContent={
            <ReplyAudienceSelector
              value={replyAudience}
              onChange={onReplyAudienceChange}
              className="compose-modal-reply-shell"
            />
          }
        />
      </div>
    </div>
  );
}
