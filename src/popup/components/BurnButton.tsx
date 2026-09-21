import React, { useState } from 'react';
import { hardBurnAllData } from '../../telemetry/client';

interface BurnButtonProps {
  onBurnCompleted: () => void;
}

export const BurnButton: React.FC<BurnButtonProps> = ({ onBurnCompleted }) => {
  const [burning, setBurning] = useState(false);
  const [burned, setBurned] = useState(false);

  const handleBurn = async () => {
    setBurning(true);
    try {
      await hardBurnAllData();
      setBurned(true);
      onBurnCompleted();
      setTimeout(() => setBurned(false), 3000);
    } catch (err) {
      console.error('Hard Burn failed:', err);
    } finally {
      setBurning(false);
    }
  };

  return (
    <button
      onClick={handleBurn}
      disabled={burning}
      style={{
        flex: 1,
        backgroundColor: burned ? '#10b981' : '#7f1d1d',
        border: `1px solid ${burned ? '#059669' : '#dc2626'}`,
        color: '#ffffff',
        padding: '8px 12px',
        borderRadius: '6px',
        fontSize: '11px',
        fontWeight: 700,
        letterSpacing: '0.04em',
        cursor: burning ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        transition: 'all 0.15s ease-in-out',
        fontFamily: 'inherit',
      }}
    >
      <span>{burned ? '✓' : '🔥'}</span>
      <span>{burning ? 'PURGING...' : burned ? 'AMNESIA ENGAGED' : 'HARD BURN'}</span>
    </button>
  );
};
