export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: {
      accounts: {
        Row: {
          id: string;
          user_id: string;
          platform: string;
          username: string;
          profile_image: string | null;
          connected: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          platform: string;
          username: string;
          profile_image?: string | null;
          connected?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          platform?: string;
          username?: string;
          profile_image?: string | null;
          connected?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          platforms: string[];
          scheduled_for: string | null;
          status: string;
          media_urls: string[] | null;
          platform_specific_content: Json | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          platforms: string[];
          scheduled_for?: string | null;
          status?: string;
          media_urls?: string[] | null;
          platform_specific_content?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          platforms?: string[];
          scheduled_for?: string | null;
          status?: string;
          media_urls?: string[] | null;
          platform_specific_content?: Json | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
    };
  };
}

