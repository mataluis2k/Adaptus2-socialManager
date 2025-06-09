import React, { useEffect } from 'react';
import { useStore } from '../store';
import type { SocialPlatform } from '../types';
import { api } from '../lib/api';

const platforms: { id: SocialPlatform; name: string; description: string }[] = [
  {
    id: 'twitter',
    name: 'Twitter',
    description: 'Share quick updates and engage with your audience'
  },
  {
    id: 'facebook',
    name: 'Facebook',
    description: 'Connect with your community and share rich content'
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    description: 'Share professional updates and industry insights'
  },
  {
    id: 'reddit',
    name: 'Reddit',
    description: 'Engage with specific communities and share valuable content'
  }
];

const Settings: React.FC = () => {
  const accounts = useStore((state) => state.accounts);
  const removeAccount = useStore((state) => state.removeAccount);
  const addNotification = useStore((state) => state.addNotification);
  const loadInitialData = useStore((state) => state.loadInitialData);
  const [isConnectingId, setIsConnectingId] = React.useState<SocialPlatform | null>(null);
  const [isDisconnectingId, setIsDisconnectingId] = React.useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    const platform = params.get('platform') as SocialPlatform | null;
    const message = params.get('message');

    if (status && platform) {
      if (status === 'success') {
        loadInitialData(); // Refresh accounts
        addNotification({
          id: Date.now().toString(),
          type: 'success',
          message: message || `Successfully connected to ${platform}.`,
          timestamp: new Date(),
        });
      } else if (status === 'error') {
        addNotification({
          id: Date.now().toString(),
          type: 'error',
          message: message || `Failed to connect to ${platform}. An unknown error occurred.`,
          timestamp: new Date(),
        });
      }
      setIsConnectingId(null); // Reset connecting state
      window.history.replaceState({}, '', window.location.pathname); // Clear query params
    }
  }, [addNotification, loadInitialData]);

  const handleConnect = (platform: SocialPlatform) => {
    setIsConnectingId(platform);
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'API URL is not configured. Cannot connect to social platforms.',
        timestamp: new Date(),
      });
      setIsConnectingId(null);
      return;
    }
    const redirectUrl = `${apiUrl}/api/connect/${platform}`;
    window.location.href = redirectUrl;
  };

  const handleDisconnect = async (accountId: string, platform: SocialPlatform) => {
    setIsDisconnectingId(accountId);
    try {
      await api.accounts.delete(accountId);
      removeAccount(accountId);
      addNotification({
        id: Date.now().toString(),
        type: 'success', // Changed to success for consistency
        message: `Disconnected from ${platform} successfully.`,
        timestamp: new Date()
      });
    } catch (error: any) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to disconnect from ${platform}: ${error.message}`,
        timestamp: new Date()
      });
    } finally {
      setIsDisconnectingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow">
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            Connected Accounts
          </h2>
          <div className="space-y-4">
            {platforms.map((platform) => {
              const account = accounts.find((a) => a.platform === platform.id);
              return (
                <div
                  key={platform.id}
                  className="border border-gray-200 rounded-lg p-4 flex items-center justify-between"
                >
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {platform.name}
                    </h3>
                    <p className="text-sm text-gray-500">{platform.description}</p>
                  </div>
                  {account ? (
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <img
                          src={account.profileImage}
                          alt={account.username}
                          className="w-8 h-8 rounded-full"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {account.username}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDisconnect(account.id, platform.id)}
                        disabled={isDisconnectingId === account.id}
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                      >
                        {isDisconnectingId === account.id ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      disabled={isConnectingId === platform.id}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {isConnectingId === platform.id ? 'Connecting...' : 'Connect'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;