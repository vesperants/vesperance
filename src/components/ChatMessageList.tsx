import React from 'react';
import ReactMarkdown from 'react-markdown';
import styles from '@/app/chat/chat.module.css'; // Import shared chat styles
import type { /* TranslationKey, */ translations } from '@/constants/translations'; // Assuming translations type and object are exported

// Define the structure for a chat message (can be moved to a shared types/models file later)
interface ChatMessage {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  id?: string;
}

/**
 * Props for the ChatMessageList component.
 */
interface ChatMessageListProps {
  /** The array of chat messages to display. */
  chatHistory: ChatMessage[];
  /** Indicates if the chat canvas is currently shown (affects layout). */
  showCanvas?: boolean;
  /** The current language setting. */
  language: 'en' | 'ne';
  /** The translations object. */
  translations: typeof translations;
  /** Indicates if the bot is currently replying (for typing indicator). */
  isBotReplying: boolean;
  /** Ref indicating if typing animation should stop. */
  stopTypingRef: React.RefObject<boolean>;
  /** Ref to the scrollable chat container div in the parent. */
  chatContainerRef: React.RefObject<HTMLDivElement | null>;
}

/**
 * ChatMessageList Component
 *
 * Renders the scrollable list of chat messages and the typing indicator.
 *
 * @param {ChatMessageListProps} props The component props.
 * @returns {JSX.Element} The rendered message list component.
 */
const ChatMessageList: React.FC<ChatMessageListProps> = ({
  chatHistory,
  showCanvas = false,
  language,
  translations,
  isBotReplying,
  stopTypingRef,
  chatContainerRef
}) => {
  return (
    <div
      ref={chatContainerRef} // Attach the ref passed from the parent
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: '20px',
        paddingBottom: '100px',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#fff',
        // Opacity/transition related to isInitialState is managed by the parent
      }}
    >
      {/* Message wrapper div */}
      <div style={{
        width: '100%',
        maxWidth: showCanvas ? 'none' : '750px',
        margin: showCanvas ? '0' : '0 auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Map through chat history */}
        {chatHistory.map((chat, index) => {
          const isUser = chat.sender === 'user';
          return (
            <div key={chat.id || index} style={{ display: 'flex', justifyContent: isUser ? 'flex-end' : 'flex-start', marginBottom: '10px' }}>
              <div className={isUser ? styles.userMessageBubble : styles.botMessageBubble}>
                <span className={styles.messageSender} style={{ color: isUser ? '#007bff' : '#555' }}>
                  {isUser ? translations.you[language] : translations.botName[language]}
                </span>
                <div className={styles.messageText}>
                  {isUser ? (
                    <span>{chat.text}</span>
                  ) : (
                    // Markdown components for bot messages
                    <ReactMarkdown components={{
                      p: ({ ...props }) => <p style={{ marginBlockStart: '0.1em', marginBlockEnd: '0.1em' }} {...props} />,
                      ul: ({ ...props }) => <ul style={{ marginBlockStart: '0.5em', marginBlockEnd: '0.5em', paddingInlineStart: '20px' }} {...props} />,
                      li: ({ ...props }) => <li style={{ marginBlockStart: '0.1em', marginBlockEnd: '0.1em' }} {...props} />,
                      // Add rule to render nothing for horizontal rules
                      hr: () => <></> 
                    }}>
                      {chat.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {isBotReplying && !stopTypingRef.current && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.sender === 'bot' && (
          <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
            <div style={{ /* Maybe create a class for this wrapper */ }}>
              <p className={styles.messageText} style={{ margin: 0 }}>
                {translations.botTyping[language] || 'Typing...'}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessageList; 