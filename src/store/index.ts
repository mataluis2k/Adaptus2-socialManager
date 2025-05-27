import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type { Post, SocialAccount, NotificationMessage } from '../types';

interface AppState {
  posts: Post[];
  accounts: SocialAccount[];
  notifications: NotificationMessage[];
  user: null | { id: string; email: string };
  addPost: (post: Post) => Promise<void>;
  updatePost: (post: Post) => Promise<void>;
  deletePost: (id: string) => Promise<void>;
  addAccount: (account: SocialAccount) => Promise<void>;
  removeAccount: (id: string) => Promise<void>;
  addNotification: (notification: NotificationMessage) => void;
  removeNotification: (id: string) => void;
  loadInitialData: () => Promise<void>;
  setUser: (user: { id: string; email: string } | null) => void;
  totalPostsCount: () => number;
  connectedAccountsCount: () => number;
  scheduledPostsCount: () => number;
  publishedPostsCount: () => number;
}

export const useStore = create<AppState>((set, get) => ({
  posts: [],
  accounts: [],
  notifications: [],
  user: null,

  setUser: (user) => set({ user }),

  loadInitialData: async () => {
    const user = get().user;
    if (!user || !isSupabaseConfigured()) {
      set({ posts: [], accounts: [] });
      return;
    }

    try {
      // Load posts
      const { data: posts, error: postsError } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id);

      if (postsError) throw postsError;

      // Load accounts
      const { data: accounts, error: accountsError } = await supabase
        .from('accounts')
        .select('*')
        .eq('user_id', user.id);

      if (accountsError) throw accountsError;

      set({ posts, accounts });
    } catch (error) {
      console.error('Error loading initial data:', error);
      set({ posts: [], accounts: [] });
    }
  },

  addPost: async (post) => {
    const user = get().user;
    if (!user) {
      throw new Error('User is not authenticated. Cannot add post.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Cannot add post.');
    }

    try {
      const { data, error } = await supabase
        .from('posts')
        .insert([{ ...post, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      set((state) => ({ posts: [...state.posts, data] }));
    } catch (error) {
      console.error('Error adding post:', error);
      throw error;
    }
  },

  updatePost: async (post) => {
    const user = get().user;
    if (!user) {
      throw new Error('User is not authenticated. Cannot update post.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Cannot update post.');
    }

    try {
      const { error } = await supabase
        .from('posts')
        .update(post)
        .eq('id', post.id)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        posts: state.posts.map((p) => (p.id === post.id ? post : p))
      }));
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  },

  deletePost: async (id) => {
    const user = get().user;
    if (!user) {
      throw new Error('User is not authenticated. Cannot delete post.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Cannot delete post.');
    }

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        posts: state.posts.filter((p) => p.id !== id)
      }));
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  },

  addAccount: async (account) => {
    const user = get().user;
    if (!user) {
      throw new Error('User is not authenticated. Cannot add account.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Cannot add account.');
    }

    try {
      const { data, error } = await supabase
        .from('accounts')
        .upsert([{ ...account, user_id: user.id }])
        .select()
        .single();

      if (error) throw error;

      set((state) => {
        const existingIndex = state.accounts.findIndex(
          (a) => a.platform === account.platform
        );

        if (existingIndex >= 0) {
          const newAccounts = [...state.accounts];
          newAccounts[existingIndex] = data;
          return { accounts: newAccounts };
        }

        return { accounts: [...state.accounts, data] };
      });
    } catch (error) {
      console.error('Error adding account:', error);
      throw error;
    }
  },

  removeAccount: async (id) => {
    const user = get().user;
    if (!user) {
      throw new Error('User is not authenticated. Cannot remove account.');
    }
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Cannot remove account.');
    }

    try {
      const { error } = await supabase
        .from('accounts')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      set((state) => ({
        accounts: state.accounts.filter((a) => a.id !== id)
      }));
    } catch (error) {
      console.error('Error removing account:', error);
      throw error;
    }
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [...state.notifications, notification]
    }));
    
    setTimeout(() => {
      get().removeNotification(notification.id);
    }, 5000);
  },

  removeNotification: (id) => set((state) => ({
    notifications: state.notifications.filter((n) => n.id !== id)
  })),

  // Selectors
  totalPostsCount: () => get().posts.length,
  connectedAccountsCount: () => get().accounts.length,
  scheduledPostsCount: () => get().posts.filter(p => p.status === 'scheduled').length,
  publishedPostsCount: () => get().posts.filter(p => p.status === 'published').length,
}));
