// ============ SOCIAL SHARING ============

export interface ShareLinkPlatform {
  url: string;
  text?: string;
}

export interface ShareLinkResponse {
  url: string;
  title: string;
  description: string;
  hashtags?: string[];
  image?: string | null;
  platforms: {
    facebook: ShareLinkPlatform;
    twitter: ShareLinkPlatform;
    linkedin: ShareLinkPlatform;
    whatsapp: ShareLinkPlatform;
    telegram: ShareLinkPlatform;
  };
}

// ============ PHOTO OVERLAY SHARE ============

export type PhotoOverlayFormat = 'photo_social' | 'photo_story' | 'photo_square';

export interface PhotoOverlayResponse {
  image: string;
  format: string;
  photo_id: number;
}
