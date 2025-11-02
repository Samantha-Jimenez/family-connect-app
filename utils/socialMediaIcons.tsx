import React from 'react';
import { Icon } from '@iconify/react';

interface SocialMediaIconProps {
  className?: string;
  size?: number;
}

export const FacebookIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:facebook-line" className={className} style={{ fontSize: size || 24 }} />
);

export const InstagramIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:instagram-line" className={className} style={{ fontSize: size || 24 }} />
);

export const TwitterIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:twitter-x-line" className={className} style={{ fontSize: size || 24 }} />
);

export const LinkedInIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:linkedin-line" className={className} style={{ fontSize: size || 24 }} />
);

export const TikTokIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:tiktok-fill" className={className} style={{ fontSize: size || 24 }} />
);

export const YouTubeIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:youtube-line" className={className} style={{ fontSize: size || 24 }} />
);

export const GoodReadsIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="simple-icons:goodreads" className={className} style={{ fontSize: size || 24 }} />
);

export const StravaIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="simple-icons:strava" className={className} style={{ fontSize: size || 24 }} />
);

export const GenericIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="ri:link" className={className} style={{ fontSize: size || 24 }} />
);

export const LetterboxdIcon: React.FC<SocialMediaIconProps> = ({ className = "w-6 h-6", size }) => (
  <Icon icon="simple-icons:letterboxd" className={className} style={{ fontSize: size || 24 }} />
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
  letterboxd: LetterboxdIcon,
  other: GenericIcon,
} as const;

export type SocialMediaPlatform = keyof typeof SOCIAL_MEDIA_ICONS;

// Helper function to get the appropriate icon component
export const getSocialMediaIcon = (platform: string) => {
  const normalizedPlatform = platform.toLowerCase() as SocialMediaPlatform;
  return SOCIAL_MEDIA_ICONS[normalizedPlatform] || SOCIAL_MEDIA_ICONS.other;
};
