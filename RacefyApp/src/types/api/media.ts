// ============ PHOTOS & MEDIA ============

export interface Photo {
  id: number;
  user_id: number;
  /** Position within the owner's media set; continuous across post + activity. */
  order?: number;
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  url: string;
}

export interface Media {
  id: number;
  user_id: number;
  type: 'image' | 'video';
  path: string;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null; // video duration in seconds
  thumbnail_url: string | null; // video thumbnail
  caption: string | null;
  url: string;
}

export interface Video {
  id: number;
  url: string;
  thumbnail_url: string | null;
  filename: string;
  mime_type: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  caption: string | null;
  order: number;
  created_at: string;
}

// Local media item for picking/uploading
export interface MediaItem {
  uri: string;
  type: 'image' | 'video';
  duration?: number;
  width?: number;
  height?: number;
}
