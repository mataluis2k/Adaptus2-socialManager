import React, { useEffect } from 'react';
import Layout from './components/Layout';
import Auth from './components/Auth';
import Composer from './components/Composer';
import Calendar from './components/Calendar';
import History from './components/History';
import Settings from './components/Settings';
import { useStore } from './store';
import { api, getStoredToken, setAuthToken } from './lib/api';

function App() {
  const [currentView, setCurrentView] = React.useState<'dashboard' | 'compose' | 'schedule' | 'history' | 'settings'>('dashboard');
  const user = useStore((state) => state.user);
  const setUser = useStore((state) => state.setUser);
  const loadInitialData = useStore((state) => state.loadInitialData);

  useEffect(() => {
    const initializeAuth = async () => {
      const token = getStoredToken();
      if (token) {
        try {
          setAuthToken(token);
          const user = await api.auth.getCurrentUser();
          setUser(user);
          await loadInitialData();
        } catch (error) {
          console.error('Failed to restore session:', error);
        }
      }
    };

    initializeAuth();
  }, [setUser, loadInitialData]);

  if (!user) {
    return <Auth />;
  }

  return (
    <Layout currentUser={user} onNavigate={setCurrentView}>
      {currentView === 'compose' && <Composer />}
      {currentView === 'schedule' && <Calendar />}
      {currentView === 'history' && <History />}
      {currentView === 'settings' && <Settings />}
      {currentView === 'dashboard' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-600">Total Posts</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {useStore((state) => state.totalPostsCount())}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-600">Connected Accounts</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {useStore((state) => state.connectedAccountsCount())}
              </p>
            </div>
            <div className="bg-gradient-to-br from-indigo-50 to-white p-6 rounded-lg border border-indigo-100">
              <h3 className="text-sm font-medium text-indigo-600">Scheduled Posts</h3>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {useStore((state) => state.scheduledPostsCount())}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
            <div className="space-y-4">
              {useStore((state) => 
                state.posts
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .slice(0, 5)
                  .map((post) => (
                    <div key={post.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900">
                          {post.status === 'published' ? 'Post Published' : 'Post Created'}
                        </h4>
                        <p className="text-sm text-gray-500 mt-1">{post.content.substring(0, 100)}...</p>
                        <div className="flex gap-2 mt-2">
                          {post.platforms.map((platform) => (
                            <span key={platform} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                              {platform}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

export default App;
