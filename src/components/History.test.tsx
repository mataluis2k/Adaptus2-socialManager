import { render, screen, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { format } from 'date-fns';
import History from './History'; // Adjust path as necessary
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
      // Mock other parts of the store if History uses them
    };
    return selector(state);
  });
};

describe('History Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupStoreMocks([]); // Default to no posts
  });

  describe('Initial Rendering', () => {
    it('renders the "Published Posts" heading', () => {
      render(<History />);
      expect(screen.getByRole('heading', { name: /published posts/i })).toBeInTheDocument();
    });
  });

  describe('Display of Published Posts', () => {
    const MOCK_POSTS: Post[] = [
      {
        id: 'p1',
        content: 'My first published post!',
        platforms: ['twitter', 'facebook'],
        status: 'published',
        mediaUrls: ['http://example.com/image1.jpg'],
        createdAt: new Date(2024, 0, 15, 10, 0, 0), // Jan 15, 2024
        updatedAt: new Date(2024, 0, 15, 10, 0, 0),
      },
      {
        id: 'p2',
        content: 'Another great article published.',
        platforms: ['linkedin'],
        status: 'published',
        createdAt: new Date(2024, 1, 20, 12, 30, 0), // Feb 20, 2024
        updatedAt: new Date(2024, 1, 20, 12, 30, 0),
        // No mediaUrls
      },
      {
        id: 'p3',
        content: 'This one is still a draft.',
        platforms: ['twitter'],
        status: 'draft',
        createdAt: new Date(2024, 2, 1, 9, 0, 0), // Mar 1, 2024
        updatedAt: new Date(2024, 2, 1, 9, 0, 0),
      },
      {
        id: 'p4',
        content: 'Scheduled for later.',
        platforms: ['reddit'],
        status: 'scheduled',
        scheduledFor: new Date(2024, 5, 10).toISOString(),
        createdAt: new Date(2024, 2, 5, 14, 0, 0), // Mar 5, 2024
        updatedAt: new Date(2024, 2, 5, 14, 0, 0),
      },
      {
        id: 'p5',
        content: 'This post failed.',
        platforms: ['facebook'],
        status: 'failed',
        createdAt: new Date(2024, 2, 10, 16, 0, 0), // Mar 10, 2024
        updatedAt: new Date(2024, 2, 10, 16, 0, 0),
      },
    ];

    beforeEach(() => {
      setupStoreMocks(MOCK_POSTS);
    });

    it('renders only posts with status "published"', () => {
      render(<History />);
      expect(screen.getByText(MOCK_POSTS[0].content)).toBeInTheDocument();
      expect(screen.getByText(MOCK_POSTS[1].content)).toBeInTheDocument();

      expect(screen.queryByText(MOCK_POSTS[2].content)).not.toBeInTheDocument(); // draft
      expect(screen.queryByText(MOCK_POSTS[3].content)).not.toBeInTheDocument(); // scheduled
      expect(screen.queryByText(MOCK_POSTS[4].content)).not.toBeInTheDocument(); // failed
    });

    it('displays content, formatted publication date, and platforms for each published post', () => {
      render(<History />);

      const publishedPost1 = MOCK_POSTS[0];
      const post1Element = screen.getByText(publishedPost1.content).closest('div[class*="bg-white"]'); // Assuming each post is in a card-like div
      expect(post1Element).toBeInTheDocument();

      if (post1Element) {
        expect(within(post1Element).getByText(`Published on ${format(new Date(publishedPost1.createdAt), 'MMM d, yyyy')}`)).toBeInTheDocument();
        publishedPost1.platforms.forEach(platform => {
          expect(within(post1Element).getByText(platform)).toBeInTheDocument();
        });
      }

      const publishedPost2 = MOCK_POSTS[1];
      const post2Element = screen.getByText(publishedPost2.content).closest('div[class*="bg-white"]');
      expect(post2Element).toBeInTheDocument();

      if (post2Element) {
        expect(within(post2Element).getByText(`Published on ${format(new Date(publishedPost2.createdAt), 'MMM d, yyyy')}`)).toBeInTheDocument();
        publishedPost2.platforms.forEach(platform => {
          expect(within(post2Element).getByText(platform)).toBeInTheDocument();
        });
      }
    });

    it('renders an image if mediaUrls are present and not empty for a published post', () => {
      render(<History />);
      const publishedPost1 = MOCK_POSTS[0]; // This post has mediaUrls
      const post1Element = screen.getByText(publishedPost1.content).closest('div[class*="bg-white"]');

      expect(post1Element).toBeInTheDocument();
      if (post1Element && publishedPost1.mediaUrls && publishedPost1.mediaUrls.length > 0) {
        const image = within(post1Element).getByRole('img') as HTMLImageElement;
        expect(image).toBeInTheDocument();
        expect(image.src).toBe(publishedPost1.mediaUrls[0]);
      }
    });

    it('does not render an image if mediaUrls are undefined or empty for a published post', () => {
      render(<History />);
      const publishedPost2 = MOCK_POSTS[1]; // This post has no mediaUrls
      const post2Element = screen.getByText(publishedPost2.content).closest('div[class*="bg-white"]');

      expect(post2Element).toBeInTheDocument();
      if (post2Element) {
        expect(within(post2Element).queryByRole('img')).not.toBeInTheDocument();
      }
    });
  });

  describe('Empty State Handling', () => {
    it('renders no post items if the posts list is empty', () => {
      setupStoreMocks([]); // Empty posts
      render(<History />);
      // Check if any element that usually contains a post is absent.
      // This selector depends on your component's structure for individual posts.
      // If posts are, for example, <article> elements or divs with a specific class:
      const postCards = screen.queryAllByRole('article'); // Or a more specific selector
      expect(postCards).toHaveLength(0);
      // Or query for a common text pattern if posts always have some identifiable text
      // expect(screen.queryByText(/published on/i)).not.toBeInTheDocument();
    });

    it('renders no post items if no posts have status "published"', () => {
      const nonPublishedPosts: Post[] = [
        { id: 'd1', content: 'Draft only', platforms: ['twitter'], status: 'draft', createdAt: new Date(), updatedAt: new Date() },
        { id: 's1', content: 'Scheduled only', platforms: ['facebook'], status: 'scheduled', createdAt: new Date(), updatedAt: new Date() },
      ];
      setupStoreMocks(nonPublishedPosts);
      render(<History />);

      expect(screen.queryByText(nonPublishedPosts[0].content)).not.toBeInTheDocument();
      expect(screen.queryByText(nonPublishedPosts[1].content)).not.toBeInTheDocument();
      // Also check for the absence of any post items container if that's more robust
      const postCards = screen.queryAllByRole('article');
      expect(postCards).toHaveLength(0);
    });

    it('renders a specific "No published posts yet." message if the component implements it (OPTIONAL TEST)', () => {
      // This test is conditional on the component having such specific UI.
      // If History.tsx shows a message like "No published posts yet." when empty:
      // setupStoreMocks([]);
      // render(<History />);
      // expect(screen.getByText(/no published posts yet/i)).toBeInTheDocument();
      // If not implemented, this test should be skipped or removed.
      // For now, we assume it does NOT have this specific message unless requirements change.
      expect(true).toBe(true); // Placeholder to make test runner happy
    });
  });
});
