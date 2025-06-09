import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import App from './App'; // Adjust path as necessary
import { useStore } from './store'; // Adjust path as necessary
import { api, getStoredToken, setAuthToken } from './lib/api'; // Adjust path as necessary

// Mock API module
vi.mock('./lib/api', () => ({
  api: {
    auth: {
      getCurrentUser: vi.fn(),
      // Mock other auth methods if App.tsx might call them indirectly
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
    },
    // Mock other api parts if App.tsx uses them (though unlikely directly)
    posts: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    accounts: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
  },
  getStoredToken: vi.fn(),
  setAuthToken: vi.fn(),
  clearAuthToken: vi.fn(), // Mock for completeness
}));

// Mock Zustand store
vi.mock('./store', () => ({
  useStore: vi.fn(),
}));

// Mock Child Components
vi.mock('./components/Auth', () => ({
  default: () => <div data-testid="auth-component">Auth Component - Sign in to your account</div>,
}));

// Layout mock needs to be interactive for navigation testing
// It should accept onNavigate and currentUser props.
let mockLayoutOnNavigate: ((view: string) => void) | null = null;
vi.mock('./components/Layout', () => ({
  default: ({ currentUser, onNavigate, children }: {
    currentUser: any;
    onNavigate: (view: string) => void;
    children: React.ReactNode
  }) => {
    mockLayoutOnNavigate = onNavigate; // Capture onNavigate to simulate clicks
    return (
      <div data-testid="layout-component">
        <h1>Social Manager</h1>
        <p>User: {currentUser?.email}</p>
        <nav>
          <button onClick={() => onNavigate('dashboard')}>Dashboard Nav</button>
          <button onClick={() => onNavigate('compose')}>Compose Nav</button>
          <button onClick={() => onNavigate('schedule')}>Schedule Nav</button>
          <button onClick={() => onNavigate('history')}>History Nav</button>
          <button onClick={() => onNavigate('settings')}>Settings Nav</button>
        </nav>
        <div>{children}</div>
      </div>
    );
  },
}));

vi.mock('./components/Composer', () => ({
  default: () => <div data-testid="composer-component">Composer Component</div>,
}));
vi.mock('./components/Calendar', () => ({
  default: () => <div data-testid="calendar-component">Calendar Component</div>,
}));
vi.mock('./components/History', () => ({
  default: () => <div data-testid="history-component">History Component</div>,
}));
vi.mock('./components/Settings', () => ({
  default: () => <div data-testid="settings-component">Settings Component</div>,
}));


