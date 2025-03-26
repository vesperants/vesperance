// src/components/LanguageToggleSwitch.tsx
'use client';

import React from 'react';
import { useLanguage } from '@/context/LanguageContext';
import './LanguageToggleSwitch.css'; // We'll create this CSS file

export const LanguageToggleSwitch: React.FC = () => {
  const { language, toggleLanguage } = useLanguage();

  const isEnglish = language === 'en';

  return (
    <label className="language-switch" htmlFor="language-toggle" title={isEnglish ? "नेपालीमा बदल्नुहोस्" : "Switch to English"}>
      <input
        id="language-toggle"
        type="checkbox"
        checked={isEnglish}
        onChange={toggleLanguage}
        aria-label="Toggle language between Nepali and English"
      />
      <span className="slider">
          <span className="lang-text lang-ne">ने</span>
          <span className="lang-text lang-en">EN</span>
      </span>
    </label>
  );
};