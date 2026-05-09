import { useStore } from '@nanostores/preact';
import { feedbackStore, feedbackToneStore, updateFeedback } from '@stores/feedback';

export function Feedback() {
  const feedback = useStore(feedbackStore);
  const feedbackTone = useStore(feedbackToneStore);

  const feedbackStyles = feedbackTone === "error" ? "bg-error-container text-on-error-container" : "bg-tertiary-container text-on-tertiary-container";

  const handleClose = () => {
    updateFeedback("", "info");
  }

  return (
    feedback && (
      <div id="feedback-msg" className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-2xl w-full mx-auto px-4 rounded-lg p-4 text-sm font-medium shadow-lg transition-all duration-300 ${feedbackStyles}`}>
        <div className="flex items-center justify-between gap-4">
          <span>{feedback}</span>
          <button type="button" onClick={handleClose} className="text-lg leading-none font-bold opacity-70 hover:opacity-100 transition-opacity">&times;</button>
        </div>
      </div>
    )
  );
}

