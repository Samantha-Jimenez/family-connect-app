import React, { useState, useEffect } from 'react';
import { FamilyMember, addCommentToMember, getCommentsForMember, deleteCommentFromMember, editCommentInMember, getUserNameById, getProfilePhotoById } from '@/hooks/dynamoDB';
import { useAuthenticator } from '@aws-amplify/ui-react';
import Image from 'next/image';
import Link from 'next/link';
import { getFullImageUrl } from '@/utils/imageUtils';

const PassedMemberOverview = ({ memberData }: { memberData: FamilyMember }) => {
  const { user } = useAuthenticator();
  const [newComment, setNewComment] = useState('');
  const [comments, setComments] = useState<{ text: string; author: string; userId: string; timestamp: string; profilePhoto: string }[]>([]);
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchComments = async () => {
      if (memberData.family_member_id) {
        setLoading(true);
        try {
          const memberComments = await getCommentsForMember(memberData.family_member_id);
          // Reverse to show newest comments first (using spread to avoid mutating)
          setComments([...memberComments].reverse());
        } catch (error) {
          console.error('Error fetching comments:', error);
        } finally {
          setLoading(false);
        }
      }
    };

    const fetchProfilePhoto = async () => {
      if (user) {
        const photoUrl = await getProfilePhotoById(user.userId);
        setProfilePhoto(photoUrl);
      }
    };

    fetchComments();
    fetchProfilePhoto();
  }, [memberData.family_member_id, user]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    try {
      const userName = await getUserNameById(user.userId);
      if (userName) {
        const authorName = `${userName.firstName} ${userName.lastName}`;
        await addCommentToMember(memberData.family_member_id, user.userId, newComment, authorName, profilePhoto || '');
        
        // Add the comment to the local state (prepend since newest should be first)
        const newCommentObj = {
          text: newComment,
          author: authorName,
          userId: user.userId,
          timestamp: new Date().toISOString(),
          profilePhoto: profilePhoto || ''
        };
        setComments([newCommentObj, ...comments]);
        setNewComment('');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (index: number) => {
    if (user) {
      try {
        // Map UI index (newest first) to database index (oldest first)
        // UI index 0 (newest) = database index (comments.length - 1 - index)
        const dbIndex = comments.length - 1 - index;
        await deleteCommentFromMember(memberData.family_member_id, user.userId, dbIndex);
        setComments(comments.filter((_, i) => i !== index));
      } catch (error) {
        console.error('Error deleting comment:', error);
      }
    }
  };

  const handleEditComment = async (index: number) => {
    if (editedCommentText.trim() && user) {
      try {
        // Map UI index (newest first) to database index (oldest first)
        const dbIndex = comments.length - 1 - index;
        await editCommentInMember(memberData.family_member_id, user.userId, dbIndex, editedCommentText);
        
        const updatedComments = [...comments];
        updatedComments[index].text = editedCommentText;
        setComments(updatedComments);
        
        setEditingCommentIndex(null);
        setEditedCommentText('');
      } catch (error) {
        console.error('Error editing comment:', error);
      }
    }
  };

  const confirmDeleteComment = (index: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
    if (confirmDelete) {
      handleDeleteComment(index);
    }
  };

  return (
    <>
    <div className="md:px-4 px-0 py-8">
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
        <form onSubmit={handleAddComment} className="space-y-4">
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
              className="btn px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 w-full md:w-auto border-0 min-h-[2.5rem] h-[2.5rem]"
            >
              Share
            </button>
          </div>
        </form>
      </div>

      {/* Comments Section */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Memories</h2>
        {loading ? (
          <div className="text-center py-8">Loading memories...</div>
        ) : comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">No memories shared yet. Be the first to share a memory.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {comments.map((comment, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-4 h-full">
                <div className="flex flex-col h-full">
                  {editingCommentIndex === index ? (
                    <div className="space-y-2">
                      <textarea
                        value={editedCommentText}
                        onChange={(e) => setEditedCommentText(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none bg-gray-200"
                        rows={4}
                      />
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => handleEditComment(index)}
                          className="btn btn-sm bg-green-600 text-white hover:bg-green-700 border-0"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentIndex(null);
                            setEditedCommentText('');
                          }}
                          className="btn btn-sm bg-gray-500 text-white hover:bg-gray-600 border-0"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-start gap-3 mb-2">
                        {comment.profilePhoto ? (
                          <Image
                            src={getFullImageUrl(comment.profilePhoto) || '/fallback-image.jpg'}
                            alt="Commenter Profile Photo"
                            width={75}
                            height={75}
                            className="object-cover rounded-tl-full rounded-tr-full rounded-bl-full rounded-br-none flex-shrink-0 w-[75px] h-[75px]"
                          />
                        ) : (
                          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="icon-[mdi--account] text-xl text-gray-400" />
                          </div>
                        )}
                        <div className="flex-grow min-w-0">
                          <Link href={`/profile/${comment.userId}`}>
                            <h3 className="text-lg font-semibold text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors">{comment.author}</h3>
                          </Link>
                          <p className="text-sm text-gray-500">
                            {new Date(comment.timestamp).toLocaleDateString('en-US', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                      <p className="text-gray-700 leading-relaxed flex-grow whitespace-pre-wrap">{comment.text}</p>
                      {comment.userId === user?.userId && (
                        <div className="flex gap-2 justify-end mt-2">
                          <button
                            onClick={() => {
                              setEditingCommentIndex(index);
                              setEditedCommentText(comment.text);
                            }}
                            className="text-blue-500 hover:underline text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => confirmDeleteComment(index)}
                            className="text-red-500 hover:underline text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
    </>
  );
};

export default PassedMemberOverview;