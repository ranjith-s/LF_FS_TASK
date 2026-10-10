import React, { useState } from 'react';
import api, { getErrorMessage } from '../api';
import { useAuth } from '../AuthContext';
import Avatar from './Avatar';

const formatDate = (value) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
};

const Post = ({ post, onLike, onDelete, onCommentCountChange }) => {
    const { user } = useAuth();
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [newComment, setNewComment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const fetchComments = async () => {
        setLoading(true);
        setError('');
        try {
            const { data } = await api.get(`/posts/${post.id}/comments`);
            setComments(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Could not load comments.'));
        } finally {
            setLoading(false);
        }
    };

    const toggleComments = () => {
        if (!showComments) fetchComments();
        setShowComments(!showComments);
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        const content = newComment.trim();
        if (!content) return;

        setSubmitting(true);
        setError('');
        try {
            await api.post(`/posts/${post.id}/comments`, { content });
            setNewComment('');
            onCommentCountChange(post.id, 1);
            await fetchComments();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not post the comment.'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteComment = async (commentId) => {
        setError('');
        try {
            await api.delete(`/comments/${commentId}`);
            setComments((prev) => prev.filter((comment) => comment.id !== commentId));
            onCommentCountChange(post.id, -1);
        } catch (err) {
            setError(getErrorMessage(err, 'Could not delete the comment.'));
        }
    };

    return (
        <article className="card">
            <header className="post-header">
                <Avatar user={post.author} />
                <div>
                    <div className="post-author">{post.author?.username || 'Unknown user'}</div>
                    <time className="muted">{formatDate(post.created_at)}</time>
                </div>
                {user?.id === post.user_id && (
                    <button className="link-button danger" onClick={() => onDelete(post.id)}>
                        Delete
                    </button>
                )}
            </header>

            <h3 className="post-title">{post.title}</h3>
            <p className="post-content">{post.content}</p>
            {post.image_url && <img className="post-image" src={post.image_url} alt="" loading="lazy" />}

            <div className="post-actions">
                <button
                    className={`action ${post.liked_by_me ? 'active' : ''}`}
                    onClick={() => onLike(post)}
                    aria-pressed={Boolean(post.liked_by_me)}
                >
                    {post.liked_by_me ? '❤️' : '🤍'} {post.likes_count ?? 0}
                </button>
                <button className={`action ${showComments ? 'active' : ''}`} onClick={toggleComments}>
                    💬 {post.comment_count ?? 0}
                </button>
            </div>

            {showComments && (
                <div className="comments">
                    {loading && <p className="muted">Loading comments...</p>}
                    {!loading && !error && comments.length === 0 && (
                        <p className="muted">No comments yet. Be the first!</p>
                    )}

                    {comments.map((comment) => (
                        <div key={comment.id} className="comment">
                            <Avatar user={comment.author} size={32} />
                            <div className="comment-bubble">
                                <div className="comment-head">
                                    <strong>{comment.author?.username || 'Unknown user'}</strong>
                                    {user?.id === comment.user_id && (
                                        <button
                                            className="link-button danger"
                                            onClick={() => handleDeleteComment(comment.id)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </div>
                                <p>{comment.content}</p>
                                <small className="muted">❤️ {comment.likes_count ?? 0}</small>
                            </div>
                        </div>
                    ))}

                    {error && <p className="error">{error}</p>}

                    <form className="comment-form" onSubmit={handleAddComment}>
                        <input
                            className="input"
                            placeholder="Write a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            maxLength={2000}
                        />
                        <button className="button" type="submit" disabled={submitting || !newComment.trim()}>
                            Post
                        </button>
                    </form>
                </div>
            )}
        </article>
    );
};

export default Post;
