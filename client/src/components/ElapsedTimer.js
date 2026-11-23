import React, { useState, useEffect } from 'react';

function ElapsedTimer({ startTime, style = {} }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Calculate initial elapsed time
    const calculateElapsed = () => {
      // Parse the startTime - handle both ISO and SQLite datetime formats
      let start;
      if (startTime.includes('T')) {
        // ISO format
        start = new Date(startTime);
      } else {
        // SQLite datetime('now') returns UTC time without 'Z' marker
        // Format: "YYYY-MM-DD HH:MM:SS"
        // Add 'Z' to treat it as UTC
        start = new Date(startTime.replace(' ', 'T') + 'Z');
      }

      const now = new Date();
      const diff = Math.floor((now - start) / 1000); // seconds

      // Debug logging (remove in production)
      if (elapsed === 0) {
        console.log('Timer Debug:', {
          startTime: startTime,
          parsedStart: start.toISOString(),
          now: now.toISOString(),
          diffSeconds: diff,
          diffMinutes: Math.floor(diff / 60)
        });
      }

      // If diff is negative or unreasonably large, return 0
      if (diff < 0 || diff > 86400) { // More than 24 hours
        console.warn('Invalid time difference:', diff, 'startTime:', startTime);
        return 0;
      }

      return diff;
    };

    // Update immediately
    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Convert seconds to MM:SS format
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  // Determine color based on minutes
  const getColor = () => {
    if (minutes <= 5) {
      return {
        background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
        border: '3px solid #15803d',
        shadow: '0 4px 16px rgba(22, 163, 74, 0.4)'
      };
    } else if (minutes <= 10) {
      return {
        background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
        border: '3px solid #d97706',
        shadow: '0 4px 16px rgba(245, 158, 11, 0.4)'
      };
    } else {
      return {
        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        border: '3px solid #991b1b',
        shadow: '0 4px 16px rgba(220, 38, 38, 0.4)'
      };
    }
  };

  const colors = getColor();

  return (
    <div
      style={{
        background: colors.background,
        border: colors.border,
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        boxShadow: colors.shadow,
        animation: minutes > 10 ? 'pulse 2s infinite' : 'none',
        ...style
      }}
    >
      <div style={{
        fontSize: '14px',
        color: 'white',
        opacity: 0.9,
        marginBottom: '8px',
        fontWeight: '600'
      }}>
        ⏱️ זמן שעבר מההזנקה
      </div>
      <div style={{
        fontSize: '48px',
        fontWeight: '700',
        color: 'white',
        fontFamily: 'monospace',
        letterSpacing: '2px'
      }}>
        {timeString}
      </div>
      <div style={{
        fontSize: '12px',
        color: 'white',
        opacity: 0.8,
        marginTop: '4px'
      }}>
        {minutes === 1 ? 'דקה' : 'דקות'} {minutes}
      </div>
    </div>
  );
}

export default ElapsedTimer;
