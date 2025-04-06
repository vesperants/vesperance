'use client';

import React, { CSSProperties, useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/lib/translations';
import { LanguageToggleSwitch } from '@/components/LanguageToggleSwitch';
import { ChatCanvas } from '@/components/ChatCanvas';
import ReactMarkdown from 'react-markdown';
import type { Content } from '@google/genai';

// Define type for selected file state
interface SelectedFile {
  file: File;
  id: string; // Unique ID for key prop and removal
}

// CSS styles to help prevent layout shifts across languages
const fixedHeightStyles: { [key: string]: CSSProperties } = {
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
    boxSizing: 'border-box'
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
  const [chatHistory, setChatHistory] = useState<{sender: string, text: string, timestamp: Date, id?: string}[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]); // State for selected files
  const [showCanvas, setShowCanvas] = useState(false);
  const [isBotReplying, setIsBotReplying] = useState(false);
  const [typingSpeed] = useState(20); // milliseconds per character
  const [isInitialState, setIsInitialState] = useState(true); // State for initial view vs active chat
  
  // Reference to the AbortController to allow cancelling the fetch request
  const abortControllerRef = useRef<AbortController | null>(null);
  // Reference to signal the typing animation loop to stop
  const stopTypingRef = useRef<boolean>(false);
  // Reference to the chat messages container for scrolling
  const chatContainerRef = useRef<HTMLDivElement>(null);
  // Reference to the hidden file input
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // Protect route - redirect to login if not authenticated
  useEffect(() => {
    if (loading) return;
    if (!user || !user.emailVerified) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Effect to auto-scroll to bottom when a new user message is added
  useEffect(() => {
    // Only scroll if there's at least one message in history
    if (chatHistory.length > 0) {
      // Get the last message
      const lastMessage = chatHistory[chatHistory.length - 1];
      
      console.log("Chat updated. Last message from:", lastMessage.sender);
      
      // Check if the last message is from the user (not the bot)
      if (lastMessage.sender === 'user') {
        console.log("Scrolling to latest user message...");
        // Scroll the chat container to the bottom with smooth behavior
        if (chatContainerRef.current) {
          console.log("Chat container ref found, scrolling to:", chatContainerRef.current.scrollHeight);
          chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: 'smooth'
          });
        } else {
          console.log("Chat container ref is null");
        }
      }
    }
  }, [chatHistory]); // Re-run whenever chatHistory changes

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();
    // Require either a message or a file to send
    if (!currentMessage && selectedFiles.length === 0) return;

    // TODO: Read selectedFiles as base64 and include in payload
    console.log("Selected files on send:", selectedFiles); // Placeholder

    // Reset stop flag for the new message
    stopTypingRef.current = false;

    // --- Trigger animation on first message ---
    if (isInitialState) {
        setIsInitialState(false); // This will trigger the CSS transitions
    }
    // --- End animation trigger ---

    // Create and store AbortController for this request
    const controller = new AbortController();

    // Add user message to chat history immediately
    const userMessageEntry = {
      sender: 'user',
      text: currentMessage,
      timestamp: new Date()
    };
    setChatHistory(prevChatHistory => [...prevChatHistory, userMessageEntry]);
    
    // Manual scroll after adding user message - more direct approach
    setTimeout(() => {
      if (chatContainerRef.current) {
        console.log("Direct scroll after user message");
        chatContainerRef.current.scrollTo({
          top: chatContainerRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }
    }, 100); // Small delay to ensure the DOM has updated

    // Clear input field and reset textarea height
    setMessage('');
    setSelectedFiles([]); // Clear selected files after sending
    const form = e.currentTarget as HTMLFormElement;
    const textarea = form.querySelector('textarea');
    if (textarea) {
      textarea.style.height = '40px'; // Reset to initial height
    }

    setIsBotReplying(true); // Indicate bot is thinking

    // Create an empty bot response placeholder FIRST
    const botResponseId = Date.now().toString(); // Unique ID for this response
    setChatHistory(prevChatHistory => [
      ...prevChatHistory,
      {
        sender: 'bot',
        text: '', // Start with empty text
        timestamp: new Date(),
        id: botResponseId // Use the ID
      }
    ]);

    // --- Prepare data for API ---
    // Convert selected files to base64 (this needs to be async)
    const fileDataPromises = selectedFiles.map(fileEntry => {
      return new Promise<{ data: string; mimeType: string }>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // Result is Data URL (e.g., data:image/jpeg;base64,ABC...), extract base64 part
          const base64String = (reader.result as string).split(',')[1];
          if (base64String) {
            resolve({ data: base64String, mimeType: fileEntry.file.type });
          } else {
            reject(new Error(`Failed to read file ${fileEntry.file.name}`));
          }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(fileEntry.file); // Read as Data URL
      });
    });

    let filesPayload: { data: string; mimeType: string }[] = [];
    try {
        filesPayload = await Promise.all(fileDataPromises);
        console.log("Successfully converted files to base64");

        // --- Now make the API call ---
        const historyForApi = chatHistory
          .filter(msg => msg.sender !== 'bot' || msg.id !== botResponseId) // Exclude the placeholder using ID
          .map((msg): Content => ({ // Map to Content structure
            role: msg.sender === 'user' ? 'user' : 'model', // Convert sender to role
            parts: [{ text: msg.text }] // Wrap text in parts array
          }));

        // Call the backend API endpoint, now sending history and files
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message: currentMessage,
              history: historyForApi,
              files: filesPayload // Add files payload here
            }),
            signal: controller.signal
        });

        if (!response.ok) {
          // Handle HTTP errors - Update the placeholder message
          console.error('API Error:', response.status, response.statusText);
          const errorText = await response.text();
          setChatHistory(prevChatHistory =>
            prevChatHistory.map(msg =>
              msg.id === botResponseId // Find the placeholder by ID
                ? {...msg, text: `Error: ${response.statusText || 'Failed to get response'}. ${errorText ? `Details: ${errorText}`: ''}`}
                : msg
            )
          );
          setIsBotReplying(false);
          return;
        }

        // Handle streaming response
        const reader = response.body?.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }

        // Variables for character-by-character typing
        let currentResponseText = ''; // The text currently displayed
        let incomingTextBuffer = '';  // Buffer for incoming characters/stream chunks
        const characterQueue: string[] = []; // Queue of characters to type
        let isCurrentlyTyping = false;
        const decoder = new TextDecoder();

        // Function to simulate typing effect character by character
        const typeNextCharacter = async () => {
          // Stop if flag is set or queue is empty
          if (stopTypingRef.current || characterQueue.length === 0) {
            isCurrentlyTyping = false;
            return;
          }

          isCurrentlyTyping = true;

          // Get the next character from the queue
          const nextChar = characterQueue.shift() || '';
          currentResponseText += nextChar; // Add the character

          // Update the bot message (placeholder) with the current displayed text
          setChatHistory(prevChatHistory =>
            prevChatHistory.map(msg =>
              msg.id === botResponseId // Find the placeholder by ID
                ? {...msg, text: currentResponseText}
                : msg
            )
          );

          // Wait for the typing delay (per character)
          await new Promise(resolve => setTimeout(resolve, typingSpeed));

          // Continue typing the next character *only if not stopped*
          if (!stopTypingRef.current) {
            typeNextCharacter();
          }
        };

        // Process the stream chunks
        while (true) {
            const { done, value } = await reader.read();

            if (done) {
              // If there's anything left in the buffer when the stream is done, queue it
              if (incomingTextBuffer.length > 0) {
                characterQueue.push(incomingTextBuffer);
                incomingTextBuffer = ''; // Clear buffer
                if (!isCurrentlyTyping) {
                  typeNextCharacter(); // Start typing if not already
                }
              }
              break; // Exit the loop
            }

            // Decode the chunk and add to buffer
            const chunkText = decoder.decode(value, { stream: true });
            incomingTextBuffer += chunkText;

            // Add all characters from the buffer to the queue individually
            while (incomingTextBuffer.length > 0) {
                characterQueue.push(incomingTextBuffer.charAt(0));
                incomingTextBuffer = incomingTextBuffer.substring(1);
            }

            // Start typing if not already in progress
            if (!isCurrentlyTyping && characterQueue.length > 0) {
                typeNextCharacter();
            }
        }

        // Wait for any remaining typing to complete
        while (isCurrentlyTyping) {
            await new Promise(resolve => setTimeout(resolve, 50));
        }

    } catch (error) {
        // Handle network errors or issues reading files/calling API
        console.error('Error during send/response processing:', error);
        // Update the placeholder message with a generic error
        setChatHistory(prevChatHistory =>
          prevChatHistory.map(msg =>
            msg.id === botResponseId // Find the placeholder by ID
              ? {...msg, text: translations.errorMessage[language] || 'Sorry, something went wrong processing your request.'}
              : msg
          )
        );
    } finally {
        setIsBotReplying(false); // Bot has finished replying (or failed)
        // Ensure files are cleared even if there was an error
        setSelectedFiles([]);
    }
  };

  // Function to handle stopping the bot's response generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort(); // Signal fetch to abort
      abortControllerRef.current = null; // Clean up immediately
    }
    stopTypingRef.current = true; // Signal the typing loop to stop
    setIsBotReplying(false); // Update state to re-enable input
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter key press unless Shift is held, message is not empty, and bot is not replying
    if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isBotReplying) {
      e.preventDefault(); // Prevent newline
      // Manually trigger the form submission
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    }
    // If Enter is pressed without Shift but conditions aren't met (empty msg or bot replying),
    // still prevent the default newline behavior.
    else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  };

  // --- File Handling Functions ---

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newlySelectedRawFiles = Array.from(event.target.files);
      
      // Map raw files to our SelectedFile structure with unique IDs
      const newFilesWithIds = newlySelectedRawFiles.map(file => ({
        file,
        id: `${file.name}-${file.lastModified}-${file.size}` // Consistent unique ID
      }));

      // Update state, ensuring uniqueness
      setSelectedFiles(prevFiles => {
        // Create a Set of existing file IDs for efficient lookup
        const existingFileIds = new Set(prevFiles.map(f => f.id));
        
        // Filter the newly selected files, keeping only those whose ID is not already in the Set
        const uniqueNewFiles = newFilesWithIds.filter(newFile => !existingFileIds.has(newFile.id));
        
        // Combine previous files with the unique new files
        const updatedFiles = [...prevFiles, ...uniqueNewFiles];

        if (uniqueNewFiles.length < newFilesWithIds.length) {
          console.log("Duplicate files detected and ignored.");
        }
        console.log("Adding unique new files:", uniqueNewFiles);

        // You might want to add a limit to the total number of files here
        // e.g., if (updatedFiles.length > MAX_FILES) { /* show error, slice array */ }

        return updatedFiles; 
      });

      // Reset the input value to allow selecting the same file again if it was removed
      event.target.value = '';
    }
  };

  const removeSelectedFile = (idToRemove: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.id !== idToRemove));
    console.log("Removed file with ID:", idToRemove);
  };

  // --- End File Handling Functions ---

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
    <> {/* Wrap with Fragment - remove style tag later if empty */}
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
            <div style={{ width: '45px', height: '28px', display: 'flex', alignItems: 'center' }}> {/* Ensure div centers the button content */}
              <button onClick={() => router.push('/home')} style={{...styles.headerButton, ...fixedHeightStyles.backButton, padding: '0 5px'}}> {/* Add slight padding */}
                {/* iOS-style chevron back icon */}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
              </button>
            </div>
            <h1 style={{...styles.headerTitle, ...fixedHeightStyles.title}}>
              <span style={{ display: 'inline-block' }}>{translations.chatTitle[language]}</span>
            </h1>
            <div style={{...styles.headerToggleContainer}}>
              <LanguageToggleSwitch />
            </div>
          </div>

          {/* Container for Greeting and Chat Area (occupies space between header and input) */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>

            {/* Initial Greeting - Fades out */}
            <div style={{
              position: 'absolute',
              top: 'calc(50% - 140px)', // Positioned further above the vertical center
              left: '50%',
              right: 'auto', // Don't use right: 0
              bottom: 'auto', // Don't use bottom: 0
              transform: 'translateX(-50%)', // Center horizontally
              width: '90%', // Match input width for centering consistency
              maxWidth: '800px', // Match input max-width
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center', // Center vertically
              alignItems: 'center',
              padding: '0 20px',
              opacity: isInitialState ? 1 : 0, // Fade out
              transition: 'opacity 0.5s ease-in-out',
              pointerEvents: isInitialState ? 'auto' : 'none', // Disable interaction when faded
              zIndex: isInitialState ? 4 : 1 // Higher z-index initially, lower after fade
            }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: '500',
                marginBottom: '10px',
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
            </div>

            {/* Chat messages container - Fades in */}
            <div
              ref={chatContainerRef} // Add the ref to the chat container
              style={{
                position: 'absolute',
                top: 0, // Position at the top
                left: 0,
                right: 0,
                bottom: 0, // Occupy full container space
                overflowY: 'auto',
                overflowX: 'hidden',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#fff',
                opacity: isInitialState ? 0 : 1, // Fade in
                transition: 'opacity 0.5s 0.2s ease-in-out', // Delay fade-in slightly
                zIndex: 2 // Above greeting when faded in
              }}
            >
              {/* Wrapper div for messages */}
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
                    backgroundColor: isUser ? '#e3f2fd' : '#f9f9f9',
                    borderRadius: isUser ? '18px' : '0',
                    boxShadow: isUser ? '0 1px 2px rgba(0,0,0,0.1)' : 'none',
                    maxWidth: isUser ? '80%' : '100%',
                    marginLeft: isUser ? 'auto' : '0',
                    marginRight: isUser ? '0' : 'auto',
                  };

                  return (
                    <div key={chat.id || index} style={{
                      display: 'flex',
                      justifyContent: isUser ? 'flex-end' : 'flex-start',
                      marginBottom: '10px'
                    }}>
                      {/* Apply messageStyle for user, but modified styles for bot */}
                      <div style={isUser ? messageStyle : {
                        // Bot styles: Remove background and padding for less boxy look
                        ...messageStyle, // Keep base text styles, alignment, etc.
                        backgroundColor: 'transparent',
                        padding: '0',
                        boxShadow: 'none', // Ensure no shadow
                        maxWidth: '100%' // Keep max width
                      }}>
                        <span style={{...styles.messageSender, color: isUser ? '#007bff' : '#555'}}>
                          {isUser ? translations.you[language] : translations.botName[language]}
                        </span>
                        {isUser ? (
                          <p style={{...styles.messageText, ...fixedHeightStyles.messageText, margin: '4px 0 0'}}>
                            {chat.text}
                          </p>
                        ) : (
                          <div style={{...styles.messageText, ...fixedHeightStyles.messageText, margin: '4px 0 0'}}>
                            {/* Render directly with ReactMarkdown for typewriter effect */}
                            <div>
                              <ReactMarkdown
                                components={{
                                  // Keep default spacing reduction for elements
                                  p: ({...props}) => <p style={{ marginBlockStart: '0.1em', marginBlockEnd: '0.1em' }} {...props} />, // Paragraphs
                                  ul: ({...props}) => <ul style={{ marginBlockStart: '0.5em', marginBlockEnd: '0.5em', paddingInlineStart: '20px' }} {...props} />, // Unordered lists
                                  li: ({...props}) => <li style={{ marginBlockStart: '0.1em', marginBlockEnd: '0.1em' }} {...props} /> // List items
                                }}
                              >
                                {chat.text}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Optional: Add a loading indicator when bot is replying */}
                {isBotReplying && !stopTypingRef.current && chatHistory.length > 0 && chatHistory[chatHistory.length - 1]?.sender === 'bot' && (
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
          </div> {/* End Container for Greeting and Chat Area */}

          {/* Message input area - Always rendered, position changes */}
          <div style={{
            position: 'absolute',
            left: '50%',
            width: '90%', // Use percentage width for responsiveness
            maxWidth: '800px', // Keep max width
            // Conditional positioning based on isInitialState
            top: isInitialState ? '50%' : 'auto',
            bottom: isInitialState ? 'auto' : '35px', // Adjust bottom positioning as needed
            transform: isInitialState ? 'translate(-50%, -50%)' : 'translate(-50%, 0)',
            // Change timing function to linear for constant speed
            transition: 'top 0.5s linear, bottom 0.5s linear, transform 0.5s linear',
            zIndex: 3 // Ensure input is above chat area/greeting
          }}>
            {/* Wrapper for file display + input form */}
            <div style={{...styles.inputAreaWrapper, width: '100%'}}> {/* Ensure wrapper takes full width of positioned parent */}
              {/* Display Selected Files */}
              {selectedFiles.length > 0 && (
                <div style={styles.selectedFilesContainer}>
                  {selectedFiles.map((fileEntry) => (
                    <div key={fileEntry.id} style={styles.selectedFileItem}>
                      <span style={styles.selectedFileName}>{fileEntry.file.name}</span>
                      <button
                        onClick={() => removeSelectedFile(fileEntry.id)}
                        style={styles.removeFileButton}
                        title="Remove file"
                      >
                        &times; {/* Simple 'x' character */}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {/* Input Form Wrapper */}
              <div style={styles.inputFormWrapper}>
                <form onSubmit={handleSendMessage} style={{ display: 'flex', width: '100%', alignItems: 'center', position: 'relative' }}>
                  <div style={{ flex: 1, margin: '6px 0', position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <textarea
                      value={message}
                      onChange={(e) => {
                        setMessage(e.target.value);
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = '40px'; // Initial height reset
                        const newHeight = Math.min(target.scrollHeight, 220); // Match maxHeight
                        target.style.height = `${newHeight}px`;
                        setShowCanvas(e.target.value.trim().toLowerCase() === 'canvas');
                      }}
                      style={{
                        ...styles.textareaBase, // Use base styles
                        paddingRight: '110px',
                        borderRadius: selectedFiles.length > 0 ? '0 0 26px 26px' : '26px', // Adjust radius if files are shown
                      }}
                      placeholder={translations.typeMessage[language]}
                      autoFocus
                      rows={1}
                      onKeyDown={handleKeyDown}
                      onInput={(e) => { // Auto-resize logic
                        const target = e.target as HTMLTextAreaElement;
                        target.style.height = '40px'; // Reset height first
                        const newHeight = Math.min(target.scrollHeight, 220); // Match maxHeight
                        target.style.height = `${newHeight}px`;
                      }}
                      disabled={isBotReplying}
                    />
                  </div>
                  {/* Attachment Button */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.csv,text/csv,.txt,text/plain,.html,.htm,text/html,.odt,application/vnd.oasis.opendocument.text,.rtf,application/rtf,text/rtf,.epub,application/epub+zip"
                    multiple
                  />
                  <button
                    type="button"
                    style={{...styles.iconButton, left: 'auto', right: '56px'}}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isBotReplying}
                    title="Upload images or docs"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5f6368" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                    </svg>
                  </button>
                  {/* Send/Stop Button Container */}
                  <div style={styles.sendStopButtonContainer}>
                    {isBotReplying ? (
                      <button
                        type="button"
                        onClick={handleStopGenerating}
                        style={styles.stopButton}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="#757575" xmlns="http://www.w3.org/2000/svg">
                          <rect width="24" height="24" rx="4" ry="4" />
                        </svg>
                      </button>
                    ) : (
                      <button
                        type="submit"
                        style={{
                          ...styles.sendButton,
                          backgroundColor: (!message.trim() && selectedFiles.length === 0) ? '#A4C2F4' : '#4285F4',
                          cursor: (!message.trim() && selectedFiles.length === 0) ? 'not-allowed' : 'pointer',
                          boxShadow: (!message.trim() && selectedFiles.length === 0) ? 'none' : '0 2px 5px rgba(0,0,0,0.2)'
                        }}
                        disabled={(!message.trim() && selectedFiles.length === 0) || isBotReplying}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 4L12 20" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M5 11L12 4L19 11" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                </form>
              </div> {/* End of Input Form Wrapper */}
            </div> {/* End of Input Area Wrapper */}
          </div> {/* End Message input area */}

        </div> {/* End of Left half - Chat interface */}

        {/* Right half - Canvas (only shown if showCanvas is true) */}
        {showCanvas && <ChatCanvas />}
      </div> {/* End of main flex container */}
    </>
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
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '18px', 
    fontWeight: 600,
    textAlign: 'center',
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
  // --- Input Area Styles ---
  inputAreaWrapper: { // New wrapper for files + form
    width: '100%',
    maxWidth: '800px', // Increased from 750px to make it wider
    borderRadius: '26px', // Overall rounded corners
    border: '1px solid #ddd', // Overall border
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)', // Overall shadow
    backgroundColor: '#fff', // Changed background to white for consistency
    overflow: 'hidden', // Clip corners
    display: 'flex',
    flexDirection: 'column', // Stack files above form
  },
  selectedFilesContainer: { // Container for files, now inside wrapper
    display: 'flex',
    flexWrap: 'nowrap', // Keep items on a single line
    overflowX: 'auto', // Enable horizontal scrolling
    gap: '8px',
    padding: '8px 15px', // Padding inside the container
    borderBottom: '1px solid #ddd', // Separator line
  },
  selectedFileItem: { // Individual file item style
    display: 'flex',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)', // Slightly darker background pill
    borderRadius: '12px',
    padding: '3px 8px',
    fontSize: '12px',
    color: '#333',
    maxWidth: '100%', // Prevent overflow
  },
  selectedFileName: {
    marginRight: '6px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '200px', // Limit file name width slightly more
  },
  removeFileButton: {
    background: 'none',
    border: 'none',
    color: '#555',
    cursor: 'pointer',
    fontSize: '16px',
    lineHeight: '1',
    padding: '0 2px',
    marginLeft: 'auto', // Push to the right if needed (flex container)
  },
  inputFormWrapper: { // The div directly wrapping the form
    display: 'flex', // Keep using flex for form alignment
    padding: 0, // No padding needed here
    backgroundColor: 'transparent', // No background needed
  },
  textareaBase: { // Base styles for the textarea
    width: '100%',
    padding: '8px 20px', 
    border: 'none',
    outline: 'none',
    fontSize: '16px',
    backgroundColor: 'transparent', // Inherit from parent wrapper now
    color: '#555',
    resize: 'none',
    minHeight: '40px',
    maxHeight: '220px',
    overflow: 'auto',
    lineHeight: '1.5',
    boxSizing: 'border-box',
    fontFamily: "'Baloo 2', sans-serif",
  },
  iconButton: { // Style for attachment button
    position: 'absolute',
    top: '50%',
    transform: 'translateY(-50%)',
    zIndex: 2,
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    width: '40px',
    height: '40px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '0',
    color: '#5f6368', // Default icon color
  },
  sendStopButtonContainer: { // Style for send/stop button div
      position: 'absolute',
      right: '8px',
      top: '50%',
      transform: 'translateY(-50%)',
      zIndex: 2
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
  },
  stopButton: {
    backgroundColor: 'transparent', // Transparent background
    color: '#757575', // Grey for the icon
    border: '2px solid #757575', // Grey outline
    borderRadius: '50%', // Keep it circular
    width: '36px', // Reduced from 40px
    height: '36px', // Reduced from 40px
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
    padding: '0',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)', // Lighter shadow for outlined button
  },
  messageSender: {
    fontWeight: 'bold',
    marginRight: '8px'
  },
  messageText: {
    ...fixedHeightStyles.messageText
  },
}; 