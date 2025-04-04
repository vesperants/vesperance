// src/components/LanguageToggleSwitch.tsx
'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import './LanguageToggleSwitch.css'; // We'll create this CSS file

export const LanguageToggleSwitch: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();
  const isEnglish = language === 'en';
  
  return (
    <button 
      className={`language-button ${isEnglish ? 'nepali-option' : 'english-option'}`}
      onClick={toggleLanguage}
      title={isEnglish ? "नेपालीमा बदल्नुहोस्" : "Switch to English"}
      aria-label={isEnglish ? "Switch to Nepali" : "Switch to English"}
    >
      {isEnglish ? 'ने' : 'EN'}
    </button>
  );
};