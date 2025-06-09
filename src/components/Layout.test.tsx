import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import Layout from './Layout'; // Adjust path as necessary
import { useStore } from '../store'; // Adjust path as necessary
import { supabase } from '../lib/supabase'; // Adjust path as necessary
import type { User } from '@supabase/supabase-js'; // For mock user type

// Mock Supabase
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn(),
    },
  },
  isSupabaseConfigured: vi.fn(() => true), // Assume configured for these tests
}));

// Mock Zustand store
vi.mock('../store', () => ({
  useStore: vi.fn(),
}));

// Mock lucide-react icons to simplify testing and avoid rendering complex SVGs
// This is a common practice if icons are not critical to the test logic itself.
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, React.FC<any>>;
  const Mocks: Record<string, React.FC<any>> = {};
  for (const key in actual) {
    if (typeof actual[key] === 'function') { // Check if it's a component
      Mocks[key] = (props: any) => <svg data-testid={`icon-${key.toLowerCase()}`} {...props} />;
    } else {
      Mocks[key] = actual[key]; // Preserve other exports if any
    }
  }
  return Mocks;
});


describe('Layout Component', () => {
  const mockSetUser = vi.fn();
  const mockAddNotification = vi.fn();
  const mockOnNavigate = vi.fn();
  const mockCurrentUser = { id: 'user-123', email: 'test@example.com' } as User;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default store mock for each test
    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = {
        setUser: mockSetUser,
        addNotification: mockAddNotification,
        // Add other store properties if Layout interacts with them
      };
      return selector(state);
    });

    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const defaultProps = {
    currentUser: mockCurrentUser,
    onNavigate: mockOnNavigate,
  };

  describe('Initial Rendering', () => {
    it('renders the application title/logo', () => {
      render(<Layout {...defaultProps}><div>Child Content</div></Layout>);
      // Assuming "Social Manager" or similar is the title.
      // This might be an image or text. If text:
      expect(screen.getByText(/social manager/i)).toBeInTheDocument();
      // Or if it's an SVG logo, you might look for a specific testid or role.
    });

    it('renders all navigation items with icons and text', () => {
      render(<Layout {...defaultProps}><div>Child Content</div></Layout>);
      const navItems = [
        { name: /dashboard/i, iconTestId: 'icon-layoutdashboard' },
        { name: /compose/i, iconTestId: 'icon-edit3' },
        { name: /schedule/i, iconTestId: 'icon-calendar' },
        { name: /history/i, iconTestId: 'icon-history' },
        { name: /settings/i, iconTestId: 'icon-settings' },
      ];

      navItems.forEach(item => {
        const navLink = screen.getByRole('button', { name: item.name }); // Assuming they are buttons or have link role
        expect(navLink).toBeInTheDocument();
        expect(within(navLink).getByTestId(item.iconTestId)).toBeInTheDocument();
      });
    });

    it('displays the current user\'s email and avatar/initial placeholder', () => {
      render(<Layout {...defaultProps}><div>Child Content</div></Layout>);
      expect(screen.getByText(mockCurrentUser.email!)).toBeInTheDocument();
      // Avatar/initial placeholder check (depends on implementation)
      // e.g., if it's a div with initials or an img with alt text
      const avatarPlaceholder = screen.getByText(mockCurrentUser.email!.charAt(0).toUpperCase());
      expect(avatarPlaceholder).toBeInTheDocument(); // Or check for a specific class/testid
    });

    it('renders the "Sign Out" button', () => {
      render(<Layout {...defaultProps}><div>Child Content</div></Layout>);
      expect(screen.getByRole('button', { name: /sign out/i })).toBeInTheDocument();
    });

    it('renders the main content area for children', () => {
      render(<Layout {...defaultProps}><div data-testid="main-area">Child Content</div></Layout>);
      expect(screen.getByTestId('main-area')).toBeInTheDocument();
    });
  });

  describe('Navigation Interaction', () => {
    const navTestCases = [
      { name: /dashboard/i, view: 'dashboard' },
      { name: /compose/i, view: 'compose' },
      { name: /schedule/i, view: 'schedule' },
      { name: /history/i, view: 'history' },
      { name: /settings/i, view: 'settings' },
    ];

    navTestCases.forEach(testCase => {
      it(`calls onNavigate with "${testCase.view}" when "${testCase.name}" is clicked`, async () => {
        render(<Layout {...defaultProps}><div>Child</div></Layout>);
        const navButton = screen.getByRole('button', { name: testCase.name });
        await userEvent.click(navButton);
        expect(mockOnNavigate).toHaveBeenCalledWith(testCase.view);
      });
    });
  });

  describe('Sign Out Functionality', () => {
    it('calls supabase.auth.signOut, setUser(null), and shows success notification on successful sign out', async () => {
      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: null });

      render(<Layout {...defaultProps}><div>Child</div></Layout>);
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      // Wait for async operations if any before setUser and addNotification
      await screen.findByText(mockCurrentUser.email!); // Ensure component is stable

      expect(mockSetUser).toHaveBeenCalledWith(null);
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Signed out successfully.',
      }));
    });

    it('shows error notification and does not call setUser(null) on sign out failure', async () => {
      const errorMessage = 'Sign out failed';
      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockResolvedValue({ error: new Error(errorMessage) }); // Supabase client returns error in object

      render(<Layout {...defaultProps}><div>Child</div></Layout>);
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      await screen.findByText(mockCurrentUser.email!);

      expect(mockSetUser).not.toHaveBeenCalledWith(null);
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: `Error signing out: ${errorMessage}`,
      }));
    });

     it('handles unexpected error format from signOut', async () => {
      const errorMessage = 'Unexpected error';
      (supabase.auth.signOut as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage)); // SignOut throwing directly

      render(<Layout {...defaultProps}><div>Child</div></Layout>);
      const signOutButton = screen.getByRole('button', { name: /sign out/i });
      await userEvent.click(signOutButton);

      expect(supabase.auth.signOut).toHaveBeenCalled();
      await screen.findByText(mockCurrentUser.email!);

      expect(mockSetUser).not.toHaveBeenCalledWith(null);
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: `Error signing out: ${errorMessage}`,
      }));
    });
  });

  describe('Rendering Children', () => {
    it('renders children content passed to it', () => {
      const childText = 'This is the child content';
      render(
        <Layout {...defaultProps}>
          <div data-testid="child-content">{childText}</div>
        </Layout>
      );
      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText(childText)).toBeInTheDocument();
    });
  });
});
