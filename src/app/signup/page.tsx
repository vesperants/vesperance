// src/app/signup/page.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createUserWithEmailAndPassword, sendEmailVerification, ActionCodeSettings } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'; // Firestore functions
import { auth, db } from '@/lib/firebase/config'; // Import auth and db

export default function SignUpPage() {
  // State for user inputs
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState(''); // Optional
  const [address, setAddress] = useState('');       // Optional
  const [phoneNumber, setPhoneNumber] = useState(''); // Optional

  // State for UI feedback
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);

  const router = useRouter();

  // Function to save user profile data to Firestore
  const saveUserProfile = async (userId: string, profileData: object) => {
    try {
      const userDocRef = doc(db, 'users', userId); // Create a document reference in 'users' collection with userId
      await setDoc(userDocRef, {
        ...profileData,
        uid: userId, // Store UID in the document as well
        createdAt: serverTimestamp(), // Add a timestamp for when the profile was created
      });
      console.log('User profile saved to Firestore');
    } catch (err)
    {
      console.error('Error saving user profile to Firestore:', err);
      // Optionally notify the user or log this error more formally
      setError('प्रोफाइल सुरक्षित गर्न असफल भयो, तर खाता सिर्जना भयो।'); // Failed to save profile, but account created.
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setRegistrationSuccess(false);

    // --- Basic Validations ---
    if (!email || !password || !confirmPassword || !name) {
      setError('कृपया इमेल, पासवर्ड, र नाम भर्नुहोस्।'); // Please fill email, password, and name.
      return;
    }
    if (password !== confirmPassword) {
      setError('पासवर्डहरू मेल खाँदैनन्।'); // Passwords do not match.
      return;
    }
    if (password.length < 6) {
      setError('पासवर्ड कम्तिमा ६ अक्षरको हुनुपर्छ।'); // Password must be at least 6 characters.
      return;
    }
    // Add more specific validation if needed (e.g., phone number format)

    setIsRegistering(true);

    try {
      // 1. Create user in Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      console.log('User created in Auth:', user.uid);

      // 2. Prepare profile data for Firestore
      const profileData = {
        email: user.email, // Store email for easier access if needed
        name: name,
        companyName: companyName,
        address: address,
        phoneNumber: phoneNumber,
        // Add any other initial profile fields here
      };

      // 3. Save profile data to Firestore
      await saveUserProfile(user.uid, profileData);

      // 4. Send verification email
      // ActionCodeSettings allows redirecting user back to app after verification
      const actionCodeSettings: ActionCodeSettings = {
          // URL must be whitelisted in the Firebase Console under Authentication > Settings > Authorized domains
          url: `${window.location.origin}/login`, // Redirect here after verification (e.g., login page)
          handleCodeInApp: true, // Recommended
      };
      await sendEmailVerification(user, actionCodeSettings);
      console.log('Verification email sent.');

      // 5. Update UI state
      setRegistrationSuccess(true);
      // Optional: Automatically sign the user out until they verify
      // await auth.signOut();

      // Optional: Redirect after a delay or keep showing success message
      // setTimeout(() => router.push('/login'), 5000);

    } catch (err: any) {
      console.error('Registration Error:', err.code, err.message);
      if (err.code === 'auth/email-already-in-use') {
        setError('यो इमेल पहिले नै दर्ता गरिएको छ।'); // This email is already registered.
      } else if (err.code === 'auth/weak-password') {
        setError('पासवर्ड कमजोर छ। कृपया बलियो पासवर्ड प्रयोग गर्नुहोस्।'); // Password is too weak. Please use a stronger password.
      } else if (err.code === 'auth/invalid-email') {
         setError('अमान्य इमेल ढाँचा।'); // Invalid email format.
      }
      else {
        setError('दर्ता असफल भयो। कृपया फेरि प्रयास गर्नुहोस्।'); // Registration failed. Please try again.
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="container container--narrow">
      <h1 className="page-title">नयाँ खाता दर्ता गर्नुहोस्</h1> {/* Register New Account */}

      {registrationSuccess ? (
        <div style={{ textAlign: 'center', padding: '20px', backgroundColor: '#e8f5e9', border: '1px solid #a5d6a7', borderRadius: '4px' }}>
          <h2 style={{ color: '#2e7d32' }}>दर्ता सफल भयो!</h2> {/* Registration Successful! */}
          <p>तपाईंको खाता सिर्जना गरिएको छ। कृपया आफ्नो इमेल जाँच गर्नुहोस् र प्रमाणिकरण लिङ्कमा क्लिक गर्नुहोस्।</p> {/* Your account has been created. Please check your email and click the verification link. */}
          <p style={{ marginTop: '15px' }}>
            <Link href="/login" className="button">लगइन पृष्ठमा जानुहोस्</Link> {/* Go to Login Page */}
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Name (Required) */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="name" className="field-label">पूरा नाम: <span style={{color: 'red'}}>*</span></label>
            <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} required className="search-box" disabled={isRegistering} />
          </div>

          {/* Email (Required) */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="email" className="field-label">इमेल: <span style={{color: 'red'}}>*</span></label>
            <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="search-box" disabled={isRegistering} placeholder="your@email.com" />
          </div>

          {/* Password (Required) */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="password" className="field-label">पासवर्ड: <span style={{color: 'red'}}>*</span></label>
            <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="search-box" disabled={isRegistering} placeholder=" कम्तिमा ६ अक्षर" /> {/* At least 6 characters */}
          </div>

          {/* Confirm Password (Required) */}
          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="confirmPassword" className="field-label">पासवर्ड पुष्टि गर्नुहोस्: <span style={{color: 'red'}}>*</span></label>
            <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="search-box" disabled={isRegistering} placeholder="पुन: पासवर्ड टाइप गर्नुहोस्" /> {/* Type password again */}
          </div>

          {/* Optional Fields */}
          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="companyName" className="field-label">कम्पनीको नाम (वैकल्पिक):</label>
            <input type="text" id="companyName" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className="search-box" disabled={isRegistering} />
          </div>

          <div style={{ marginBottom: '15px' }}>
            <label htmlFor="address" className="field-label">ठेगाना (वैकल्पिक):</label>
            <input type="text" id="address" value={address} onChange={(e) => setAddress(e.target.value)} className="search-box" disabled={isRegistering} />
          </div>

          <div style={{ marginBottom: '25px' }}>
            <label htmlFor="phoneNumber" className="field-label">फोन नम्बर (वैकल्पिक):</label>
            <input type="tel" id="phoneNumber" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="search-box" disabled={isRegistering} />
          </div>

          {/* Error Message */}
          {error && <p style={{ color: 'red', textAlign: 'center', marginBottom: '15px' }}>{error}</p>}

          {/* Submit Button */}
          <div className="button-container" style={{ marginTop: '0' }}>
            <button type="submit" className="button button-search" disabled={isRegistering}>
              {isRegistering ? 'दर्ता हुँदैछ...' : 'दर्ता गर्नुहोस्'} {/* Registering... : Register */}
            </button>
          </div>
        </form>
      )}

       {/* Link to Login */}
       {!registrationSuccess && (
            <p style={{ marginTop: '30px', textAlign: 'center' }}>
                पहिले नै खाता छ? <Link href="/login">यहाँ लगइन गर्नुहोस्</Link> {/* Already have an account? Login here */}
            </p>
        )}
    </div>
  );
}