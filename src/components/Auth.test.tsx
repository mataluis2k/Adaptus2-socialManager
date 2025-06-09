import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Auth from './Auth';
import { useStore } from '../store';
import { api, setAuthToken } from '../lib/api';

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
      auth: {
        login: vi.fn(),
        register: vi.fn(),
        getCurrentUser: vi.fn(), // Added if Auth attempts to call it, though not typical
        logout: vi.fn(), // Added for completeness if needed
      },
      // Mock other api parts if Auth component uses them
      posts: { getAll: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      accounts: { getAll: vi.fn(), create: vi.fn(), delete: vi.fn() },
    },
    setAuthToken: vi.fn(),
    getStoredToken: vi.fn(),
    clearAuthToken: vi.fn(),
  };
});


describe('Auth Component', () => {
  const mockSetUser = vi.fn();
  const mockLoadInitialData = vi.fn();
  const mockAddNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks(); // Clear mocks before each test

    (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
      const state = {
        setUser: mockSetUser,
        loadInitialData: mockLoadInitialData,
        addNotification: mockAddNotification,
      };
      return selector(state);
    });
  });

  describe('Initial Rendering', () => {
    it('renders email input, password input, and Sign in button', () => {
      render(<Auth />);
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('renders the Sign up toggle link', () => {
      render(<Auth />);
      expect(screen.getByRole('button', { name: /don't have an account\? sign up/i })).toBeInTheDocument();
    });
  });

  describe('Input Field Interaction', () => {
    it('allows typing into the email field', async () => {
      render(<Auth />);
      const emailInput = screen.getByLabelText(/email address/i) as HTMLInputElement;
      await userEvent.type(emailInput, 'test@example.com');
      expect(emailInput.value).toBe('test@example.com');
    });

    it('allows typing into the password field', async () => {
      render(<Auth />);
      const passwordInput = screen.getByLabelText(/password/i) as HTMLInputElement;
      await userEvent.type(passwordInput, 'password123');
      expect(passwordInput.value).toBe('password123');
    });
  });

  describe('Sign-in Flow', () => {
    const email = 'test@example.com';
    const password = 'password123';
    const mockLoginResponse = { token: 'fake-token', user: { id: '1', email } };

    it('successfully signs in a user', async () => {
      (api.auth.login as ReturnType<typeof vi.fn>).mockResolvedValue(mockLoginResponse);

      render(<Auth />);
      await userEvent.type(screen.getByLabelText(/email address/i), email);
      await userEvent.type(screen.getByLabelText(/password/i), password);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(api.auth.login).toHaveBeenCalledWith(email, password);
      expect(setAuthToken).toHaveBeenCalledWith(mockLoginResponse.token);
      expect(mockSetUser).toHaveBeenCalledWith({ id: mockLoginResponse.user.id, email: mockLoginResponse.user.email });
      expect(mockLoadInitialData).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Welcome back!',
      }));
    });

    it('shows loading state on submit button during sign-in', async () => {
      (api.auth.login as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockLoginResponse), 100)));
      render(<Auth />);
      await userEvent.type(screen.getByLabelText(/email address/i), email);
      await userEvent.type(screen.getByLabelText(/password/i), password);

      const signInButton = screen.getByRole('button', { name: /sign in/i });
      userEvent.click(signInButton); // Don't await this click

      await waitFor(() => {
        expect(signInButton).toBeDisabled();
        expect(screen.getByText('Processing...')).toBeInTheDocument();
      });

      await waitFor(() => expect(api.auth.login).toHaveBeenCalled(), { timeout: 200 }); // Wait for the API call to resolve
    });

    it('handles sign-in failure and displays error messages', async () => {
      const errorMessage = 'Invalid credentials';
      (api.auth.login as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      render(<Auth />);
      await userEvent.type(screen.getByLabelText(/email address/i), email);
      await userEvent.type(screen.getByLabelText(/password/i), password);
      await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: errorMessage,
      }));
      expect(setAuthToken).not.toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(mockLoadInitialData).not.toHaveBeenCalled();
    });
  });

  describe('Sign-up Flow', () => {
    const email = 'newuser@example.com';
    const password = 'newpassword123';
    const mockRegisterResponse = { token: 'new-fake-token', user: { id: '2', email } };

    it('toggles to sign-up mode and successfully registers a user', async () => {
      (api.auth.register as ReturnType<typeof vi.fn>).mockResolvedValue(mockRegisterResponse);

      render(<Auth />);
      await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));
      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();

      await userEvent.type(screen.getByLabelText(/email address/i), email);
      await userEvent.type(screen.getByLabelText(/password/i), password);
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(api.auth.register).toHaveBeenCalledWith(email, password);
      expect(setAuthToken).toHaveBeenCalledWith(mockRegisterResponse.token);
      expect(mockSetUser).toHaveBeenCalledWith({ id: mockRegisterResponse.user.id, email: mockRegisterResponse.user.email });
      expect(mockLoadInitialData).toHaveBeenCalled();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'success',
        message: 'Account created successfully!',
      }));
    });

    it('handles sign-up failure and displays error messages', async () => {
      const errorMessage = 'Email already exists';
      (api.auth.register as ReturnType<typeof vi.fn>).mockRejectedValue(new Error(errorMessage));

      render(<Auth />);
      await userEvent.click(screen.getByRole('button', { name: /don't have an account\? sign up/i }));

      await userEvent.type(screen.getByLabelText(/email address/i), email);
      await userEvent.type(screen.getByLabelText(/password/i), password);
      await userEvent.click(screen.getByRole('button', { name: /sign up/i }));

      expect(await screen.findByText(errorMessage)).toBeInTheDocument();
      expect(mockAddNotification).toHaveBeenCalledWith(expect.objectContaining({
        type: 'error',
        message: errorMessage,
      }));
      expect(setAuthToken).not.toHaveBeenCalled();
      expect(mockSetUser).not.toHaveBeenCalled();
      expect(mockLoadInitialData).not.toHaveBeenCalled();
    });
  });

  describe('Toggle between Sign-in and Sign-up', () => {
    it('toggles form mode, button text, and heading', async () => {
      render(<Auth />);

      // Initial state: Sign in
      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      const signUpToggle = screen.getByRole('button', { name: /don't have an account\? sign up/i });
      expect(signUpToggle).toBeInTheDocument();

      // Toggle to Sign up
      await userEvent.click(signUpToggle);
      expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign up/i })).toBeInTheDocument();
      const signInToggle = screen.getByRole('button', { name: /already have an account\? sign in/i });
      expect(signInToggle).toBeInTheDocument();

      // Toggle back to Sign in
      await userEvent.click(signInToggle);
      expect(screen.getByRole('heading', { name: /sign in to your account/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /don't have an account\? sign up/i })).toBeInTheDocument();
    });
  });
});
