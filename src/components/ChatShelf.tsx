'use client';

import React from 'react';
import styles from './ChatShelf.module.css'; // Create a corresponding CSS module
import chatStyles from '@/app/chat/chat.module.css'; // Import chat styles for button
import { useLanguage } from '@/context/LanguageContext'; // Import for translation
import { translations } from '@/constants/translations'; // Import for translation

/**
 * Props for the ChatShelf component.
 */
interface ChatShelfProps {
  /** Whether the shelf is currently open/visible. */
  isOpen: boolean;
  /** Function to call to toggle the shelf state. */
  onClose?: () => void; // Rename to onToggle or keep as onClose if it only closes
}

/**
 * ChatShelf Component
 *
 * A collapsible sidebar for the chat interface.
 *
 * @param {ChatShelfProps} props The component props.
 * @returns {JSX.Element | null} The rendered shelf component or null if not open.
 */
const ChatShelf: React.FC<ChatShelfProps> = ({ isOpen, onClose }) => {
  const { language } = useLanguage(); // Get language for tooltip

  if (!isOpen) {
    return null; // Don't render anything if closed
  }

  return (
    <div className={styles.shelfContainer} aria-hidden={!isOpen}>
      {/* Shelf Header */}
      <div className={styles.shelfHeader}>
        {/* Add Toggle Button Here */} 
        <button
          onClick={onClose} // Use the passed function to toggle/close
          className={chatStyles.headerButton} // Reuse style from chat header
          title={translations.toggleShelf[language] || "Toggle Menu"} 
          style={{ 
            padding: '10px', 
            position: 'absolute', // Position relative to shelf header
            top: '15px', // Adjust as needed
            left: '15px' // Adjust as needed
          }}
        >
          {/* Same SVG Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
            <line x1="9" x2="9" y1="3" y2="21"></line>
          </svg>
        </button>
        
        {/* Adjust title positioning if needed due to button */}
        <h2 style={{ textAlign: 'center', marginLeft: '40px' /* Example offset */ }}>Conversations</h2> 
      </div>

      {/* Shelf Content */}
      <div className={styles.shelfContent}>
        {/* Placeholder for chat history list or other content */}
        <p>Chat history will appear here.</p>
        <ul>
          <li>Conversation 1</li>
          <li>Conversation 2</li>
          <li>Conversation 3</li>
        </ul>
      </div>

      {/* Shelf Footer (Optional) */}
      {/* <div className={styles.shelfFooter}>
        Footer Content
      </div> */}
    </div>
  );
};

export default ChatShelf; 