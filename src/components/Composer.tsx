import React from 'react';
import { useDropzone } from 'react-dropzone';
import TextareaAutosize from 'react-textarea-autosize';
import { Image as ImageIcon, Calendar, Send, X } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import type { SocialPlatform } from '../types';
import { useStore } from '../store';
import { api } from '../lib/api';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const platforms: { id: SocialPlatform; name: string }[] = [
  { id: 'twitter', name: 'Twitter' },
  { id: 'facebook', name: 'Facebook' },
  { id: 'linkedin', name: 'LinkedIn' },
  { id: 'reddit', name: 'Reddit' }
];

const Composer: React.FC = () => {
  const [content, setContent] = React.useState('');
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<SocialPlatform[]>([]);
  const [mediaFiles, setMediaFiles] = React.useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [scheduledAt, setScheduledAt] = React.useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const addPost = useStore((state) => state.addPost);
  const addNotification = useStore((state) => state.addNotification);

  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif'],
      'video/*': ['.mp4', '.mov']
    },
    onDrop: (acceptedFiles) => {
      setMediaFiles([...mediaFiles, ...acceptedFiles]);
    }
  });

  const handleSubmit = async () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'Please add content and select at least one platform.',
        timestamp: new Date(),
      });
      return;
    }

    setIsSubmitting(true);
    let uploadedMediaUrls: string[] = [];

    try {
      // File Upload Logic
      if (mediaFiles.length > 0) {
        if (!isSupabaseConfigured()) {
          addNotification({
            id: Date.now().toString(),
            type: 'warning',
            message: 'Supabase Storage is not configured. Cannot upload media.',
            timestamp: new Date(),
          });
          // Proceeding without mediaUrls as per MVP
        } else {
          const userId = useStore.getState().user?.id;
          if (!userId) {
            addNotification({
              id: Date.now().toString(),
              type: 'error',
              message: 'User information not available. Cannot upload media.',
              timestamp: new Date(),
            });
            // Proceeding without mediaUrls
          } else {
            for (const file of mediaFiles) {
              const filePath = `public/${userId}/${Date.now()}-${file.name}`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('media')
                .upload(filePath, file);

              if (uploadError) {
                addNotification({
                  id: Date.now().toString(),
                  type: 'error',
                  message: `Failed to upload ${file.name}: ${uploadError.message}`,
                  timestamp: new Date(),
                });
                // Halt further processing as per MVP
                setIsSubmitting(false);
                return; 
              }

              if (uploadData) {
                const { data: publicUrlData } = supabase.storage
                  .from('media')
                  .getPublicUrl(uploadData.path);
                uploadedMediaUrls.push(publicUrlData.publicUrl);
              }
            }
          }
        }
      }

      const postToCreate: {
        content: string;
        platforms: SocialPlatform[];
        mediaUrls: string[];
        scheduledFor?: string;
      } = {
        content,
        platforms: selectedPlatforms,
        mediaUrls: uploadedMediaUrls,
      };

      if (scheduledAt) {
        postToCreate.scheduledFor = scheduledAt.toISOString();
      }
      
      const createdPost = await api.posts.create(postToCreate);
      
      addPost(createdPost); // Add the post returned from the API
      addNotification({
        id: Date.now().toString(),
        type: 'success',
        message: 'Post created successfully!',
        timestamp: new Date(),
      });

      // Clear form
      setContent('');
      setSelectedPlatforms([]);
      setMediaFiles([]);
      setScheduledAt(null);
      setShowDatePicker(false);
    } catch (error: any) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: `Failed to create post: ${error.message}`,
        timestamp: new Date(),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <TextareaAutosize
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What would you like to share?"
          className="w-full resize-none border-0 focus:ring-0 text-lg placeholder:text-gray-400"
          minRows={3}
        />

        {mediaFiles.length > 0 && (
          <div className="mt-4 grid grid-cols-2 gap-4">
            {mediaFiles.map((file, index) => (
              <div key={index} className="relative">
                <img
                  src={URL.createObjectURL(file)}
                  alt={`Upload ${index + 1}`}
                  className="rounded-lg w-full h-48 object-cover"
                />
                <button
                  onClick={() => setMediaFiles(files => files.filter((_, i) => i !== index))}
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
        
        {showDatePicker && (
          <div className="my-4">
            <DatePicker
              selected={scheduledAt}
              onChange={(date) => setScheduledAt(date)}
              showTimeSelect
              minDate={new Date()}
              dateFormat="Pp" // e.g. "7/13/2023, 5:00 PM"
              inline // Render inline instead of as a popover
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
        )}

        {scheduledAt && !showDatePicker && (
          <div className="my-3 p-2 bg-indigo-50 rounded-md text-sm text-indigo-700 flex justify-between items-center">
            <span>Scheduled for: {scheduledAt.toLocaleString()}</span>
            <button 
              onClick={() => setScheduledAt(null)} 
              className="p-1 hover:bg-indigo-100 rounded-full"
              aria-label="Clear scheduled time"
            >
              <X size={16} className="text-indigo-500" />
            </button>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex space-x-4 items-center">
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <button className="p-2 text-gray-600 hover:text-indigo-600" aria-label="Upload media">
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={() => setShowDatePicker(!showDatePicker)} 
              className="p-2 text-gray-600 hover:text-indigo-600"
              aria-label={showDatePicker ? "Close scheduler" : "Open scheduler"}
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>
              {isSubmitting 
                ? (scheduledAt ? 'Scheduling...' : 'Posting...') 
                : (scheduledAt ? 'Schedule Post' : 'Post')}
            </span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Select Platforms</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => {
                setSelectedPlatforms((current) =>
                  current.includes(platform.id)
                    ? current.filter((p) => p !== platform.id)
                    : [...current, platform.id]
                );
              }}
              className={`p-4 rounded-lg border ${
                selectedPlatforms.includes(platform.id)
                  ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                  : 'border-gray-200 hover:border-indigo-600 hover:bg-indigo-50'
              }`}
            >
              {platform.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Composer;