import React, { useRef } from 'react';
import styles from '@/app/chat/chat.module.css'; // Import CSS Module

/**
 * Defines the structure for a selected file within the input area.
 */
interface SelectedFile {
  file: File;
  id: string;
}

/**
 * Props for the ChatInputArea component.
 */
interface ChatInputAreaProps {
  /** The current message text in the input. */
  message: string;
  /** Function to update the message text. */
  setMessage: (message: string) => void;
  /** Function called when the form is submitted. */
  handleSendMessage: (e: React.FormEvent) => void;
  /** Function called when the stop button is clicked. */
  handleStopGenerating: () => void;
  /** Function called when the input detects a key down event. */
  handleKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  /** Function to handle file selection changes. */
  handleFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Function to remove a selected file by its ID. */
  removeSelectedFile: (id: string) => void;
  /** Function to toggle the canvas view (example prop). */
  setShowCanvas?: (show: boolean) => void;
  /** Array of currently selected files. */
  selectedFiles: SelectedFile[];
  /** Indicates if the bot is currently replying. */
  isBotReplying: boolean;
  /** The placeholder text for the textarea. */
  placeholder: string;
}

/**
 * ChatInputArea Component
 *
 * Renders the message input area at the bottom of the chat interface,
 * including file previews, textarea, and action buttons (send/stop, attach).
 *
 * @param {ChatInputAreaProps} props The component props.
 * @returns {JSX.Element} The rendered input area component.
 */
const ChatInputArea: React.FC<ChatInputAreaProps> = ({
  message,
  setMessage,
  handleSendMessage,
  handleStopGenerating,
  handleKeyDown,
  handleFileChange,
  removeSelectedFile,
  setShowCanvas,
  selectedFiles,
  isBotReplying,
  placeholder,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Function to handle auto-resizing the textarea
  const handleTextareaInput = (e: React.FormEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    target.style.height = '40px'; // Reset height first
    const newHeight = Math.min(target.scrollHeight, 220); // Match maxHeight
    target.style.height = `${newHeight}px`;
  };

  // Determine if send button should be disabled
  const isSendDisabled = (!message.trim() && selectedFiles.length === 0) || isBotReplying;

  return (
    <div className={styles.inputAreaWrapper}>
      {/* Display Selected Files */} 
      {selectedFiles.length > 0 && (
        <div className={styles.selectedFilesContainer}>
          {selectedFiles.map((fileEntry) => (
            <div key={fileEntry.id} className={styles.selectedFileItem}>
              <span className={styles.selectedFileName}>{fileEntry.file.name}</span>
              <button
                onClick={() => removeSelectedFile(fileEntry.id)}
                className={styles.removeFileButton}
                title="Remove file"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Form */} 
      <div className={styles.inputFormWrapper}>
        <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', alignItems: 'center', position: 'relative' }}>
          <div style={{ flex: 1, margin: '6px 0', position: 'relative', display: 'flex', alignItems: 'center' }}>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (setShowCanvas) {
                  setShowCanvas(e.target.value.trim().toLowerCase() === 'canvas');
                }
              }}
              className={styles.textareaBase}
              style={{
                borderRadius: selectedFiles.length > 0 ? '0 0 26px 26px' : '26px',
              }}
              placeholder={placeholder}
              autoFocus
              rows={1}
              onKeyDown={handleKeyDown}
              onInput={handleTextareaInput}
            />
          </div>
          
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileChange}
            accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.csv,text/csv,.txt,text/plain,.html,.htm,text/html,.odt,application/vnd.oasis.opendocument.text,.rtf,application/rtf,text/rtf,.epub,application/epub+zip"
            multiple
          />
          
          {/* Attachment Button */}
          <button
            type="button"
            className={styles.iconButton}
            style={{ left: 'auto', right: '56px' }}
            onClick={() => fileInputRef.current?.click()}
            disabled={isBotReplying}
            title="Upload images or docs"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
            </svg>
          </button>
          
          {/* Send/Stop Button Container */} 
          <div className={styles.sendStopButtonContainer}>
            {isBotReplying ? (
              <button
                type="button"
                onClick={handleStopGenerating}
                className={styles.stopButton}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#757575" xmlns="http://www.w3.org/2000/svg"> <rect width="24" height="24" rx="4" ry="4" /> </svg>
              </button>
            ) : (
              <button
                type="submit"
                className={`${styles.sendButton} ${isSendDisabled ? styles.sendButtonDisabled : ''}`}
                disabled={isSendDisabled}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> <path d="M5 11L12 4L19 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/> </svg>
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default ChatInputArea; 