'use client';
import React from 'react';

type LoadSpinnerProps = {
  size?: number; // outer circle size (default 48)
  color?: string; // base border color
  accentColor?: string; // rotating accent color
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
};

const LoadSpinner: React.FC<LoadSpinnerProps> = ({
  size = 48,
  color = '#FFF',
  accentColor = '#3b82f6',
  className,
  style,
  ariaLabel = 'Loading...',
}) => {
  const cssVars = {
    '--loader-size': `${size}px`,
    '--loader-color': color,
    '--accent-color': accentColor,
    '--border-width': `${Math.max(2, Math.round(size / 16))}px`, // scales the border thickness
  } as React.CSSProperties;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      className={`loader ${className ?? ''}`}
      style={{ ...cssVars, ...style }}
    >
      <span className="sr-only">{ariaLabel}</span>

      <style jsx>{`
        .loader {
          width: var(--loader-size);
          height: var(--loader-size);
          border: var(--border-width) solid var(--loader-color);
          border-radius: 50%;
          display: inline-block;
          position: relative;
          box-sizing: border-box;
          animation: rotation 1s linear infinite;
        }
        .loader::after {
          content: '';
          box-sizing: border-box;
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          width: calc(var(--loader-size) + var(--border-width) * 2);
          height: calc(var(--loader-size) + var(--border-width) * 2);
          border-radius: 50%;
          border: var(--border-width) solid transparent;
          border-bottom-color: var(--accent-color);
        }

        @keyframes rotation {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
      `}</style>
    </span>
  );
};

export default LoadSpinner;
