import React from 'react';

/**
 * Props for the InitialGreeting component.
 */
interface InitialGreetingProps {
  /** The current language setting. */
  language: 'en' | 'ne';
}

/**
 * InitialGreeting Component
 *
 * Displays the initial welcome message in the chat interface.
 *
 * @param {InitialGreetingProps} props The component props.
 * @returns {JSX.Element} The rendered greeting component.
 */
const InitialGreeting: React.FC<InitialGreetingProps> = ({ language }) => {
  // Inline styles kept here for simplicity as they are specific to this element
  const headingStyle: React.CSSProperties = {
    fontSize: '28px',
    fontWeight: 500,
    marginBottom: '10px',
    textAlign: 'center',
    color: '#333',
    minHeight: '42px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: '1.5',
    padding: '0 10px'
  };

  const textSpanStyle: React.CSSProperties = {
    display: 'inline-block',
    textAlign: 'center'
  };

  return (
    <h2 style={headingStyle}>
      <span style={textSpanStyle}>
        {language === 'en' ? 'Hi, how can I help you today?' : 'नमस्ते, म तपाईंलाई कसरी सहयोग गर्न सक्छु?'}
      </span>
    </h2>
  );
};

export default InitialGreeting; 