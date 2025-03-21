/*
  # Initial Schema Setup for Social Media Manager

  1. New Tables
    - `accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `platform` (text)
      - `username` (text)
      - `profile_image` (text)
      - `connected` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `content` (text)
      - `platforms` (text[])
      - `scheduled_for` (timestamp)
      - `status` (text)
      - `media_urls` (text[])
      - `platform_specific_content` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
*/

-- Create accounts table
CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  platform text NOT NULL,
  username text NOT NULL,
  profile_image text,
  connected boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform)
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  content text NOT NULL,
  platforms text[] NOT NULL,
  scheduled_for timestamptz,
  status text NOT NULL DEFAULT 'draft',
  media_urls text[],
  platform_specific_content jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for accounts
CREATE POLICY "Users can manage their own accounts"
  ON accounts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create policies for posts
CREATE POLICY "Users can manage their own posts"
  ON posts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);