describe('App Component Orchestration', () => {
  const mockSetUser = vi.fn();
  const mockLoadInitialData = vi.fn();
  // Mock selectors used by the dashboard part of App.tsx
  const mockTotalPostsCount = vi.fn(() => 0);
  const mockConnectedAccountsCount = vi.fn(() => 0);
  const mockScheduledPostsCount = vi.fn(() => 0);

  beforeEach(() => {
    vi.clearAllMocks();
    mockLayoutOnNavigate = null; // Reset captured onNavigate

    // Setup default store mock for each test
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = {
        user: null, // Default to no user
        setUser: mockSetUser,
        loadInitialData: mockLoadInitialData,
        totalPostsCount: mockTotalPostsCount,
        connectedAccountsCount: mockConnectedAccountsCount,
        scheduledPostsCount: mockScheduledPostsCount,
        // Add other store properties/selectors if App directly uses them
      };
      return selector(state);
    });
  });

  describe('Unauthenticated User', () => {
    it('renders Auth component when no token is stored', async () => {
      (getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(null);

      render(<App />);

      expect(screen.getByTestId('auth-component')).toBeInTheDocument();
      expect(screen.getByText(/auth component - sign in to your account/i)).toBeInTheDocument();
      expect(screen.queryByTestId('layout-component')).not.toBeInTheDocument();
    });
  });

  describe('Authenticated User - Initial Load & Dashboard View', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockToken = 'mock-auth-token';

    beforeEach(() => {
      // Setup store for an authenticated user scenario
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
        const state = {
          user: mockUser, // Simulate user is now set after auth
          setUser: mockSetUser,
          loadInitialData: mockLoadInitialData,
          totalPostsCount: mockTotalPostsCount,
          connectedAccountsCount: mockConnectedAccountsCount,
          scheduledPostsCount: mockScheduledPostsCount,
        };
        return selector(state);
      });

      (getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);
      (api.auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockLoadInitialData as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
    });

    it('attempts to authenticate, loads initial data, and renders Layout with Dashboard by default', async () => {
      render(<App />);

      // Wait for useEffect to complete auth and initial data load
      await waitFor(() => {
        expect(getStoredToken).toHaveBeenCalled();
        expect(setAuthToken).toHaveBeenCalledWith(mockToken);
        expect(api.auth.getCurrentUser).toHaveBeenCalled();
        expect(mockSetUser).toHaveBeenCalledWith(mockUser);
        expect(mockLoadInitialData).toHaveBeenCalled();
      });

      expect(screen.getByTestId('layout-component')).toBeInTheDocument();
      expect(screen.getByText(/social manager/i)).toBeInTheDocument(); // From Layout mock
      expect(screen.queryByTestId('auth-component')).not.toBeInTheDocument();

      // Check for Dashboard specific elements (as rendered by App.tsx itself, not a child component)
      // These texts are directly in App.tsx's render for the dashboard view.
      expect(screen.getByText(/total posts/i)).toBeInTheDocument();
      expect(screen.getByText(/connected accounts/i)).toBeInTheDocument();
      expect(screen.getByText(/scheduled posts/i)).toBeInTheDocument();
      expect(screen.getByText(/recent activity/i)).toBeInTheDocument();
    });

    it('handles authentication failure gracefully', async () => {
        (getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);
        (api.auth.getCurrentUser as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Auth failed'));

        // Reset store to initial unauthenticated state for this test
        (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
            const state = { user: null, setUser: mockSetUser, loadInitialData: mockLoadInitialData };
            return selector(state);
        });

        render(<App />);

        await waitFor(() => {
            expect(getStoredToken).toHaveBeenCalled();
            expect(setAuthToken).toHaveBeenCalledWith(mockToken);
            expect(api.auth.getCurrentUser).toHaveBeenCalled();
        });

        expect(mockSetUser).not.toHaveBeenCalledWith(expect.anything()); // setUser should not be called with a user
        expect(mockLoadInitialData).not.toHaveBeenCalled();
        expect(screen.getByTestId('auth-component')).toBeInTheDocument(); // Should fall back to Auth component
        expect(screen.queryByTestId('layout-component')).not.toBeInTheDocument();
    });
  });

  describe('View Switching (Post-Authentication)', () => {
    const mockUser = { id: 'user-123', email: 'test@example.com' };
    const mockToken = 'mock-auth-token';

    beforeEach(async () => {
      // Setup store for an authenticated user scenario
      (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
        const state = {
          user: mockUser, // User is logged in
          setUser: mockSetUser,
          loadInitialData: mockLoadInitialData,
          totalPostsCount: mockTotalPostsCount,
          connectedAccountsCount: mockConnectedAccountsCount,
          scheduledPostsCount: mockScheduledPostsCount,
        };
        return selector(state);
      });

      (getStoredToken as ReturnType<typeof vi.fn>).mockReturnValue(mockToken);
      (api.auth.getCurrentUser as ReturnType<typeof vi.fn>).mockResolvedValue(mockUser);
      (mockLoadInitialData as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);

      render(<App />);
      // Ensure initial auth and load are processed
      await waitFor(() => expect(mockLoadInitialData).toHaveBeenCalled());
    });

    it('switches to Compose view when "Compose Nav" is clicked', async () => {
      expect(screen.getByTestId('layout-component')).toBeInTheDocument(); // Initial layout
      // Default view is dashboard
      expect(screen.getByText(/total posts/i)).toBeInTheDocument();

      const composeNavButton = screen.getByRole('button', { name: /compose nav/i });
      await userEvent.click(composeNavButton);

      await waitFor(() => {
        expect(screen.getByTestId('composer-component')).toBeInTheDocument();
      });
      expect(screen.queryByText(/total posts/i)).not.toBeInTheDocument(); // Dashboard elements gone
    });

    it('switches to Schedule view when "Schedule Nav" is clicked', async () => {
      const scheduleNavButton = screen.getByRole('button', { name: /schedule nav/i });
      await userEvent.click(scheduleNavButton);

      await waitFor(() => {
        expect(screen.getByTestId('calendar-component')).toBeInTheDocument();
      });
    });

    it('switches to History view when "History Nav" is clicked', async () => {
      const historyNavButton = screen.getByRole('button', { name: /history nav/i });
      await userEvent.click(historyNavButton);

      await waitFor(() => {
        expect(screen.getByTestId('history-component')).toBeInTheDocument();
      });
    });

    it('switches to Settings view when "Settings Nav" is clicked', async () => {
      const settingsNavButton = screen.getByRole('button', { name: /settings nav/i });
      await userEvent.click(settingsNavButton);

      await waitFor(() => {
        expect(screen.getByTestId('settings-component')).toBeInTheDocument();
      });
    });

    it('switches back to Dashboard view when "Dashboard Nav" is clicked after being on another view', async () => {
      // First, navigate away from dashboard
      const composeNavButton = screen.getByRole('button', { name: /compose nav/i });
      await userEvent.click(composeNavButton);
      await waitFor(() => expect(screen.getByTestId('composer-component')).toBeInTheDocument());

      // Then, navigate back to dashboard
      const dashboardNavButton = screen.getByRole('button', { name: /dashboard nav/i });
      await userEvent.click(dashboardNavButton);

      await waitFor(() => {
        // Check for Dashboard specific elements
        expect(screen.getByText(/total posts/i)).toBeInTheDocument();
        expect(screen.getByText(/connected accounts/i)).toBeInTheDocument();
      });
      expect(screen.queryByTestId('composer-component')).not.toBeInTheDocument();
    });
  });
});
