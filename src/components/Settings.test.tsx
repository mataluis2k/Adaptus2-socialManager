import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Settings from './Settings';
import { useStore } from '../store';
import { api } from '../lib/api';
import type { SocialAccount, SocialPlatform } from '../types';

// Mock VITE_API_URL
vi.stubGlobal('importMetaEnv', { VITE_API_URL: 'http://localhost:3000' });
Object.defineProperty(import.meta, 'env', {
  value: { VITE_API_URL: 'http://localhost:3000' },
  writable: true,
});


// Mock Zustand store
vi.mock('../store', () => ({
  useStore: vi.fn(),
}));

// Mock API module
vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal() as typeof import('../lib/api');
  return {
    ...actual,
    api: {
      ...actual.api,
      accounts: {
        ...actual.api.accounts,
        delete: vi.fn(),
      },
    },
  };
});

// Helper to set up store state for tests
const setupStoreMocks = (mockState: Partial<ReturnType<typeof useStore>>) => {
  (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
    const fullMockState = {
      accounts: [],
      addAccount: vi.fn(), // Not directly tested here, but part of store
      removeAccount: vi.fn(),
      addNotification: vi.fn(),
      loadInitialData: vi.fn(),
      ...mockState, // Override defaults with provided state
    };
    return selector(fullMockState);
  });
};


