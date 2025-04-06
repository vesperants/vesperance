import React from 'react';
import styles from '@/app/chat/chat.module.css'; // Import CSS Module
import Image from 'next/image'; // Import Image for profile picture
// import { LanguageToggleSwitch } from './LanguageToggleSwitch'; // LanguageToggleSwitch is passed as children, so direct import is unused
// import { useAuth } from '@/context/AuthContext'; // REMOVED: Not needed here
import { useLanguage } from '@/context/LanguageContext'; // RE-ENABLED: Needed for translations
import { translations } from '@/constants/translations'; // RE-ENABLED: Needed for translations

/**
 * Props for the ChatHeader component.
 */
interface ChatHeaderProps {
  /** The title to display in the header. */
  title: string;
  /** Optional children to render between Sign Out and Profile (e.g., language toggle). */
  children?: React.ReactNode;
  /** Optional function to call when the profile button is clicked. If provided, the profile button is shown. */
  onProfileClick?: () => void;
  /** Optional URL for the profile image. Defaults to a standard icon. */
  profileImageUrl?: string | null;
  /** Function to call when the shelf toggle button is clicked. */
  onToggleShelfClick?: () => void;
  /** Indicates if the shelf is currently open */
  isShelfOpen?: boolean;
}

/**
 * ChatHeader Component
 *
 * Displays the top bar for the chat interface, including a shelf toggle button,
 * title, profile button, and other children elements (like language toggle).
 *
 * @param {ChatHeaderProps} props The component props.
 * @returns {JSX.Element} The rendered header component.
 */
const ChatHeader: React.FC<ChatHeaderProps> = ({ title, children, onProfileClick, profileImageUrl, onToggleShelfClick, isShelfOpen }) => {
  const { language } = useLanguage(); // RE-ENABLED: Get current language for button text
  const defaultProfileImage = "/default-profile.png"; // Default image path

  return (
    <div className={styles.fixedHeightHeader} style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between', // Space out items
      padding: '15px 20px',
      borderBottom: '1px solid #e6e6e6',
      backgroundColor: '#fff',
      position: 'relative',
    }}>
      {/* Left Section: Shelf Toggle Button (only shown if shelf is closed) */}
      <div style={{ minWidth: '45px', display: 'flex', justifyContent: 'flex-start' }}>
        {/* Conditionally render based on isShelfOpen */}
        {onToggleShelfClick && !isShelfOpen && (
          <button
            onClick={onToggleShelfClick}
            className={styles.headerButton} 
            title={translations.toggleShelf[language] || "Toggle Menu"}
            style={{ padding: '10px' }}
          >
            {/* SVG Icon */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="18" x="3" y="3" rx="2" ry="2"></rect>
              <line x1="9" x2="9" y1="3" y2="21"></line>
            </svg>
          </button>
        )}
      </div>

      {/* Center Section: Title */}
      <h1 className={styles.headerTitle} style={{ textAlign: 'center', margin: 0 /* Remove default margins */ }}>
        <span>{title}</span>
      </h1>

      {/* Right Section: Language Toggle (Children) and Profile Button */}
      <div style={{ minWidth: '45px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '15px' /* Space between toggle and profile */ }}>
        {children} {/* Language Toggle */}

        {/* Profile Button */}
        {onProfileClick && (
          <button
            onClick={onProfileClick}
            style={{
              background: 'none', border: 'none', padding: '0', cursor: 'pointer',
              borderRadius: '50%', overflow: 'hidden',
              width: '40px', height: '40px', // Standard size
              display: 'flex', // Use flex to center image if needed
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={translations.editProfileTooltip[language] || 'Edit Profile'} // Use translation
          >
            <Image
              src={profileImageUrl || defaultProfileImage}
              alt="Profile"
              width={40} // Match button size
              height={40} // Match button size
              style={{ display: 'block', borderRadius: '50%' }} // Ensure image is round too
            />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatHeader; 