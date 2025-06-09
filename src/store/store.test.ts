import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useStore } from './index'; // Adjust path as necessary
import type { AppState } from './index'; // Assuming AppState is exported for initial state type
import { supabase, isSupabaseConfigured } from '../lib/supabase'; // To be mocked

// Mock Supabase
vi.mock('../lib/supabase', () => {
  const actualSupabase = vi.importActual('../lib/supabase') as typeof import('../lib/supabase'); // Get actual for isSupabaseConfigured
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: null })), // Default mock for select().eq()
          order: vi.fn(() => ({ data: null, error: null })), // Default mock for select().order()
        })),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => ({ data: null, error: null })), // Default mock for insert().select().single()
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: null })), // Default mock for update().eq()
        })),
        delete: vi.fn(() => ({
          eq: vi.fn(() => ({ data: null, error: null })), // Default mock for delete().eq()
        })),
        upsert: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(() => ({ data: null, error: null })),
            })),
          })),
      })),
    },
    isSupabaseConfigured: actualSupabase.isSupabaseConfigured, // Use actual for this helper unless it needs mocking
  };
});


// Helper to deeply mock Supabase chain
const mockSupabaseChain = (method: 'select' | 'insert' | 'update' | 'delete' | 'upsert', response: { data?: any; error?: any }, chainSteps: Array<{ func: string, args?: any[] }> = []) => {
    let queryBuilder: any = {};

    const finalStep = chainSteps.pop(); // e.g., { func: 'single' } or { func: 'eq', args: [...] } for update/delete

    if (finalStep) {
      queryBuilder[finalStep.func] = vi.fn((...args) => {
        if (finalStep.args && finalStep.args.length > 0) {
            // For functions like eq that might be called multiple times
            if(args.length > 0 && finalStep.args.some((arg, i) => arg !== args[i])) {
                return queryBuilder; // Allow further chaining if args don't match
            }
        }
        return Promise.resolve(response);
      });
    } else { // Should not happen if finalStep is always defined for an operation
        return Promise.resolve(response);
    }

    chainSteps.reverse().forEach(step => {
      const nextLink = { ...queryBuilder };
      queryBuilder = {};
      queryBuilder[step.func] = vi.fn(() => nextLink);
    });

    (supabase.from as ReturnType<typeof vi.fn>).mockReturnValue({
      [method]: vi.fn(() => queryBuilder),
    });
};


const initialStoreState = useStore.getState();

