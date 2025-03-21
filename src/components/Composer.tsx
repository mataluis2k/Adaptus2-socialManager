import React from 'react';
import { useDropzone } from 'react-dropzone';
import TextareaAutosize from 'react-textarea-autosize';
import { Image as ImageIcon, Calendar, Send } from 'lucide-react';
import type { SocialPlatform } from '../types';
import { useStore } from '../store';

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

  const handleSubmit = () => {
    if (!content.trim() || selectedPlatforms.length === 0) {
      addNotification({
        id: Date.now().toString(),
        type: 'error',
        message: 'Please add content and select at least one platform',
        timestamp: new Date()
      });
      return;
    }

    const newPost = {
      id: Date.now().toString(),
      content,
      platforms: selectedPlatforms,
      status: 'draft' as const,
      mediaUrls: mediaFiles.map(file => URL.createObjectURL(file)),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    addPost(newPost);
    addNotification({
      id: Date.now().toString(),
      type: 'success',
      message: 'Post created successfully',
      timestamp: new Date()
    });

    setContent('');
    setSelectedPlatforms([]);
    setMediaFiles([]);
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
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <div className="flex space-x-4">
            <div {...getRootProps()} className="cursor-pointer">
              <input {...getInputProps()} />
              <button className="p-2 text-gray-600 hover:text-indigo-600">
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
            <button className="p-2 text-gray-600 hover:text-indigo-600">
              <Calendar className="w-5 h-5" />
            </button>
          </div>

          <button
            onClick={handleSubmit}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 flex items-center space-x-2"
          >
            <Send className="w-4 h-4" />
            <span>Post</span>
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