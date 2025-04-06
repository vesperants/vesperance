'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { translations } from '@/constants/translations';
import { LanguageToggleSwitch } from '@/components/LanguageToggleSwitch';
// import { ChatCanvas } from '@/components/ChatCanvas'; // REMOVE Unused import
// import ReactMarkdown from 'react-markdown';
import type { Content } from '@google/genai';
import { sendMessageToApi } from '@/services/chatService';
import { readFileAsBase64 } from '@/utils/fileUtils';
import ChatHeader from '@/components/ChatHeader';
import ChatInputArea from '@/components/ChatInputArea';
import ChatMessageList from '@/components/ChatMessageList';
import InitialGreeting from '@/components/InitialGreeting';
// Import the new ChatShelf component
import ChatShelf from '@/components/ChatShelf';

// Define type for selected file state
interface SelectedFile {
  file: File;
  id: string;
}

// Define the structure for the chat message state
interface ChatMessage {
    sender: 'user' | 'bot';
    text: string;
    timestamp: Date;
    id?: string;
}

export default function ChatPage() {
  const { user, loading } = useAuth(); // Correct: signOut removed
  const { language } = useLanguage();
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  // const [showCanvas, setShowCanvas] = useState(false); // Comment out if ChatCanvas is not used
  const [isBotReplying, setIsBotReplying] = useState(false);
  const [typingSpeed] = useState(20);
  const [isInitialState, setIsInitialState] = useState(true);
  const [isShelfOpen, setIsShelfOpen] = useState(false); // State for shelf
  const abortControllerRef = useRef<AbortController | null>(null);
  const stopTypingRef = useRef<boolean>(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Function to toggle shelf visibility
  const toggleShelf = () => {
    setIsShelfOpen(prev => !prev);
  };

  // Function to navigate to profile page
  const goToProfile = () => router.push('/profile');

  useEffect(() => {
    if (loading) return;
    if (!user || !user.emailVerified) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const currentMessage = message.trim();
    if (!currentMessage && selectedFiles.length === 0) return;

    stopTypingRef.current = false;
    if (isInitialState) setIsInitialState(false);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    const userMessageEntry: ChatMessage = {
      sender: 'user',
      text: currentMessage,
      timestamp: new Date()
    };
    setChatHistory(prev => [...prev, userMessageEntry]);

    let filesPayload: Awaited<ReturnType<typeof readFileAsBase64>>[] = [];
    try {
      const fileDataPromises = selectedFiles.map(fileEntry => readFileAsBase64(fileEntry.file));
      filesPayload = await Promise.all(fileDataPromises);
    } catch (fileReadError) {
      console.error("Error reading files:", fileReadError);
      setChatHistory(prev => [...prev, { sender: 'bot', text: `Error processing files: ${fileReadError instanceof Error ? fileReadError.message : 'Unknown error'}`, timestamp: new Date(), id: Date.now().toString() + '-filereaderror' }]);
      setIsBotReplying(false);
      setSelectedFiles([]);
      return;
    }

    setMessage('');
    setSelectedFiles([]);

    setIsBotReplying(true);
    const botResponseId = Date.now().toString();
    setChatHistory(prev => [...prev, { sender: 'bot', text: '', timestamp: new Date(), id: botResponseId }]);

    try {
      const historyForApi = chatHistory.filter(msg => msg.id !== botResponseId).map((msg): Content => ({ role: msg.sender === 'user' ? 'user' : 'model', parts: [{ text: msg.text }] }));
      const response = await sendMessageToApi(currentMessage, historyForApi, filesPayload, controller.signal);

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Could not read error details');
        console.error('API Error:', response.status, errorText);
        if (controller.signal.aborted) {
          setChatHistory(prev => prev.map(msg => msg.id === botResponseId ? { ...msg, text: '(Stopped by user)' } : msg));
        } else {
          setChatHistory(prev => prev.map(msg => msg.id === botResponseId ? { ...msg, text: `Error: ${response.statusText}. ${errorText}` } : msg));
        }
        setIsBotReplying(false);
        abortControllerRef.current = null;
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader');
      let currentResponseText = '';
      const characterQueue: string[] = [];
      let isCurrentlyTyping = false;
      const decoder = new TextDecoder();
      const typeNextCharacter = async () => {
        if (stopTypingRef.current) {
            isCurrentlyTyping = false; 
            console.log("typeNextCharacter halted by stopTypingRef.");
            return; 
        }
        
        if (characterQueue.length === 0) { 
            isCurrentlyTyping = false; 
            return; 
        }

        isCurrentlyTyping = true;
        const nextChar = characterQueue.shift() || '';
        currentResponseText += nextChar;
        setChatHistory(prev => prev.map(msg => msg.id === botResponseId ? { ...msg, text: currentResponseText } : msg));
        
        await new Promise(resolve => setTimeout(resolve, typingSpeed));
        
        if (!stopTypingRef.current) {
            typeNextCharacter(); 
        } else {
            isCurrentlyTyping = false;
            console.log("typeNextCharacter recursive call skipped by stopTypingRef.");
        }
      };
      while (true) {
        if (controller.signal.aborted) { stopTypingRef.current = true; break; }
        const { done, value } = await reader.read();
        const chunkText = decoder.decode(value, { stream: done });
        if (chunkText) {
          characterQueue.push(...chunkText.split(''));
          if (!isCurrentlyTyping) typeNextCharacter(); 
        }
        if (done) {
            break; 
        }
      }
      while (isCurrentlyTyping && !stopTypingRef.current) await new Promise(resolve => setTimeout(resolve, 50));
      if (stopTypingRef.current) {
        setChatHistory(prev => prev.map(msg => msg.id === botResponseId ? { ...msg, text: currentResponseText + ' (Stopped)' } : msg));
      }
    } catch (error) {
      if (controller.signal.aborted) {
        console.log("Aborted (caught).");
        setChatHistory(prev => prev.map(msg => msg.id === botResponseId && !msg.text.includes('(Stopped') ? { ...msg, text: msg.text + ' (Stopped)' } : msg));
      } else {
        console.error('Send/response error:', error);
        setChatHistory(prev => prev.map(msg => msg.id === botResponseId ? { ...msg, text: translations.errorMessage[language] } : msg));
      }
    } finally {
      setIsBotReplying(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    stopTypingRef.current = true;
    setIsBotReplying(false);
    console.log("Stop generation requested.");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && (message.trim() || selectedFiles.length > 0) && !isBotReplying) {
      e.preventDefault();
      const form = e.currentTarget.closest('form');
      if (form) {
        const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
        form.dispatchEvent(submitEvent);
      }
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const newlySelectedRawFiles = Array.from(event.target.files);
      const newFilesWithIds = newlySelectedRawFiles.map(file => ({ file, id: `${file.name}-${file.lastModified}-${file.size}` }));
      setSelectedFiles(prevFiles => {
        const existingFileIds = new Set(prevFiles.map(f => f.id));
        const uniqueNewFiles = newFilesWithIds.filter(newFile => !existingFileIds.has(newFile.id));
        return [...prevFiles, ...uniqueNewFiles];
      });
      event.target.value = '';
    }
  };

  const removeSelectedFile = (idToRemove: string) => {
    setSelectedFiles(prevFiles => prevFiles.filter(file => file.id !== idToRemove));
  };

  if (loading || !language || (!loading && (!user || !user.emailVerified))) {
    const loadingText = language ? translations.loadingOrAccessDenied[language] : 'Loading...';
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div className="container" style={{ textAlign: 'center' }}>{loadingText}</div>
      </div>
    );
  }

  return (
    <>
      {/* Render the shelf */}
      <ChatShelf isOpen={isShelfOpen} onClose={toggleShelf} />

      {/* Main Content Area - Slides */} 
      <div style={{ 
        display: 'flex', 
        height: '100vh', 
        width: '100vw', 
        overflow: 'hidden', 
        marginLeft: isShelfOpen ? '280px' : '0px', // Adjust width to match CSS
        transition: 'margin-left 0.3s ease-in-out' 
      }}>
        {/* Chat Container (Content inside the sliding area) */}
        <div style={{ 
          flex: 1,
          display: 'flex', 
          flexDirection: 'column', 
          height: '100%', 
          overflow: 'hidden', 
          backgroundColor: '#fff', 
          position: 'relative' 
        }}>
          <ChatHeader
            onProfileClick={goToProfile}
            profileImageUrl={user?.photoURL}
            title={translations.chatTitle[language]}
            onToggleShelfClick={toggleShelf} // Pass toggle function
            isShelfOpen={isShelfOpen} // Pass shelf state
          >
            <LanguageToggleSwitch />
          </ChatHeader>

          {/* Rest of the chat content */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Initial Greeting */}
            <div style={{
                position: 'absolute',
                top: 'calc(50% - 140px)', left: '50%',
                transform: 'translateX(-50%)',
                width: '90%', maxWidth: '800px',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'center', padding: '0 20px',
                opacity: isInitialState ? 1 : 0,
                transition: 'opacity 0.5s ease-in-out',
                pointerEvents: isInitialState ? 'auto' : 'none',
                zIndex: 4
             }}>
                <InitialGreeting language={language} />
            </div>

            {/* Message List */}
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              opacity: isInitialState ? 0 : 1,
              transition: 'opacity 0.5s 0.2s ease-in-out',
              zIndex: 2
            }}>
              <ChatMessageList
                chatHistory={chatHistory}
                // showCanvas={showCanvas} // Pass if using canvas
                language={language}
                translations={translations}
                isBotReplying={isBotReplying}
                stopTypingRef={stopTypingRef}
                chatContainerRef={chatContainerRef}
              />
            </div>
          </div>

          {/* Chat Input Area */}
          <div style={{
            position: 'absolute', left: '50%', width: '90%', maxWidth: '800px', 
            bottom: isInitialState ? 'auto' : '35px', 
            top: isInitialState ? '50%' : 'auto',
            transform: 'translateX(-50%)' + (isInitialState ? ' translateY(-50%)' : ''), 
            transition: 'top 0.5s linear, bottom 0.5s linear, transform 0.5s linear',
            zIndex: 3
          }}>
            <ChatInputArea
              message={message}
              setMessage={setMessage}
              handleSendMessage={handleSendMessage}
              handleStopGenerating={handleStopGenerating}
              handleKeyDown={handleKeyDown}
              handleFileChange={handleFileChange}
              removeSelectedFile={removeSelectedFile}
              // setShowCanvas={setShowCanvas} // Pass if using canvas
              selectedFiles={selectedFiles}
              isBotReplying={isBotReplying}
              placeholder={translations.typeMessage[language]}
            />
          </div>
        </div>

        {/* Canvas - If used, ensure positioning works with shelf */}
        {/* {showCanvas && <ChatCanvas />} */}
      </div>
    </>
  );
}