describe('Zustand Store (src/store/index.ts)', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useStore.setState(JSON.parse(JSON.stringify(initialStoreState)), true);
    vi.clearAllMocks(); // Clear all Vitest mocks

    // Mock console.error to avoid cluttering test output with expected errors
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks(); // Restore console.error
  });

  describe('Initial State', () => {
    it('should have correct initial values for posts, accounts, notifications, and user', () => {
      const state = useStore.getState();
      expect(state.posts).toEqual([]);
      expect(state.accounts).toEqual([]);
      expect(state.notifications).toEqual([]);
      expect(state.user).toBeNull();
    });

    it('should have correct initial selector values', () => {
      const state = useStore.getState();
      expect(state.totalPostsCount()).toBe(0);
      expect(state.connectedAccountsCount()).toBe(0);
      expect(state.scheduledPostsCount()).toBe(0);
      expect(state.publishedPostsCount()).toBe(0);
    });
  });

  describe('setUser Action', () => {
    it('should update state.user when a user object is provided', () => {
      const mockUser = { id: 'user123', email: 'test@example.com' };
      useStore.getState().setUser(mockUser);
      expect(useStore.getState().user).toEqual(mockUser);
    });

    it('should set state.user to null when null is provided', () => {
      useStore.getState().setUser({ id: 'user123', email: 'test@example.com' }); // Set a user first
      useStore.getState().setUser(null);
      expect(useStore.getState().user).toBeNull();
    });
  });

  describe('loadInitialData Action', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const mockPosts = [{ id: 'p1', content: 'Post 1' }];
    const mockAccounts = [{ id: 'a1', platform: 'twitter' }];

    it('should load posts and accounts if user is logged in and Supabase is configured', async () => {
      useStore.getState().setUser(mockUser);

      // Mock Supabase response for posts
      mockSupabaseChain('select', { data: mockPosts, error: null }, [ {func: 'eq', args: ['user_id', mockUser.id]} ]);
      // Mock Supabase response for accounts (need to ensure 'from' is called again correctly)
      (supabase.from as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => ({ // For posts
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockPosts, error: null })),
          })),
        }))
        .mockImplementationOnce(() => ({ // For accounts
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockAccounts, error: null })),
          })),
        }));

      await useStore.getState().loadInitialData();

      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(supabase.from).toHaveBeenCalledWith('accounts');
      expect(useStore.getState().posts).toEqual(mockPosts);
      expect(useStore.getState().accounts).toEqual(mockAccounts);
    });

    it('should handle errors during data loading and reset posts/accounts', async () => {
      useStore.getState().setUser(mockUser);
      const postError = { message: 'Failed to load posts' };

      (supabase.from as ReturnType<typeof vi.fn>)
        .mockImplementationOnce(() => ({ // For posts
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: null, error: postError })),
          })),
        }))
        .mockImplementationOnce(() => ({ // For accounts (should still try to load)
          select: vi.fn(() => ({
            eq: vi.fn(() => Promise.resolve({ data: mockAccounts, error: null })),
          })),
        }));

      await useStore.getState().loadInitialData();

      expect(console.error).toHaveBeenCalledWith('Error loading initial data:', postError);
      expect(useStore.getState().posts).toEqual([]);
      expect(useStore.getState().accounts).toEqual([]); // Should be reset even if one fails
    });

    it('should not call Supabase and reset state if user is null', async () => {
      useStore.getState().setUser(null);
      await useStore.getState().loadInitialData();

      expect(supabase.from).not.toHaveBeenCalled();
      expect(useStore.getState().posts).toEqual([]);
      expect(useStore.getState().accounts).toEqual([]);
    });
  });

  describe('addPost Action', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const newPostData = { content: 'New Post', platforms: ['twitter'] } as any; // Type assertion for partial post
    const mockApiResponse = { ...newPostData, id: 'newP1', user_id: mockUser.id };

    it('should add a post if user is logged in and Supabase call is successful', async () => {
      useStore.getState().setUser(mockUser);
      mockSupabaseChain('insert', { data: mockApiResponse, error: null }, [{func: 'select'}, {func: 'single'}]);

      await useStore.getState().addPost(newPostData);

      expect(supabase.from).toHaveBeenCalledWith('posts');
      expect(useStore.getState().posts).toContainEqual(mockApiResponse);
    });

    it('should throw an error and not add post if Supabase call fails', async () => {
      useStore.getState().setUser(mockUser);
      const postError = { message: 'Failed to insert post' };
      mockSupabaseChain('insert', { data: null, error: postError }, [{func: 'select'}, {func: 'single'}]);

      await expect(useStore.getState().addPost(newPostData)).rejects.toThrow(postError.message);
      expect(useStore.getState().posts).not.toContainEqual(expect.objectContaining({ content: 'New Post' }));
      expect(console.error).toHaveBeenCalledWith('Error adding post:', postError);

    });

    it('should throw an error if user is not authenticated', async () => {
      useStore.getState().setUser(null);
      await expect(useStore.getState().addPost(newPostData)).rejects.toThrow('User is not authenticated. Cannot add post.');
    });
  });

  describe('removeAccount Action', () => {
    const mockUser = { id: 'user123', email: 'test@example.com' };
    const accountToRemove = { id: 'acc1', platform: 'twitter', connected: true, username: 'testUser' } as SocialAccount;

    beforeEach(() => {
        // Set up initial state with an account
        useStore.setState({ accounts: [accountToRemove] });
    });

    it('should remove an account if user is logged in and Supabase call is successful', async () => {
        useStore.getState().setUser(mockUser);
        mockSupabaseChain('delete', { data: [{}], error: null }, [{func: 'eq', args: ['id', accountToRemove.id]}, {func: 'eq', args: ['user_id', mockUser.id]}]);

        await useStore.getState().removeAccount(accountToRemove.id);

        expect(supabase.from).toHaveBeenCalledWith('accounts');
        expect(useStore.getState().accounts).not.toContainEqual(accountToRemove);
    });

    it('should throw an error and not remove account if Supabase call fails', async () => {
        useStore.getState().setUser(mockUser);
        const deleteError = { message: 'Failed to delete account' };
        mockSupabaseChain('delete', { data: null, error: deleteError }, [{func: 'eq', args: ['id', accountToRemove.id]}, {func: 'eq', args: ['user_id', mockUser.id]}]);

        await expect(useStore.getState().removeAccount(accountToRemove.id)).rejects.toThrow(deleteError.message);
        expect(useStore.getState().accounts).toContainEqual(accountToRemove);
        expect(console.error).toHaveBeenCalledWith('Error removing account:', deleteError);
    });

    it('should throw an error if user is not authenticated', async () => {
        useStore.getState().setUser(null);
        await expect(useStore.getState().removeAccount(accountToRemove.id)).rejects.toThrow('User is not authenticated. Cannot remove account.');
    });
  });

  // Briefly outline tests for other data manipulation actions:
  // updatePost: Similar to addPost/removeAccount - check success, failure, auth.
  // deletePost: Similar to removeAccount - check success, failure, auth.
  // addAccount: Similar to addPost (uses upsert) - check success, failure, auth, and platform collision logic.

  describe('Notification Actions', () => {
    const notification1 = { id: 'n1', type: 'success', message: 'Success!', timestamp: new Date() } as NotificationMessage;
    const notification2 = { id: 'n2', type: 'error', message: 'Error!', timestamp: new Date() } as NotificationMessage;

    it('addNotification should add a notification to the state', () => {
      useStore.getState().addNotification(notification1);
      expect(useStore.getState().notifications).toContainEqual(notification1);

      useStore.getState().addNotification(notification2);
      expect(useStore.getState().notifications).toContainEqual(notification2);
      expect(useStore.getState().notifications.length).toBe(2);
    });

    it('removeNotification should remove the specified notification from the state', () => {
      useStore.getState().addNotification(notification1);
      useStore.getState().addNotification(notification2);

      useStore.getState().removeNotification(notification1.id);
      expect(useStore.getState().notifications).not.toContainEqual(notification1);
      expect(useStore.getState().notifications).toContainEqual(notification2);
      expect(useStore.getState().notifications.length).toBe(1);
    });
  });

  describe('Selectors', () => {
    const post1 = { id: 'p1', content: 'Post 1', status: 'draft', platforms: ['twitter'] } as any;
    const post2 = { id: 'p2', content: 'Post 2', status: 'scheduled', platforms: ['facebook'] } as any;
    const post3 = { id: 'p3', content: 'Post 3', status: 'published', platforms: ['linkedin'] } as any;
    const account1 = { id: 'a1', platform: 'twitter' } as any;
    const account2 = { id: 'a2', platform: 'facebook' } as any;

    it('should return correct values from selectors based on state', () => {
      // Manually set state for selector testing
      useStore.setState({ posts: [post1, post2, post3], accounts: [account1, account2] });

      const state = useStore.getState();
      expect(state.totalPostsCount()).toBe(3);
      expect(state.connectedAccountsCount()).toBe(2);
      expect(state.scheduledPostsCount()).toBe(1);
      expect(state.publishedPostsCount()).toBe(1);

      useStore.setState({ posts: [post1], accounts: [account1] });
      expect(state.totalPostsCount()).toBe(1);
      expect(state.connectedAccountsCount()).toBe(1);
      expect(state.scheduledPostsCount()).toBe(0);
      expect(state.publishedPostsCount()).toBe(0);
    });
  });
});

// Type for SocialAccount to be used in tests if not easily importable
interface SocialAccount {
  id: string;
  platform: string; // Simplified for test
  connected: boolean;
  username: string;
  profileImage?: string;
}

// Type for NotificationMessage if not easily importable
interface NotificationMessage {
    id: string;
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    actionUrl?: string;
    timestamp: Date;
}
