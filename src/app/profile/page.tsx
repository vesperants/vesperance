'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext'; // Import
import { translations } from '@/lib/translations';     // Import
import { LanguageToggleSwitch } from '@/components/LanguageToggleSwitch'; // Import
// Import db only from config, auth functions directly from firebase/auth
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
// Import AuthError for typed catch block
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, AuthError } from 'firebase/auth';


export default function ProfilePage() {
  const { user, loading: authLoading } = useAuth();
  const { language } = useLanguage(); // Get language
  const router = useRouter();

  // Profile state...
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isFetchingProfile, setIsFetchingProfile] = useState(true);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  // Password state...
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);


  // Effects remain largely the same, just update error messages if needed
  useEffect(() => {
    if (!authLoading && (!user || !user.emailVerified)) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user && user.emailVerified && language) { // Ensure language is available
        setIsFetchingProfile(true);
        setProfileError(null);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(userDocRef);

          if (docSnap.exists()) {
            const data = docSnap.data();
            setName(data.name || '');
            setCompanyName(data.companyName || '');
            setAddress(data.address || '');
            setPhoneNumber(data.phoneNumber || '');
          } else {
             console.log('No profile document found for user:', user.uid);
             setProfileError(translations.profileNotFoundError[language]); // Use translation
          }
        } catch (error) { // Keep type as unknown or specify if needed
             console.error('Error fetching profile:', error);
             setProfileError(translations.profileFetchError[language]); // Use translation
        } finally {
          setIsFetchingProfile(false);
        }
      }
    };
    fetchProfile(); // Fetch when user and language are ready
  }, [user, language]); // Add language dependency

  // Handle Profile Update (update messages)
  const handleProfileUpdate = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault(); if (!user) return;
      setProfileError(null); setProfileSuccess(null); setIsUpdatingProfile(true);
      if (!name) { setProfileError(translations.fillNameError[language]); setIsUpdatingProfile(false); return; } // Use translation
      try {
          const userDocRef = doc(db, 'users', user.uid);
          await updateDoc(userDocRef, {
              name: name, companyName: companyName, address: address, phoneNumber: phoneNumber,
              updatedAt: serverTimestamp(),
          });
          setProfileSuccess(translations.profileUpdateSuccess[language]); // Use translation
          setTimeout(() => setProfileSuccess(null), 3000);
      } catch (_error: unknown) { // Use _error: unknown as error isn't inspected
          console.error('Error updating profile:', _error); // Log the actual error
          setProfileError(translations.profileUpdateError[language]);
      }
      finally { setIsUpdatingProfile(false); }
  };

  // Handle Password Change (update messages)
  const handlePasswordChange = async (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault(); if (!user || !user.email) return;
      setPasswordError(null); setPasswordSuccess(null);

      // Validations using translations
      if (!currentPassword || !newPassword || !confirmNewPassword) { setPasswordError(translations.passwordFillAllError[language]); return; }
      if (newPassword !== confirmNewPassword) { setPasswordError(translations.passwordMismatchError[language]); return; }
      if (newPassword.length < 6) { setPasswordError(translations.passwordLengthError[language]); return; }

      setIsChangingPassword(true);
      try {
          // Re-authenticate user before password update for security
          const credential = EmailAuthProvider.credential(user.email, currentPassword);
          await reauthenticateWithCredential(user, credential);
          // If re-authentication is successful, update the password
          await updatePassword(user, newPassword);
          setPasswordSuccess(translations.passwordChangeSuccess[language]); // Use translation
          setCurrentPassword(''); setNewPassword(''); setConfirmNewPassword('');
          setTimeout(() => setPasswordSuccess(null), 3000);
      } catch (error) { // Type as AuthError as 'code' is checked
           const firebaseError = error as AuthError;
           console.error("Password Change Error:", firebaseError.code, firebaseError.message);
           // Use translations for errors
           if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/invalid-credential') { // Added invalid-credential check
               setPasswordError(translations.passwordWrongError[language]);
           } else if (firebaseError.code === 'auth/weak-password') {
               setPasswordError(translations.passwordWeakError[language]);
           } else {
               setPasswordError(translations.passwordChangeError[language]);
           }
      } finally { setIsChangingPassword(false); }
  };


  if (authLoading || isFetchingProfile || !language) { // Check language loaded
    const loadingText = language ? translations.profileLoading[language] : 'Loading...';
    return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>{loadingText}</div>;
  }
  if (!user) { return <div className="container" style={{ textAlign: 'center', marginTop: '50px' }}>{translations.loginRequired[language]}</div>; }

  return (
    // Added paddingTop to main container to make space for absolute positioned elements
    <div className="container container--medium" style={{ position: 'relative', paddingTop: '70px' }}> {/* Adjusted padding */}

        {/* --- Back to Homepage Button --- */}
        <div style={{ position: 'absolute', top: '21px', left: '15px' }}> {/* Position top left */}
             {/* Removed arrow, added style to remove underline */}
             <Link
               href="/home"
               className="button button-clear"
               style={{ textDecoration: 'none' }} // Add this line to remove underline
             >
                 {translations.goBackHome[language]} {/* Removed arrow */}
             </Link>
        </div>
        {/* --- End Back Button --- */}

        {/* --- Language Toggle --- */}
        <div style={{ position: 'absolute', top: '21px', right: '15px' }}> {/* Kept position top right */}
             <LanguageToggleSwitch />
        </div>
        {/* --- End Language Toggle --- */}

      <h1 className="page-title">{translations.profileTitle[language]}</h1>

      {/* Profile Update Form */}
      <section style={{ marginBottom: '40px', borderBottom: '1px solid #eee', paddingBottom: '30px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2em' }}>{translations.personalInfo[language]}</h2>
        <form onSubmit={handleProfileUpdate}>
          {/* Name */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="profileName" className="field-label">{translations.fullNameLabel[language]} <span style={{color: 'red'}}>*</span></label>
            <input type="text" id="profileName" value={name} onChange={(e) => setName(e.target.value)} required className="search-box" disabled={isUpdatingProfile} />
          </div>
          {/* Company */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="companyName" className="field-label">{translations.companyNameLabel[language]}</label>
            <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="search-box" disabled={isUpdatingProfile} />
          </div>
          {/* Address */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="address" className="field-label">{translations.addressLabel[language]}</label>
            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="search-box" disabled={isUpdatingProfile} />
          </div>
          {/* Phone */}
          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="phoneNumber" className="field-label">{translations.phoneLabel[language]}</label>
            <input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="search-box" disabled={isUpdatingProfile} />
          </div>

          {profileError && <p style={{ color: 'red', marginBottom: '15px' }}>{profileError}</p>}
          {profileSuccess && <p style={{ color: 'green', marginBottom: '15px' }}>{profileSuccess}</p>}

          <div className="button-container" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="button button-search" disabled={isUpdatingProfile}>
              {isUpdatingProfile ? translations.savingProfileButton[language] : translations.saveProfileButton[language]}
            </button>
          </div>
        </form>
      </section>

      {/* Password Change Form */}
      <section>
        <h2 style={{ marginBottom: '20px', fontSize: '1.2em' }}>{translations.changePasswordTitle[language]}</h2>
        <form onSubmit={handlePasswordChange}>
            {/* Current Pwd */}
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="currentPassword" className="field-label">{translations.currentPasswordLabel[language]} <span style={{color: 'red'}}>*</span></label>
                <input type="password" id="currentPassword" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required className="search-box" disabled={isChangingPassword} />
            </div>
            {/* New Pwd */}
            <div style={{ marginBottom: '15px' }}>
                <label htmlFor="newPassword" className="field-label">{translations.newPasswordLabel[language]} <span style={{color: 'red'}}>*</span></label>
                <input type="password" id="newPassword" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required className="search-box" disabled={isChangingPassword} placeholder={translations.atLeast6Chars[language]}/>
            </div>
            {/* Confirm New Pwd */}
            <div style={{ marginBottom: '25px' }}>
                <label htmlFor="confirmNewPassword" className="field-label">{translations.confirmNewPasswordLabel[language]} <span style={{color: 'red'}}>*</span></label>
                <input type="password" id="confirmNewPassword" value={confirmNewPassword} onChange={(e) => setConfirmNewPassword(e.target.value)} required className="search-box" disabled={isChangingPassword} />
            </div>

           {passwordError && <p style={{ color: 'red', marginBottom: '15px' }}>{passwordError}</p>}
           {passwordSuccess && <p style={{ color: 'green', marginBottom: '15px' }}>{passwordSuccess}</p>}

          <div className="button-container" style={{ justifyContent: 'flex-start' }}>
            <button type="submit" className="button button-search" disabled={isChangingPassword}>
              {isChangingPassword ? translations.changingPasswordButton[language] : translations.changePasswordButton[language]}
            </button>
          </div>
        </form>
      </section>
       {/* Link back home - REMOVED FROM HERE */}
    </div>
  );
}