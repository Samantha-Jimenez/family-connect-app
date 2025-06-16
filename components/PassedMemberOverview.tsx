import React, { useState } from 'react';

interface Comment {
  id: string;
  author: string;
  content: string;
  date: string;
}

interface PassedMemberOverviewProps {
  memberData: {
    firstName: string;
    lastName: string;
    birthDate?: string;
    deathDate?: string;
    photo?: string;
  };
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const PassedMemberOverview = ({ memberData }: PassedMemberOverviewProps) => {
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
    <div className="max-w-4xl mx-auto px-4 py-8">
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
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-2xl font-semibold text-gray-900 mb-4">Share Your Memory</h2>
        <form onSubmit={handleSubmitComment} className="space-y-4">
          <div>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your favorite memory or message..."
              className="w-full h-32 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-200 placeholder:text-gray-400"
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
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Memories Shared</h2>
        {comments.map((comment) => (
          <div key={comment.id} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{comment.author}</h3>
                <p className="text-sm text-gray-500">
                  {formatDate(comment.date)}
                </p>
              </div>
            </div>
            <p className="text-gray-700 leading-relaxed">{comment.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PassedMemberOverview;