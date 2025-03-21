import React from 'react';
import { Bell, Calendar, Home, PenSquare, History, Settings, LogOut } from 'lucide-react';
import Notifications from './Notifications';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';

interface LayoutProps {
  children: React.ReactNode;
  currentUser: { id: string; email: string };
  onNavigate?: (view: 'dashboard' | 'compose' | 'schedule' | 'history' | 'settings') => void;
}

const Layout: React.FC<LayoutProps> = ({ children, currentUser, onNavigate }) => {
  const setUser = useStore((state) => state.setUser);
  const addNotification = useStore((state) => state.addNotification);

  const navigationItems = [
    { icon: Home, label: 'Dashboard', view: 'dashboard' as const },
    { icon: PenSquare, label: 'Compose', view: 'compose' as const },
    { icon: Calendar, label: 'Schedule', view: 'schedule' as const },
    { icon: History, label: 'History', view: 'history' as const },
    { icon: Settings, label: 'Settings', view: 'settings' as const },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      addNotification({
        id: Date.now().toString(),
        type: 'info',
        message: 'Signed out successfully',
        timestamp: new Date()
      });
    } catch (error) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'Error signing out',
        timestamp: new Date()
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <nav className="fixed top-0 left-0 h-full w-64 bg-white shadow-lg">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-indigo-600">Social Manager</h1>
        </div>
        
        <ul className="mt-6">
          {navigationItems.map((item) => (
            <li key={item.view}>
              <button
                onClick={() => onNavigate?.(item.view)}
                className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
              >
                <item.icon className="w-5 h-5 mr-3" />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center px-6 py-3 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Sign Out</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Top Bar */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">Dashboard</h2>
          </div>
          <div className="flex items-center space-x-4">
            <button className="p-2 text-gray-600 hover:text-indigo-600 relative">
              <Bell className="w-6 h-6" />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">
                  {currentUser.email[0].toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">
                {currentUser.email}
              </span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          {children}
        </div>
      </main>

      {/* Notifications */}
      <Notifications />
    </div>
  );
};

export default Layout;