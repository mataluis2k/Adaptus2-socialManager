import React from 'react';
import { X } from 'lucide-react';
import { useStore } from '../store';

const Notifications: React.FC = () => {
  const notifications = useStore((state) => state.notifications);
  const removeNotification = useStore((state) => state.removeNotification);

  return (
    <div className="fixed bottom-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`
            p-4 rounded-lg shadow-lg max-w-sm flex items-start space-x-3
            ${notification.type === 'success' && 'bg-green-50 text-green-800'}
            ${notification.type === 'error' && 'bg-red-50 text-red-800'}
            ${notification.type === 'warning' && 'bg-yellow-50 text-yellow-800'}
            ${notification.type === 'info' && 'bg-blue-50 text-blue-800'}
          `}
        >
          <div className="flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
            {notification.actionUrl && (
              <a
                href={notification.actionUrl}
                className="text-sm font-medium underline mt-1 block"
              >
                View Details
              </a>
            )}
          </div>
          <button
            onClick={() => removeNotification(notification.id)}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export default Notifications