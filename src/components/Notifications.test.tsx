import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Notifications from './Notifications'; // Adjust path as necessary
import { useStore } from '../store'; // Adjust path as necessary
import type { NotificationMessage } from '../types'; // Adjust path as necessary

// Mock Zustand store
vi.mock('../store', () => ({
  useStore: vi.fn(),
}));

// Mock lucide-react icons (if not already globally mocked)
// Assuming X icon is used for close button
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal() as Record<string, React.FC<any>>;
  return {
    ...actual, // Preserve other exports like specific icons if needed elsewhere
    X: (props: any) => <svg data-testid="icon-x" {...props} />, // Mock for X icon
  };
});


// Helper to set up store state for tests
const setupStoreMocks = (mockNotifications: NotificationMessage[], mockRemoveNotification = vi.fn()) => {
  (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
    const state = {
      notifications: mockNotifications,
      removeNotification: mockRemoveNotification,
      // Mock other parts of the store if Notifications uses them
    };
    return selector(state);
  });
  return mockRemoveNotification; // Return for spying
};


describe('Notifications Component', () => {
  let mockRemoveNotification: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    // Default to no notifications, and get a fresh mock for removeNotification
    mockRemoveNotification = setupStoreMocks([]);
  });

  describe('Rendering Various Notification Types', () => {
    const MOCK_NOTIFICATIONS: NotificationMessage[] = [
      { id: 'n1', type: 'success', message: 'Success: Action completed!', timestamp: new Date() },
      { id: 'n2', type: 'error', message: 'Error: Something went wrong.', timestamp: new Date() },
      { id: 'n3', type: 'info', message: 'Info: Please note this.', timestamp: new Date() },
      { id: 'n4', type: 'warning', message: 'Warning: Proceed with caution.', timestamp: new Date() },
      { id: 'n5', type: 'success', message: 'Visit our site!', actionUrl: 'http://example.com', timestamp: new Date() },
    ];

    beforeEach(() => {
      mockRemoveNotification = setupStoreMocks(MOCK_NOTIFICATIONS);
    });

    it('renders each notification message', () => {
      render(<Notifications />);
      MOCK_NOTIFICATIONS.forEach(notification => {
        expect(screen.getByText(notification.message)).toBeInTheDocument();
      });
    });

    it('applies correct CSS classes (or indicators) based on notification type', () => {
      render(<Notifications />);
      // These class checks are examples and depend on the actual implementation in Notifications.tsx
      // For instance, if the component uses `bg-green-50` for success, `bg-red-50` for error, etc.

      const successNotification1 = screen.getByText(MOCK_NOTIFICATIONS[0].message).closest('div[role="alert"]');
      expect(successNotification1).toHaveClass('bg-green-50'); // Example class

      const errorNotification = screen.getByText(MOCK_NOTIFICATIONS[1].message).closest('div[role="alert"]');
      expect(errorNotification).toHaveClass('bg-red-50'); // Example class

      const infoNotification = screen.getByText(MOCK_NOTIFICATIONS[2].message).closest('div[role="alert"]');
      expect(infoNotification).toHaveClass('bg-blue-50'); // Example class (assuming blue for info)

      const warningNotification = screen.getByText(MOCK_NOTIFICATIONS[3].message).closest('div[role="alert"]');
      expect(warningNotification).toHaveClass('bg-yellow-50'); // Example class (assuming yellow for warning)
    });

    it('renders an anchor tag with correct href if actionUrl is provided', () => {
      render(<Notifications />);
      const notificationWithAction = MOCK_NOTIFICATIONS[4];
      const notificationElement = screen.getByText(notificationWithAction.message).closest('div[role="alert"]');

      expect(notificationElement).toBeInTheDocument();
      if (notificationElement) {
        const linkElement = within(notificationElement).getByRole('link') as HTMLAnchorElement;
        expect(linkElement).toBeInTheDocument();
        expect(linkElement.href).toBe(notificationWithAction.actionUrl);
        // Also check if the link text is part of the message or a separate "Learn more"
        // For this test, we assume the message itself might contain the linkable part,
        // or a generic "Details" link if not specified.
        // If the component makes the whole message a link, or adds specific text:
        // expect(linkElement.textContent).toContain("Visit our site!"); // or "Details"
      }
    });

    it('renders a "close" (X) button for each notification', () => {
      render(<Notifications />);
      const closeButtons = screen.getAllByRole('button', { name: /close notification/i }); // Assuming aria-label
      // Or query by testid if the icon mock provides one and it's wrapped in a button
      // const closeIcons = screen.getAllByTestId('icon-x');
      expect(closeButtons).toHaveLength(MOCK_NOTIFICATIONS.length);
    });
  });

  describe('Removing a Notification', () => {
    const notificationToRemove: NotificationMessage = {
      id: 'n-remove',
      type: 'info',
      message: 'This will be removed.',
      timestamp: new Date()
    };

    beforeEach(() => {
      mockRemoveNotification = setupStoreMocks([notificationToRemove]);
    });

    it('calls removeNotification with the ID of the clicked notification', async () => {
      render(<Notifications />);
      const notificationElement = screen.getByText(notificationToRemove.message).closest('div[role="alert"]');
      expect(notificationElement).toBeInTheDocument();

      if (notificationElement) {
        // Assuming the close button has an aria-label or is uniquely identifiable
        const closeButton = within(notificationElement).getByRole('button', { name: /close notification/i });
        await userEvent.click(closeButton);
        expect(mockRemoveNotification).toHaveBeenCalledWith(notificationToRemove.id);
      }
    });
  });

  describe('Handling Empty State', () => {
    it('renders nothing or an empty container if no notifications are present', () => {
      mockRemoveNotification = setupStoreMocks([]); // Ensure it's empty
      const { container } = render(<Notifications />);

      // Check that no actual notification items (e.g., div with role="alert") are rendered
      expect(screen.queryAllByRole('alert')).toHaveLength(0);

      // Optionally, check if the main container is empty or has minimal structure
      // This depends on how Notifications.tsx is structured when empty.
      // If it renders a `div` wrapper always:
      const mainContainer = container.querySelector('div'); // Or a more specific selector for the notifications list container
      if (mainContainer) {
         // Check if it has no children that are notification items
         // This is more robust if the container itself is always present.
        expect(mainContainer.children.length).toBe(0); // Or check for a specific class that indicates emptiness if applicable
      } else {
        // If the component renders null when empty
        expect(container.firstChild).toBeNull();
      }
    });
  });
});
