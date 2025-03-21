import React from 'react';
import { useStore } from '../store';
import type { SocialPlatform } from '../types';

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
  const addAccount = useStore((state) => state.addAccount);
  const removeAccount = useStore((state) => state.removeAccount);
  const addNotification = useStore((state) => state.addNotification);

  const handleConnect = async (platform: SocialPlatform) => {
    try {
      // Simulated OAuth flow
      const newAccount = {
        id: Date.now().toString(),
        platform,
        connected: true,
        username: `user_${platform}`,
        profileImage: `https://api.dicebear.com/7.x/initials/svg?seed=${platform}`
      };

      addAccount(newAccount);
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: `Successfully connected to ${platform}`,
        timestamp: new Date()
      });
    } catch (error) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to connect to ${platform}`,
        timestamp: new Date()
      });
    }
  };

  const handleDisconnect = async (accountId: string, platform: SocialPlatform) => {
    try {
      removeAccount(accountId);
      addNotification({
        id: Date.now().toString(),
        type: 'info',
        message: `Disconnected from ${platform}`,
        timestamp: new Date()
      });
    } catch (error) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to disconnect from ${platform}`,
        timestamp: new Date()
      });
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
                        className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleConnect(platform.id)}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
                    >
                      Connect
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