export type SocialPlatform = 'facebook' | 'twitter' | 'linkedin' | 'reddit';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  connected: boolean;
  username: string;
  profileImage?: string;
}

export interface Post {
  id: string;
  content: string;
  platforms: SocialPlatform[];
  scheduledFor?: Date;
  status: 'draft' | 'scheduled' | 'published' | 'failed';
  mediaUrls?: string[];
  platformSpecificContent?: Record<SocialPlatform, {
    content: string;
    mediaUrls?: string[];
  }>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  actionUrl?: string;
  timestamp: Date;
}