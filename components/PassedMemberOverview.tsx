import React, { useState } from 'react';
import TaggedPhotosCard from './TaggedPhotosCard';
import { FamilyMember } from '@/hooks/dynamoDB';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const PassedMemberOverview = ({ memberData }: { memberData: FamilyMember }) => {
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<Comment[]>([
    {
      id: '1',
      author: 'John Doe',
      content: 'We will always remember your kindness and wisdom. You touched so many lives.',
      date: '2024-03-15'
    },
    {
      id: '2',
      author: 'Jane Smith',
      content: 'Your legacy lives on through all of us. Thank you for being such an important part of our family.',
      date: '2024-03-14'
    },
    {
      id: '3',
      author: 'Michael Johnson',
      content: 'Your smile and laughter will forever be in our hearts. You made every family gathering special.',
      date: '2024-03-13'
    },
    {
      id: '4',
      author: 'Sarah Williams',
      content: 'The stories you shared and the wisdom you imparted will continue to guide us through life.',
      date: '2024-03-12'
    }
  ]);

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const comment: Comment = {
      id: Date.now().toString(),
      author: 'Current User', // This should be replaced with actual user data
      content: newComment,
      date: new Date().toISOString()
    };

    setComments([comment, ...comments]);
    setNewComment('');
  };

  return (
    <>
    <div className="px-4 py-8">
      {/* Memorial Header */}
      {/* <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          In Loving Memory of {memberData.firstName} {memberData.lastName}
        </h1>
        {memberData.birthDate && memberData.deathDate && (
          <p className="text-lg text-gray-600">
            {formatDate(memberData.birthDate)} - {formatDate(memberData.deathDate)}
          </p>
        )}
      </div> */}

      {/* Comment Form */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Share Your Memory</h2>
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your favorite memory or message..."
              className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-200 placeholder:text-gray-400"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              Share
            </button>
          </div>
        </form>
      </div>

      {/* Comments Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Memories Shared</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {comments.map((comment) => (
            <div key={comment.id} className="bg-white rounded-lg shadow-md p-4 h-full">
              <div className="flex flex-col h-full">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{comment.author}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(comment.date)}
                  </p>
                </div>
                <p className="text-gray-700 leading-relaxed flex-grow">{comment.content}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
    <TaggedPhotosCard userId={memberData.family_member_id} />
    </>
  );
};

export default PassedMemberOverview;