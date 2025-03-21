import React from 'react';
import { format } from 'date-fns';
import { useStore } from '../store';

const History: React.FC = () => {
  const posts = useStore((state) => 
    state.posts.filter(post => post.status === 'published')
  );

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Published Posts</h2>
          <div className="space-y-4">
            {posts.map((post) => (
              <div
                key={post.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-indigo-200 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-gray-900">{post.content}</p>
                    <div className="mt-2 flex items-center space-x-4">
                      <span className="text-sm text-gray-500">
                        Published on {format(new Date(post.createdAt), 'MMM d, yyyy')}
                      </span>
                      <div className="flex items-center space-x-2">
                        {post.platforms.map((platform) => (
                          <span
                            key={platform}
                            className="px-2 py-1 bg-gray-100 rounded-full text-xs text-gray-600"
                          >
                            {platform}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  {post.mediaUrls && post.mediaUrls.length > 0 && (
                    <div className="ml-4">
                      <img
                        src={post.mediaUrls[0]}
                        alt="Post media"
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default History;