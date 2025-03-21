import React from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';
import { useStore } from '../store';
import type { Post } from '../types';

const Calendar: React.FC = () => {
  const [selectedDate, setSelectedDate] = React.useState(new Date());
  const posts = useStore((state) => state.posts);

  const days = eachDayOfInterval({
    start: startOfMonth(selectedDate),
    end: endOfMonth(selectedDate)
  });

  const getPostsForDate = (date: Date): Post[] => {
    return posts.filter(
      (post) => post.scheduledFor && isSameDay(new Date(post.scheduledFor), date)
    );
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">
            {format(selectedDate, 'MMMM yyyy')}
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setSelectedDate(date => new Date(date.setMonth(date.getMonth() - 1)))}
              className="p-2 text-gray-600 hover:text-indigo-600"
            >
              ←
            </button>
            <button
              onClick={() => setSelectedDate(date => new Date(date.setMonth(date.getMonth() + 1)))}
              className="p-2 text-gray-600 hover:text-indigo-600"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
          {days.map((day) => {
            const postsForDay = getPostsForDate(day);
            return (
              <div
                key={day.toString()}
                className={`
                  p-2 border rounded-lg min-h-[100px]
                  ${isSameDay(day, new Date()) ? 'bg-indigo-50 border-indigo-200' : 'border-gray-200'}
                `}
              >
                <span className="text-sm font-medium text-gray-700">
                  {format(day, 'd')}
                </span>
                {postsForDay.length > 0 && (
                  <div className="mt-1 space-y-1">
                    {postsForDay.map((post) => (
                      <div
                        key={post.id}
                        className="text-xs p-1 bg-indigo-100 rounded truncate"
                        title={post.content}
                      >
                        {post.content.substring(0, 20)}...
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Calendar;