describe('Settings Component', () => {
  const mockRemoveAccount = vi.fn();
  const mockAddNotification = vi.fn();
  const mockLoadInitialData = vi.fn();

  // Holder for window.location spies
  let locationHrefSpy: ReturnType<typeof vi.spyOn> | null = null;
  let locationSpy: ReturnType<typeof vi.spyOn> | null = null;
  let historyReplaceStateSpy: ReturnType<typeof vi.spyOn> | null = null;


  beforeEach(() => {
    vi.clearAllMocks();

    // Default store mock setup for each test
    setupStoreMocks({
      accounts: [],
      removeAccount: mockRemoveAccount,
      addNotification: mockAddNotification,
      loadInitialData: mockLoadInitialData,
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
    locationHrefSpy?.mockRestore();
    locationSpy?.mockRestore();
    historyReplaceStateSpy?.mockRestore();
  });

  describe('Initial Rendering', () => {
    it('renders "Connected Accounts" heading and all platform sections', () => {
      render(<Settings />);
      expect(screen.getByRole('heading', { name: /connected accounts/i })).toBeInTheDocument();
      expect(screen.getByText(/twitter/i)).toBeInTheDocument();
      expect(screen.getByText(/facebook/i)).toBeInTheDocument();
      expect(screen.getByText(/linkedin/i)).toBeInTheDocument();
      expect(screen.getByText(/reddit/i)).toBeInTheDocument();
    });

    it('shows "Connect" buttons when no accounts are connected', () => {
      setupStoreMocks({ accounts: [] });
      render(<Settings />);
      expect(screen.getAllByRole('button', { name: /connect/i })).toHaveLength(4); // Assuming 4 platforms
    });

    it('shows account info and "Disconnect" button for connected accounts', () => {
      const mockAccounts: SocialAccount[] = [
        { id: 't1', platform: 'twitter', connected: true, username: 'twitterUser', profileImage: 'img.png' },
        { id: 'f1', platform: 'facebook', connected: true, username: 'fbUser', profileImage: 'img.png' },
      ];
      setupStoreMocks({ accounts: mockAccounts });
      render(<Settings />);

      expect(screen.getByText('twitterUser')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /disconnect/i })).toHaveLength(2);
      expect(screen.getAllByRole('button', { name: /connect/i })).toHaveLength(2); // For LinkedIn and Reddit
    });
  });

  describe('Connect Account Flow', () => {
    beforeEach(() => {
        // Mock window.location.href for redirection testing
        // Important: Do this before render if the component uses it on mount or effect
        locationHrefSpy = vi.spyOn(window, 'location', 'get');
        Object.defineProperty(window, 'location', {
            value: { ...window.location, href: '' }, // Start with an empty href or a base URL
            writable: true,
        });
        locationHrefSpy = vi.spyOn(window.location, 'href', 'set');
    });

    it('redirects to correct OAuth URL and shows "Connecting..." state on "Connect" click', async () => {
      render(<Settings />);
      const connectTwitterButton = screen.getAllByRole('button', { name: /connect/i })[0]; // Assuming Twitter is first

      await userEvent.click(connectTwitterButton);

      expect(window.location.href).toBe('http://localhost:3000/api/connect/twitter');
      // Check for connecting state (button text changes)
      // The button might be replaced or text changed. If it's just disabled + text:
      expect(connectTwitterButton).toBeDisabled();
      expect(connectTwitterButton.textContent).toMatch(/connecting.../i);
    });

    it('shows error notification if VITE_API_URL is not configured', async () => {
        Object.defineProperty(import.meta, 'env', {
            value: { VITE_API_URL: undefined }, // Simulate undefined API URL
            writable: true,
        });
        render(<Settings />);
        const connectTwitterButton = screen.getAllByRole('button', { name: /connect/i })[0];
        await userEvent.click(connectTwitterButton);
        expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            message: 'API URL is not configured. Cannot connect to social platforms.',
        }));
        expect(window.location.href).toBe(''); // No redirect should happen
        expect(connectTwitterButton).not.toBeDisabled(); // Button should re-enable
    });
  });

  describe('Disconnect Account Flow', () => {
    const mockAccount: SocialAccount = { id: 't1', platform: 'twitter', connected: true, username: 'twitterUser' };

    it('calls api.accounts.delete, updates store, and shows success notification on successful disconnect', async () => {
      setupStoreMocks({ accounts: [mockAccount] });
      (api.accounts.delete as ReturnType<typeof vi.fn>).mockResolvedValue({}); // Simulate successful API call

      render(<Settings />);
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await userEvent.click(disconnectButton);

      expect(disconnectButton).toBeDisabled();
      expect(disconnectButton.textContent).toMatch(/disconnecting.../i);

      await waitFor(() => {
        expect(api.accounts.delete).toHaveBeenCalledWith(mockAccount.id);
      });
      expect(mockRemoveAccount).toHaveBeenCalledWith(mockAccount.id);
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: `Disconnected from ${mockAccount.platform} successfully.`,
      }));
    });

    it('shows error notification on API failure during disconnect', async () => {
      setupStoreMocks({ accounts: [mockAccount] });
      const errorMessage = 'API Deletion Error';
      (api.accounts.delete as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      render(<Settings />);
      const disconnectButton = screen.getByRole('button', { name: /disconnect/i });
      await userEvent.click(disconnectButton);

      await waitFor(() => {
        expect(api.accounts.delete).toHaveBeenCalledWith(mockAccount.id);
      });
      expect(mockRemoveAccount).not.toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: `Failed to disconnect from ${mockAccount.platform}: ${errorMessage}`,
      }));
      expect(disconnectButton).not.toBeDisabled(); // Should re-enable
    });
  });

  describe('OAuth Callback Handling (Simplified)', () => {
    const originalLocation = window.location;

    beforeEach(() => {
      // Mock window.location and window.history for this specific suite
      // We need to mock `search` and `pathname` getters, and `replaceState` method
      locationSpy = vi.spyOn(window, 'location', 'get');
      historyReplaceStateSpy = vi.spyOn(window.history, 'replaceState', 'get')(); // Get the spy function
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', originalLocation); // Restore original location
        historyReplaceStateSpy?.mockRestore();
        locationSpy?.mockRestore();
    });

    it('handles successful OAuth callback (status=success)', async () => {
      locationSpy.mockImplementation(() => ({
        ...originalLocation,
        search: '?status=success&platform=twitter&message=Successfully connected',
        pathname: '/settings', // Or whatever the path is
      }));

      render(<Settings />); // useEffect should run

      await waitFor(() => {
        expect(mockLoadInitialData).toHaveBeenCalled();
      });
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Successfully connected',
      }));
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/settings');
    });

    it('handles failed OAuth callback (status=error)', async () => {
      locationSpy.mockImplementation(() => ({
        ...originalLocation,
        search: '?status=error&platform=twitter&message=Connection failed',
        pathname: '/settings',
      }));

      render(<Settings />);

      await waitFor(() => { // addNotification is called directly, no async needed for it
          expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
            type: 'error',
            message: 'Connection failed',
          }));
      });
      expect(mockLoadInitialData).not.toHaveBeenCalled();
      expect(window.history.replaceState).toHaveBeenCalledWith({}, '', '/settings');
    });

    it('does nothing if no relevant query parameters are present', () => {
      locationSpy.mockImplementation(() => ({
        ...originalLocation,
        search: '?otherparam=value',
        pathname: '/settings',
      }));

      render(<Settings />);

      expect(mockLoadInitialData).not.toHaveBeenCalled();
      expect(mockAddNotification).not.toHaveBeenCalled();
      expect(window.history.replaceState).not.toHaveBeenCalled();
    });
  });
});
