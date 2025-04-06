// src/app/home/page.tsx
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext'; // Import useLanguage
import { translations } from '@/lib/translations';     // Import translations
import { LanguageToggleSwitch } from '@/components/LanguageToggleSwitch'; // Import Switch
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase/config';

type ChatMessage = {
  sender: string;
  text: string;
  timestamp: Date;
  id?: string; 
}

export default function HomePage() {
  const { user, loading } = useAuth();
  const { language } = useLanguage(); // Get language state
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !user.emailVerified) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout Error:', error);
      alert(translations.signOutFailed[language]); // Use translation
    }
  };

  const goToProfile = () => router.push('/profile');

  // Ensure language context is loaded before rendering content that uses translations
  if (loading || !language || (!loading && (!user || !user.emailVerified))) {
    // Display loading text (use language if available, else a fallback)
    const loadingText = language ? translations.loadingOrAccessDenied[language] : 'Loading...';
    return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>{loadingText}</div>;
  }

  return (
    // Removed minHeight: '100vh', added paddingBottom for better content fit
    <div className="container" style={{ position: 'relative', paddingTop: '70px', paddingBottom: '30px' }}> {/* Increased paddingTop slightly for top buttons */}

        {/* --- Sign Out Button --- */}
        {/* Moved to top-left, made red, and added padding */}
        <button
          onClick={handleLogout}
          className="button" // Keep existing base button style if needed, but override with inline styles
          style={{
            position: 'absolute',
            top: '15px',
            left: '15px',
            backgroundColor: '#dc3545', // A common red color (Bootstrap danger) - adjust as needed
            color: 'white',             // White text for better contrast on red
            padding: '10px 15px',       // Added padding (10px top/bottom, 15px left/right)
            border: 'none',             // Ensure no default border interferes
            borderRadius: '5px',        // Optional: Add rounded corners if not already in .button class
            cursor: 'pointer',          // Ensure cursor indicates clickability
            // Add any specific margin if needed, e.g., marginRight: '10px'
          }}
        >
          {translations.signOut[language]}
        </button>
        {/* --- End Sign Out Button --- */}

        {/* --- Language Toggle --- */}
        {/* Positioned to the left of the profile button, adjusted for larger profile button */}
        <div style={{ position: 'absolute', top: '20px', right: '85px' }}> {/* Adjusted top slightly and increased right */}
             <LanguageToggleSwitch />
        </div>
        {/* --- End Language Toggle --- */}

      {/* --- Profile Button --- */}
      {/* Made larger */}
      <button
        onClick={goToProfile}
        style={{
          position: 'absolute', top: '15px', right: '15px',
          background: 'none', border: 'none', padding: '0', cursor: 'pointer',
          borderRadius: '50%', overflow: 'hidden',
          width: '50px', height: '50px', // Increased size
        }}
        title={translations.editProfileTooltip[language]} // Use translation
      >
        <Image src="/default-profile.png" alt="Profile" width={50} height={50} style={{ display: 'block' }} /> {/* Increased size */}
      </button>
      {/* --- End Profile Button --- */}

      <h1 className="page-title" style={{ marginTop: '20px' }}> {/* Added some margin top to clear absolute buttons */}
        {translations.homeTitle[language]}
      </h1>

      <p style={{ textAlign: 'center', marginBottom: '30px' }}>
        {translations.homeDescription[language]}
      </p>

      {/* Button container with vertical stack */}
      <div className="button-container" style={{ display: 'flex', flexDirection: 'column', gap: '15px', maxWidth: '300px', margin: '0 auto' }}>
        <Link href="/search" className="button button-search" style={{ width: '100%' }}>
          {translations.goToSearch[language]}
        </Link>
        
        {/* Vesp Chat button with same size */}
        <Link href="/chat" className="button button-search" style={{ width: '100%', backgroundColor: '#4a6da7' }}>
          {translations.goToChat[language]}
        </Link>
      </div>
    </div>
  );
}