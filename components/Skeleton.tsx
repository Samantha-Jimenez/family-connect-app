'use client';
import React from 'react';

interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular' | 'photo';
  width?: string | number;
  height?: string | number;
  lines?: number; // For text variant
  animation?: 'pulse' | 'wave' | 'none';
}

const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  variant = 'rectangular',
  width,
  height,
  lines = 1,
  animation = 'pulse',
}) => {
  const baseClasses = 'bg-gray-200 rounded';
  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'animate-[shimmer_1.5s_ease-in-out_infinite]',
    none: '',
  };

  const variantClasses = {
    text: 'h-4',
    circular: 'rounded-full',
    rectangular: 'rounded',
    photo: 'rounded-lg aspect-square',
  };

  const style: React.CSSProperties = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className} role="status" aria-label="Loading content">
        <span className="sr-only">Loading content</span>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${variantClasses.text} ${animationClasses[animation]} mb-2 ${
              index === lines - 1 ? 'w-3/4' : 'w-full'
            }`}
            style={index === lines - 1 ? { ...style, width: '75%' } : style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading</span>
    </div>
  );
};

// Photo grid skeleton for photo galleries
export const PhotoGridSkeleton: React.FC<{ count?: number; className?: string }> = ({
  count = 12,
  className = '',
}) => {
  return (
    <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 ${className}`} role="status" aria-label="Loading photos">
      <span className="sr-only">Loading photos</span>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} variant="photo" animation="pulse" />
      ))}
    </div>
  );
};

// Card skeleton for profile cards, etc.
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`} role="status" aria-label="Loading card">
      <span className="sr-only">Loading card</span>
      <Skeleton variant="circular" width={64} height={64} className="mb-4" />
      <Skeleton variant="text" lines={2} className="mb-2" />
      <Skeleton variant="text" width="60%" />
    </div>
  );
};

export default Skeleton;
