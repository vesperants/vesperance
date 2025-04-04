'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { LanguageToggleSwitch } from '@/components/LanguageToggleSwitch';
import { ChatCanvas } from '@/components/ChatCanvas';

// CSS styles to help prevent layout shifts across languages
const fixedHeightStyles = {
  backButton: {
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    padding: 0
  },
  title: {
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  header: {
    height: '60px',
    boxSizing: 'border-box' as 'border-box'
  },
  messageText: {
    minHeight: '24px'
  },
  inputText: {
    minHeight: '24px'
  }
};

export default function ChatPage() {
  const { user, loading } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string, timestamp: Date}[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [isBotReplying, setIsBotReplying] = useState(false);

  // Protect route - redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;
    if (!user || !user.emailVerified) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();
    if (!currentMessage) return;

    // Add user message to chat history immediately
    const userMessageEntry = {
      sender: 'user',
      text: currentMessage,
      timestamp: new Date()
    };
    setChatHistory(prevChatHistory => [...prevChatHistory, userMessageEntry]);

    // Clear input field and reset textarea height
    setMessage('');
    const form = e.currentTarget as HTMLFormElement;
    const textarea = form.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '40px'; // Reset to initial height
    }

    setIsBotReplying(true); // Indicate bot is thinking

    try {
      // Call the backend API endpoint
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: currentMessage }),
      });

      if (!response.ok) {
        // Handle HTTP errors (e.g., 500 Internal Server Error)
        console.error('API Error:', response.status, response.statusText);
        const errorText = await response.text(); // Attempt to get error details
        setChatHistory(prevChatHistory => [
          ...prevChatHistory,
          {
            sender: 'bot',
            text: `Error: ${response.statusText || 'Failed to get response'}. ${errorText ? `Details: ${errorText}`: ''}`,
            timestamp: new Date()
          }
        ]);
        return; // Exit the function after handling error
      }

      // Parse the JSON response from the API
      const data = await response.json();
      const botReply = data.reply;

      // Add bot's reply to chat history
      setChatHistory(prevChatHistory => [
        ...prevChatHistory,
        {
          sender: 'bot',
          text: botReply,
          timestamp: new Date()
        }
      ]);

    } catch (error) {
      // Handle network errors or issues with fetch/JSON parsing
      console.error('Failed to send message or parse response:', error);
      setChatHistory(prevChatHistory => [
        ...prevChatHistory,
        {
          sender: 'bot',
          text: translations.errorMessage[language] || 'Sorry, something went wrong.',
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsBotReplying(false); // Bot has finished replying (or failed)
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter key press unless Shift is held
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent newline
      // Manually trigger the form submission
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
  };

  // Loading state
  if (loading || !language || (!loading && (!user || !user.emailVerified))) {
    const loadingText = language ? translations.loadingOrAccessDenied[language] : 'Loading...';
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="container" style={{textAlign: 'center'}}>{loadingText}</div>
      </div>
    );
  }

  // Main return with conditional layout
  return (
    <div style={{ 
      display: 'flex', 
      height: '100vh', 
      width: '100vw',
      overflow: 'hidden' // Prevent overflow on the main container
    }}>
      {/* Left half - Chat interface */}
      <div style={{ 
        flex: showCanvas ? '0 0 50%' : '1', // Takes 50% width if canvas is shown, else full width
        display: 'flex', 
        flexDirection: 'column', 
        height: '100%',
        overflow: 'hidden', // Prevent overflow within left half
        backgroundColor: '#fff',
        position: 'relative',
        zIndex: 1000
      }}>
        {/* Header remains the same, always visible */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          padding: '15px 20px',
          borderBottom: '1px solid #e6e6e6',
          backgroundColor: '#fff',
          position: 'relative',
          ...fixedHeightStyles.header
        }}>
          {/* Header content (back button, title, toggle) */}
          <div style={{ width: '45px', height: '28px' }}>
            <button onClick={() => router.push('/home')} style={{...styles.headerButton, ...fixedHeightStyles.backButton}}>
              <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>←&nbsp;{translations.backButton[language]}</span>
            </button>
          </div>
          <h1 style={{...styles.headerTitle, ...fixedHeightStyles.title}}>
            <span style={{ display: 'inline-block' }}>{translations.chatTitle[language]}</span>
          </h1>
          <div style={{...styles.headerToggleContainer}}>
            <LanguageToggleSwitch />
          </div>
        </div>

        {/* Conditional rendering: Empty state vs Active chat state */}
        {chatHistory.length === 0 ? (
          // Empty state view: Centered greeting and input
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: '0 20px' }}>
            <h2 style={{
              fontSize: '28px', 
              fontWeight: '500',
              marginBottom: '30px',
              textAlign: 'center',
              color: '#333',
              minHeight: '42px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: '1.5',
              padding: '0 10px'
            }}>
              <span style={{ display: 'inline-block', textAlign: 'center' }}>
                {language === 'en' ? 'Hi, how can I help you today?' : 'नमस्ते, म तपाईंलाई कसरी सहयोग गर्न सक्छु?'}
              </span>
            </h2>
            {/* Input container (reusing the same structure as bottom input) */}
            <div style={{ width: '100%', maxWidth: '750px', padding: 0, borderRadius: '26px', backgroundColor: '#f5f5f5', border: '1px solid #ddd', boxShadow: '0 2px 6px rgba(0,0,0,0.1)', display: 'flex', overflow: 'visible', position: 'relative' }}>
              <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', alignItems: 'flex-start', position: 'relative' }}>
                <div style={{ flex: 1, margin: '6px 0', position: 'relative' }}>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = '40px';
                      const newHeight = Math.min(target.scrollHeight, 220);
                      target.style.height = `${newHeight}px`;
                      setShowCanvas(e.target.value.trim().toLowerCase() === 'canvas');
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 20px', 
                      paddingRight: '70px',
                      border: 'none',
                      outline: 'none',
                      fontSize: '16px',
                      backgroundColor: '#f5f5f5',
                      color: '#555',
                      borderRadius: '26px',
                      resize: 'none',
                      minHeight: '40px',
                      maxHeight: '220px',
                      overflow: 'auto',
                      lineHeight: '1.5',
                      boxSizing: 'border-box',
                    }}
                    placeholder={translations.typeMessage[language]}
                    autoFocus
                    rows={1}
                    onKeyDown={handleKeyDown}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      if (target.scrollHeight > target.clientHeight) {
                        target.style.height = 'auto';
                        const newHeight = Math.min(target.scrollHeight, 220);
                        target.style.height = `${newHeight}px`;
                      }
                    }}
                  />
                </div>
                <div style={{ position: 'absolute', right: '8px', bottom: '10px', zIndex: 2 }}>
                  <button 
                    type="submit" 
                    style={{
                      ...styles.sendButton,
                      backgroundColor: (!message.trim() || isBotReplying) ? '#A4C2F4' : '#4285F4',
                      cursor: (!message.trim() || isBotReplying) ? 'not-allowed' : 'pointer',
                      boxShadow: (!message.trim() || isBotReplying) ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                    }} 
                    disabled={!message.trim() || isBotReplying}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M5 11L12 4L19 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          // Active chat view: Messages and bottom input
          <>
            {/* Chat messages container */}
            <div style={{ 
              flex: 1, 
              overflowY: 'auto',
              overflowX: 'hidden',
              padding: '20px',
              display: 'flex',
              flexDirection: 'column',
              backgroundColor: '#fff'
            }}>
              {/* Wrapper div for messages (adjust width if canvas shown) */}
              <div style={{
                width: '100%',
                maxWidth: showCanvas ? 'none' : '750px',
                margin: showCanvas ? '0' : '0 auto',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {chatHistory.map((chat, index) => {
                  const isUser = chat.sender === 'user';
                  const messageStyle: React.CSSProperties = {
                    padding: '12px 16px',
                    marginBottom: '12px',
                    wordWrap: 'break-word',
                    overflowWrap: 'break-word',
                    whiteSpace: 'pre-wrap',
                    lineHeight: '1.4',
                    fontSize: '15px',
                    color: '#333',
                    ...fixedHeightStyles.messageText,
                    backgroundColor: isUser ? '#e3f2fd' : 'transparent',
                    borderRadius: isUser ? '18px' : '0',
                    boxShadow: isUser ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    maxWidth: isUser ? '80%' : '100%',
                    marginLeft: isUser ? 'auto' : '0',
                    marginRight: isUser ? '0' : 'auto',
                  };

                  return (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginBottom: '10px'
                    }}>
                      <div style={messageStyle}>
                        <span style={{...styles.messageSender, color: isUser ? '#007bff' : '#555'}}>
                          {isUser ? translations.you[language] : translations.botName[language]}
                        </span>
                        <p style={{...styles.messageText, ...fixedHeightStyles.messageText, margin: '4px 0 0'}}>
                          {chat.text}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {/* Optional: Add a loading indicator when bot is replying */}
                {isBotReplying && (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-start',
                    marginBottom: '10px'
                  }}>
                    <div style={{
                      padding: '12px 16px',
                      borderRadius: '18px',
                      backgroundColor: '#f0f0f0',
                      color: '#555',
                      maxWidth: '70%',
                      alignSelf: 'flex-start',
                      borderBottomLeftRadius: '4px',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}>
                      <p style={{...styles.messageText, ...fixedHeightStyles.messageText, margin: 0 }}>
                        {translations.botTyping[language] || 'Typing...'}
                      </p>
                    </div>
                  </div>
                )}
              </div> {/* End of message wrapper div */}
            </div>

            {/* Fixed message input at bottom */}
            <div style={{ 
              padding: '15px 20px',
              backgroundColor: '#fff',
              display: 'flex',
              justifyContent: 'center'
            }}>
              {/* Input container (adjust width if canvas shown) */}
              <div style={{
                width: '100%',
                maxWidth: showCanvas ? 'none' : '750px',
                padding: 0,
                borderRadius: '26px',
                backgroundColor: '#f5f5f5',
                border: '1px solid #ddd',
                boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                display: 'flex',
                overflow: 'visible',
                position: 'relative'
              }}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', alignItems: 'flex-start', position: 'relative' }}>
                  <div style={{ flex: 1, margin: '6px 0', position: 'relative' }}>
                    <textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = '40px';
                        const newHeight = Math.min(target.scrollHeight, 220);
                        target.style.height = `${newHeight}px`;
                        setShowCanvas(e.target.value.trim().toLowerCase() === 'canvas');
                      }}
                      style={{
                        width: '100%',
                        padding: '8px 20px', 
                        paddingRight: '70px',
                        border: 'none',
                        outline: 'none',
                        fontSize: '16px',
                        backgroundColor: '#f5f5f5',
                        color: '#555',
                        borderRadius: '26px',
                        resize: 'none',
                        minHeight: '40px',
                        maxHeight: '220px',
                        overflow: 'auto',
                        lineHeight: '1.5',
                        boxSizing: 'border-box',
                      }}
                      placeholder={translations.typeMessage[language]}
                      autoFocus
                      rows={1}
                      onKeyDown={handleKeyDown}
                      onInput={(e) => {
                        const target = e.target as HTMLTextAreaElement;
                        if (target.scrollHeight > target.clientHeight) {
                          target.style.height = 'auto';
                          const newHeight = Math.min(target.scrollHeight, 220);
                          target.style.height = `${newHeight}px`;
                        }
                      }}
                    />
                  </div>
                  <div style={{ position: 'absolute', right: '8px', bottom: '10px', zIndex: 2 }}>
                    <button 
                      type="submit" 
                      style={{
                        ...styles.sendButton,
                        backgroundColor: (!message.trim() || isBotReplying) ? '#A4C2F4' : '#4285F4',
                        cursor: (!message.trim() || isBotReplying) ? 'not-allowed' : 'pointer',
                        boxShadow: (!message.trim() || isBotReplying) ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                      }} 
                      disabled={!message.trim() || isBotReplying}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M5 11L12 4L19 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </>
        )}
      </div> {/* End of Left half - Chat interface */}

      {/* Right half - Canvas (only shown if showCanvas is true) */}
      {showCanvas && <ChatCanvas />}
    </div> // End of main flex container
  );
}

// Define styles object to avoid repetition and potential errors
const styles: {[key: string]: React.CSSProperties} = {
  headerButton: {
    backgroundColor: 'transparent',
    color: '#666',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
  },
  headerTitle: {
    position: 'absolute' as 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '18px', 
    fontWeight: 600,
    textAlign: 'center' as 'center',
    color: '#333',
    margin: 0,
    width: 'auto',
  },
  headerToggleContainer: {
    marginLeft: 'auto',
    height: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  sendButton: {
    backgroundColor: '#4285F4', // Google blue
    color: 'white',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    fontSize: '18px',
    fontWeight: 'bold',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: '0',
    boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
    transform: 'translateY(0)',
    position: 'relative',
    overflow: 'hidden'
  },
  messageSender: {
    fontWeight: 'bold',
    marginRight: '8px'
  },
  messageText: {
    ...fixedHeightStyles.messageText
  }
}; 