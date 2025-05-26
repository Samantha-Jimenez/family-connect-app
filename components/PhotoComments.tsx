import React from 'react'
import { useAuthenticator } from '@aws-amplify/ui-react';
import Image from 'next/image';
import { getFullImageUrl } from '@/utils/imageUtils';

interface PhotoCommentsProps {
  comments: { text: string; author: string; userId: string; timestamp: string; commenterPhoto: string }[];
  editingCommentIndex: number | null;
  setEditingCommentIndex: (index: number | null) => void;
  editedCommentText: string;
  setEditedCommentText: (text: string) => void;
  newComment: string;
  setNewComment: (text: string) => void;
  handleAddComment: () => void;
  handleEditComment: (index: number) => void;
  handleDeleteComment: (index: number) => void;
}

const PhotoComments = ({ comments, editingCommentIndex, setEditingCommentIndex, editedCommentText, setEditedCommentText, newComment, setNewComment, handleAddComment, handleEditComment, handleDeleteComment }: PhotoCommentsProps) => {
    const { user } = useAuthenticator();

    const confirmDeleteComment = (index: number) => {
        const confirmDelete = window.confirm("Are you sure you want to delete this comment?");
        if (confirmDelete) {
            handleDeleteComment(index);
        }
    };

    return (
    <div className="grid md:h-full">
        <div className="mt-2 border-t pt-2">
            <h3 className="text-lg font-bold text-black">Comments</h3>
            <div className="md:overflow-y-scroll md:overflow-x-hidden md:max-h-[309px] scrollbar scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-gray-400 scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
                <div className="grid grid-cols-1 gap-2">
                    {comments.map((comment, index) => (
                        <div key={index} className="grid grid-cols-[1fr_auto] items-start gap-2 pr-[10px]">
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
                                        onClick={() => setEditingCommentIndex(null)}
                                        className="btn bg-gray-500 text-white ml-2 border-0"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <div className="chat chat-start">
                                        <div className="chat-image avatar">
                                            <div className="w-10 rounded-full">
                                                {/* <img
                                                    alt="User Avatar"
                                                    src={comment.commenterPhoto}
                                                /> */}
                                                {comment.commenterPhoto ? (
                                            <Image
                                                src={getFullImageUrl(comment.commenterPhoto) || '/fallback-image.jpg'}
                                                alt="Commenters Profile Photo"
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
                                            {/* <time className="text-xs opacity-50 text-black">
                                                {new Date(comment.timestamp).toLocaleString()}
                                            </time> */}
                                        </div>
                                        <div className="chat-bubble bg-gray-200 text-gray-800 text-sm px-2 py-0.5 min-h-3 max-w-[80%] break-words font-light">
                                            {comment.text}
                                        </div>
                                        <time className="chat-footer opacity-50 text-gray-600 font-light">
                                            {new Date(comment.timestamp).toLocaleString()}
                                        </time>
                                    </div>
                                    {comment.userId === user.userId && (
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
            </div>
        </div>
        {/* <div className="flex items-center">
            <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                        handleAddComment();
                    }
                }}
                className="input input-bordered w-full text-black bg-white border-gray-300 rounded-md shadow-sm"
                placeholder="Add a comment..."
            />
            <button
                onClick={handleAddComment}
                className="btn bg-blue-500 text-white ml-2 rounded-md shadow hover:bg-blue-600 transition border-0"
            >
                Post
            </button>
        </div> */}
    </div>
  )
}

export default PhotoComments