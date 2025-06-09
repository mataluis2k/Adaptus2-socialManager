import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { format, getDaysInMonth, getDate, getMonth, getYear, addMonths, subMonths, startOfMonth } from 'date-fns';
import Calendar from './Calendar'; // Adjust path as necessary
import { useStore } from '../store'; // Adjust path as necessary
import type { Post } from '../types'; // Adjust path as necessary

// Mock Zustand store
vi.mock('../store', () => ({
  useStore: vi.fn(),
}));

// Helper to set up store state for tests
const setupStoreMocks = (mockPosts: Post[]) => {
  (useStore as unknown as ReturnType<typeof vi.fn>).mockImplementation((selector: (state: any) => any) => {
    const state = {
      posts: mockPosts,
      // Mock other parts of the store if Calendar uses them
    };
    return selector(state);
  });
};

describe('Calendar Component', () => {
  const MOCK_INITIAL_DATE = new Date(2024, 5, 15); // June 15, 2024 (Month is 0-indexed)

  beforeEach(() => {
    vi.clearAllMocks();
    // Set a consistent "today" for all tests in this suite
    vi.setSystemTime(MOCK_INITIAL_DATE);
    setupStoreMocks([]); // Default to no posts
  });

  afterEach(() => {
    vi.useRealTimers(); // Reset Date mock
  });

  describe('Initial Rendering', () => {
    it('displays the current month and year in the header', () => {
      render(<Calendar />);
      expect(screen.getByText(format(MOCK_INITIAL_DATE, 'MMMM yyyy'))).toBeInTheDocument();
    });

    it('renders "Previous" and "Next" month navigation buttons', () => {
      render(<Calendar />);
      expect(screen.getByRole('button', { name: /previous month/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /next month/i })).toBeInTheDocument();
    });

    it('renders day headers (Sun, Mon, ..., Sat)', () => {
      render(<Calendar />);
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach(day => {
        expect(screen.getByText(day)).toBeInTheDocument();
      });
    });

    it('renders the correct number of day cells for the current month', () => {
      render(<Calendar />);
      const daysInMonth = getDaysInMonth(MOCK_INITIAL_DATE);
      // Query for elements that represent day numbers. This depends on implementation.
      // A common approach is to have a specific role or testid for day cells,
      // or to check for text content if day numbers are unique enough.
      // For this example, let's assume day cells are buttons or have a specific role.
      // If they are just divs, we might need a more specific selector.
      // Using a more generic approach to find cells that contain numbers:
      const dayCells = screen.getAllByText(/^\d{1,2}$/, { selector: 'div[class*="col-span-1"] p, button p, div[class*="col-span-1"] button' });

      // This assertion is tricky because day cells might render numbers from prev/next month.
      // A better way is to count cells within the grid that are not explicitly marked as outside the month.
      // Let's assume day cells have a specific structure or testid if possible.
      // For now, we'll check if all days of the month are represented.
      const dayNumberElements = screen.getAllByText(/\b\d{1,2}\b/);
      const uniqueDayNumbersInGrid = new Set(dayNumberElements.map(el => el.textContent));

      // Check if all days from 1 to daysInMonth are present
      let foundDays = 0;
      for (let i = 1; i <= daysInMonth; i++) {
        if (uniqueDayNumbersInGrid.has(i.toString())) {
          foundDays++;
        }
      }
      // This is a simplified check. A more robust test would count the actual rendered "day" components.
      // Or verify that each day number (1 to daysInMonth) is present.
      expect(foundDays).toBe(daysInMonth);
    });
  });

  describe('Month Navigation', () => {
    it('updates displayed month/year on "Next" month click', async () => {
      render(<Calendar />);
      const nextButton = screen.getByRole('button', { name: /next month/i });
      await userEvent.click(nextButton);

      const nextMonthDate = addMonths(MOCK_INITIAL_DATE, 1);
      expect(screen.getByText(format(nextMonthDate, 'MMMM yyyy'))).toBeInTheDocument();
    });

    it('updates displayed month/year on "Previous" month click', async () => {
      render(<Calendar />);
      const prevButton = screen.getByRole('button', { name: /previous month/i });
      await userEvent.click(prevButton);

      const prevMonthDate = subMonths(MOCK_INITIAL_DATE, 1);
      expect(screen.getByText(format(prevMonthDate, 'MMMM yyyy'))).toBeInTheDocument();
    });
  });

  describe('Post Display', () => {
    const MOCK_POSTS: Post[] = [
      { id: 'p1', content: 'Post for today', platforms: ['twitter'], status: 'scheduled', scheduledFor: MOCK_INITIAL_DATE.toISOString(), createdAt: new Date(), updatedAt: new Date() },
      { id: 'p2', content: 'Another post for today', platforms: ['facebook'], status: 'scheduled', scheduledFor: MOCK_INITIAL_DATE.toISOString(), createdAt: new Date(), updatedAt: new Date() },
      { id: 'p3', content: 'Post for 10th June', platforms: ['linkedin'], status: 'scheduled', scheduledFor: new Date(2024, 5, 10).toISOString(), createdAt: new Date(), updatedAt: new Date() },
      { id: 'p4', content: 'Post for July 5th', platforms: ['reddit'], status: 'scheduled', scheduledFor: new Date(2024, 6, 5).toISOString(), createdAt: new Date(), updatedAt: new Date() },
      { id: 'p5', content: 'Unscheduled post', platforms: ['twitter'], status: 'draft', createdAt: new Date(), updatedAt: new Date() }, // No scheduledFor
    ];

    beforeEach(() => {
      setupStoreMocks(MOCK_POSTS);
    });

    it('renders post content snippets within the correct day cells for the current month', () => {
      render(<Calendar />);

      // Find the cell for today (June 15th, 2024)
      // This requires knowing how day cells are identified. Assume 'day-15' or similar.
      // A more robust way is to find the button/div with text '15'.
      const todayCell = screen.getAllByText('15').find(el => el.closest('button, div[class*="col-span-1"]'));
      expect(todayCell).toBeDefined();

      if(todayCell) {
        expect(within(todayCell).getByText(MOCK_POSTS[0].content.substring(0, 20))).toBeInTheDocument();
        expect(within(todayCell).getByText(MOCK_POSTS[1].content.substring(0, 20))).toBeInTheDocument();
      }

      // Find the cell for June 10th
      const day10Cell = screen.getAllByText('10').find(el => el.closest('button, div[class*="col-span-1"]'));
      expect(day10Cell).toBeDefined();
      if(day10Cell) {
        expect(within(day10Cell).getByText(MOCK_POSTS[2].content.substring(0, 20))).toBeInTheDocument();
      }
    });

    it('does not render post snippets for days without scheduled posts', () => {
      render(<Calendar />);
      // Find a day cell known to have no posts, e.g., June 1st (if no post is scheduled for it)
      const day1Cell = screen.getAllByText('1').find(el => el.closest('button, div[class*="col-span-1"]'));
      expect(day1Cell).toBeDefined();
      if(day1Cell) {
        // Check that no post content is found within this cell
        // This depends on how posts are rendered. If they have a specific class or role:
        const postSnippets = within(day1Cell).queryAllByText(/.*/); // Get all text
        // Filter out the day number itself
        const actualSnippets = postSnippets.filter(snippet => snippet.textContent !== '1');
        // This is a bit fragile. A more specific selector for post snippets is better.
        // For now, let's assume snippets are paragraphs or have a specific testid.
        // If posts are in <p> tags:
        expect(within(day1Cell).queryAllByRole('paragraph')).toHaveLength(0);
        // Or if they have a data-testid="post-snippet"
        // expect(within(day1Cell).queryAllByTestId('post-snippet')).toHaveLength(0);
      }
    });

    it('does not render posts scheduled for dates not in the currently displayed month', () => {
      render(<Calendar />);
      // Post for July 5th should not be visible in June
      expect(screen.queryByText(MOCK_POSTS[3].content.substring(0, 20))).not.toBeInTheDocument();
    });

    it('does not render posts without a scheduledFor date', () => {
      render(<Calendar />);
      expect(screen.queryByText(MOCK_POSTS[4].content.substring(0, 20))).not.toBeInTheDocument();
    });
  });

  describe('Highlighting Current Day (Today)', () => {
    it('applies a distinct style or class to the cell corresponding to "today"', () => {
      // MOCK_INITIAL_DATE is June 15, 2024, so this is "today"
      render(<Calendar />);

      // Find the cell for today (June 15th)
      // This requires a way to identify the cell. Let's assume the day number is within a button or specific div.
      const todayCellContainer = screen.getAllByText(getDate(MOCK_INITIAL_DATE).toString())
        .find(el => el.closest('button[class*="bg-indigo-600 text-white"], div[class*="bg-indigo-50"]')); // Example classes for today

      // This assertion depends heavily on the actual classes used for highlighting.
      // A more robust way is to add a data-testid="today-cell" or similar in the component.
      // For this example, we'll check for a common pattern of highlighting.
      // This is illustrative. The actual class check needs to match the component's implementation.
      // E.g., if today's button has `bg-indigo-600` and `text-white`
      // and other days' buttons do not.
      // Or if the parent div of the day number has `bg-indigo-50`.

      // A more direct test if the component adds a specific class for "today" to the button itself:
      const todayButton = screen.getAllByRole('button').find(button =>
        button.textContent === getDate(MOCK_INITIAL_DATE).toString() &&
        !button.className.includes('text-gray-400') // Not a day from prev/next month
      );

      expect(todayButton).toBeDefined();
      // This class check needs to be specific to your component's implementation
      // For example, if today is marked with 'font-bold' or a specific background.
      // Let's assume a class like 'is-today' or a specific background class.
      // This is a placeholder for the actual class.
      // expect(todayButton).toHaveClass('bg-indigo-100'); // Or whatever the highlight class is
      // Or check for the example given: bg-indigo-50 on a parent div, or bg-indigo-600 on button
      // The current component structure might have the day number inside a <p> within a <button> or <div>.
      // A more reliable way is to find the cell that *contains* the current day number and check its styling.

      const dayCells = screen.getAllByText(getDate(MOCK_INITIAL_DATE).toString());
      let todayCell: HTMLElement | undefined;
      dayCells.forEach(cell => {
        // Try to find the most specific element that represents the day cell
        // and is not a day from a previous/next month (often styled differently, e.g., grayed out)
        const parentButton = cell.closest('button');
        if (parentButton && !parentButton.className.includes('text-gray-400') && !parentButton.disabled) {
            // Check if this button is today's highlighted button
            // Example: if today's button has a specific background or text color
            if (parentButton.className.includes('bg-indigo-600') || parentButton.className.includes('text-white') || parentButton.className.includes('font-bold')) {
                todayCell = parentButton;
            }
        }
        if (!todayCell) {
            const parentDiv = cell.closest('div[class*="col-span-1"]');
            // Check if parent div has a specific background for today
            if (parentDiv && parentDiv.className.includes('bg-indigo-50') && !parentDiv.className.includes('text-gray-400')) {
                 todayCell = parentDiv;
            }
        }
      });

      expect(todayCell).toBeDefined();
      // If todayCell is found, the presence of a unique style is implied by the selector.
      // To be more explicit, you could check for a specific class if known:
      // expect(todayCell).toHaveClass('expected-today-highlight-class');
      // This test is highly dependent on the component's markup and styling for "today".
    });
  });
});
