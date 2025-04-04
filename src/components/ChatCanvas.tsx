// src/components/ChatCanvas.tsx
import React from 'react';

// Placeholder component for the canvas area
export const ChatCanvas = () => {
  return (
    <div style={{
      flex: '0 0 50%', // Takes 50% width
      padding: '20px',
      backgroundColor: '#f0f0f0', // Light grey background for distinction
      borderLeft: '1px solid #ccc', // Separator line
      overflow: 'hidden', // Prevent overflow in canvas area
      boxSizing: 'border-box' // Include padding/border in width calculation
    }}>
      {/* Placeholder Canvas Area */}
      <div style={{
        height: '100%',
        backgroundColor: 'white',
        borderRadius: '10px', // Rounded rectangle
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)', // Shadow
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        fontSize: '20px',
        color: '#888'
      }}>
        Canvas Area
      </div>
    </div>
  );
};