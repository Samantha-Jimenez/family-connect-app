import React from 'react';

interface SocialMediaIconProps {
  className?: string;
  size?: number;
}

export const FacebookIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--facebook-line] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const InstagramIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--instagram-line] ${className}`} style={{ fontSize: size || 24 }} />
);

export const TwitterIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--twitter-x-line] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const LinkedInIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--linkedin-line] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const TikTokIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--tiktok-fill] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const YouTubeIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[ri--youtube-line] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const GoodReadsIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
    <span className={`icon-[simple-icons--goodreads] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const StravaIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <span className={`icon-[simple-icons--strava] ${className}`} style={{ fontSize: size || 24 }} ></span>
);

export const GenericIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
    <span className={`icon-[ri--link] ${className}`} style={{ fontSize: size || 24 }} />
);

// Social media platform mapping
export const SOCIAL_MEDIA_ICONS = {
  facebook: FacebookIcon,
  instagram: InstagramIcon,
  twitter: TwitterIcon,
  linkedin: LinkedInIcon,
  tiktok: TikTokIcon,
  youtube: YouTubeIcon,
  goodreads: GoodReadsIcon,
  strava: StravaIcon,
  other: GenericIcon,
} as const;

export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_ICONS;

// Helper function to get the appropriate icon component
export const getSocialMediaIcon = (platform: string) => {
  const normalizedPlatform = platform.toLowerCase() as SocialMediaPlatform;
  return SOCIAL_MEDIA_ICONS[normalizedPlatform] || SOCIAL_MEDIA_ICONS.other;
};
