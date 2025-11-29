"use client";
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/imageUtils';
import { useAuthenticator } from '@aws-amplify/ui-react';
import { addCommentToHobby, getCommentsForHobby, deleteCommentFromHobby, editCommentInHobby, getProfilePhotoById, getUserData } from '@/hooks/dynamoDB';
import { fetchUserAttributes } from 'aws-amplify/auth';

interface HobbyMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  hobby: string;
  members: Array<{ id: string; name: string; profile_photo?: string }>;
}

const HobbyMembersModal: React.FC<HobbyMembersModalProps> = ({
  isOpen,
  onClose,
  hobby,
  members,
}) => {
  const [mounted, setMounted] = React.useState(false);
  const { user } = useAuthenticator();
  const [comments, setComments] = useState<Array<{ userId: string; text: string; author: string; timestamp: string; commenterPhoto: string }>>([]);
  const [newComment, setNewComment] = useState('');
  const [editingCommentIndex, setEditingCommentIndex] = useState<number | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userProfilePhoto, setUserProfilePhoto] = useState<string>('');
  const [hoveredMemberId, setHoveredMemberId] = useState<string | null>(null);
  const hoveredMemberName = hoveredMemberId ? members.find((m) => m.id === hoveredMemberId)?.name : '';

  React.useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    if (isOpen && hobby) {
      fetchComments();
      fetchUserProfilePhoto();
    }
  }, [isOpen, hobby]);

  const fetchComments = async () => {
    try {
      setLoading(true);
      const hobbyComments = await getCommentsForHobby(hobby);
      setComments(hobbyComments);
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProfilePhoto = async () => {
    if (user?.userId) {
      const photo = await getProfilePhotoById(user.userId);
      setUserProfilePhoto(photo || '');
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !user?.userId) return;

    try {
      const userAttributes = await fetchUserAttributes();
      const userData = await getUserData(user.userId);
      const firstName = userData?.first_name || '';
      const lastName = userData?.last_name || '';
      const author = `${firstName} ${lastName}`.trim() || userAttributes.email || 'Unknown';
      
      await addCommentToHobby(hobby, user.userId, newComment.trim(), author, userProfilePhoto);
      setNewComment('');
      await fetchComments();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleEditComment = async (index: number) => {
    if (!editedCommentText.trim() || !user?.userId) return;

    try {
      await editCommentInHobby(hobby, user.userId, index, editedCommentText.trim());
      setEditingCommentIndex(null);
      setEditedCommentText('');
      await fetchComments();
    } catch (error) {
      console.error('Error editing comment:', error);
    }
  };

  const handleDeleteComment = async (index: number) => {
    if (!user?.userId) return;

    try {
      await deleteCommentFromHobby(hobby, user.userId, index);
      await fetchComments();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const confirmDeleteComment = (index: number) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
    if (confirmDelete) {
      handleDeleteComment(index);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100]" onClick={onClose}>
      <div 
        className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-11/12 m-4 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-2xl font-bold text-black dark:text-white">Family Members with {hobby}</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl leading-none top-[-1rem] right-[-0.75rem] relative font-light"
          >
            ×
          </button>
        </div>

        <div className="text-gray-800 dark:text-gray-200">
          {members.length > 0 ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex flex-col items-start">
                  <div className="flex -space-x-3">
                    {members.slice(0, 6).map((member) => (
                      <Link
                        key={member.id}
                        href={`/profile/${member.id}`}
                        className="group relative inline-block"
                        onClick={onClose}
                        onMouseEnter={() => setHoveredMemberId(member.id)}
                        onMouseLeave={() => setHoveredMemberId(null)}
                      >
                        <div className="w-10 h-10 rounded-full overflow-hidden ring-2 ring-white dark:ring-gray-800 bg-gray-100 dark:bg-gray-700 transition-all duration-200 ease-out group-hover:-translate-y-1 group-hover:scale-105 group-hover:ring-plantain-green shadow-sm">
                          {member.profile_photo ? (
                            <Image
                              src={getFullImageUrl(member.profile_photo)}
                              alt={member.name}
                              width={40}
                              height={40}
                              className="object-cover w-full h-full"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <span className="icon-[mdi--account] text-xl text-gray-400" />
                            </div>
                          )}
                        </div>
                        <span className="sr-only">{member.name}</span>
                      </Link>
                    ))}
                    {members.length > 6 && (
                      <div className="w-10 h-10 rounded-full bg-plantain-green/20 text-plantain-green flex items-center justify-center text-xs font-semibold ring-2 ring-white dark:ring-gray-800">
                        +{members.length - 6}
                      </div>
                    )}
                  </div>
                  {/* Member name display on hover */}
                  <div className="relative mt-3 h-3 w-full">
                    {hoveredMemberName ? (
                      <div
                        key={hoveredMemberId}
                        className="name-float absolute inline-flex items-center gap-2 px-2 rounded-full bg-gradient-to-r from-dark-spring-green to-plantain-green text-white shadow-lg ring-1 ring-black/5 dark:ring-white/5"
                      >
                        {/* <span className="h-2 w-2 rounded-full bg-white/80 shadow-sm" /> */}
                        <span className="text-sm font-semibold tracking-wide whitespace-nowrap drop-shadow-sm">
                          {hoveredMemberName}
                        </span>
                      </div>
                    ) : (
                      <div className="absolute h-full w-36 rounded-full" aria-hidden />
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 mb-6">No other family members have this hobby.</p>
          )}
        </div>

        {/* Comments Section */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-bold text-black dark:text-white mb-3">Comments</h3>
          <div className="max-h-[300px] overflow-y-auto scrollbar scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-gray-400 scrollbar-thumb-rounded-full scrollbar-track-rounded-full mb-4">
            {loading ? (
              <p className="text-gray-500 dark:text-gray-400">Loading comments...</p>
            ) : comments.length > 0 ? (
              <div className="space-y-3">
                {comments.map((comment, index) => (
                  <div key={index} className="flex items-start gap-2">
                    {editingCommentIndex === index ? (
                      <div className="flex items-center w-full">
                        <input
                          type="text"
                          value={editedCommentText}
                          onChange={(e) => setEditedCommentText(e.target.value)}
                          className="input input-bordered w-full text-black bg-white border-gray-300"
                        />
                        <button
                          onClick={() => handleEditComment(index)}
                          className="btn bg-green-500 text-white ml-2 border-0"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingCommentIndex(null);
                            setEditedCommentText('');
                          }}
                          className="btn bg-gray-500 text-white ml-2 border-0"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="chat chat-start flex-1">
                          <div className="chat-image avatar">
                            <div className="w-10 rounded-full">
                              {comment.commenterPhoto ? (
                                <Image
                                  src={getFullImageUrl(comment.commenterPhoto) || '/fallback-image.jpg'}
                                  alt="Commenter's Profile Photo"
                                  width={40}
                                  height={40}
                                  className="object-contain rounded-full"
                                />
                              ) : (
                                <div className="w-full h-full bg-gray-200 rounded-[60px] flex items-center justify-center">
                                  <span className="icon-[mdi--account] text-xl text-gray-400" />
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="chat-header text-gray-600 font-light">
                            {comment.author}
                          </div>
                          <div className="chat-bubble bg-gray-200 text-gray-800 text-sm px-2 py-0.5 min-h-3 font-light !max-w-full break-all whitespace-normal overflow-hidden">
                            {comment.text}
                          </div>
                          <time className="chat-footer opacity-50 text-gray-700 font-light text-sm">
                            {new Date(comment.timestamp).toLocaleString([], {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              hour: 'numeric',
                              minute: '2-digit',
                            })}
                          </time>
                        </div>
                        {comment.userId === user?.userId && (
                          <div className="flex space-x-2 self-center">
                            <button
                              onClick={() => {
                                setEditingCommentIndex(index);
                                setEditedCommentText(comment.text);
                              }}
                              className="text-blue-500 hover:underline text-xs font-light"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => confirmDeleteComment(index)}
                              className="text-red-500 hover:underline text-xs font-light"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400">No comments yet. Be the first to comment!</p>
            )}
          </div>
          
          {/* Add Comment Input */}
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleAddComment();
                }
              }}
              className="input input-sm input-bordered w-full text-black bg-white border-gray-300 rounded-md shadow-sm !text-base block rounded-md border-[1.5px] border-gray-300 focus:outline-none focus:border-[#C8D5B9] focus:ring-1 focus:ring-[#5CAB68] hover:border-[#D2FF28] bg-white dark:bg-gray-800 dark:border-gray-600 p-2 transition-colors"
              placeholder="Add a comment..."
            />
            <button
              onClick={handleAddComment}
              className="btn btn-sm bg-dark-spring-green text-white rounded-md shadow hover:bg-plantain-green transition border-0"
            >
              Post
            </button>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="btn btn-sm bg-golden-sand text-black border-0 hover:bg-golden-sand/70"
          >
            Close
          </button>
        </div>
        <style jsx>{`
          .name-float {
            animation: nameFloat 260ms ease-out;
          }

          @keyframes nameFloat {
            0% {
              opacity: 0;
              transform: translateY(10px) scale(0.95);
              filter: blur(3px);
            }
            55% {
              opacity: 1;
              transform: translateY(-4px) scale(1.03);
              filter: blur(0);
            }
            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
              filter: blur(0);
            }
          }
        `}</style>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default HobbyMembersModal;
