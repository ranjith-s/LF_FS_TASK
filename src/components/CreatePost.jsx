import React, { useState } from 'react';
import api, { getErrorMessage } from '../api';

const CreatePost = ({ onPostCreated }) => {
    const [title, setTitle] = useState('');
    const [content, setContent] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!title.trim() || !content.trim()) return;

        setSubmitting(true);
        setError('');
        try {
            await api.post('/posts', { title: title.trim(), content: content.trim() });
            setTitle('');
            setContent('');
            onPostCreated();
        } catch (err) {
            setError(getErrorMessage(err, 'Could not create the post.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form className="card" onSubmit={handleSubmit}>
            <h2 className="card-title">Create Post</h2>
            <input
                className="input"
                placeholder="Give your post a title..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                required
            />
            <textarea
                className="input"
                placeholder="What's on your mind?"
                rows={3}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
            />
            {error && <p className="error">{error}</p>}
            <div className="form-actions">
                <button className="button" type="submit" disabled={submitting}>
                    {submitting ? 'Posting...' : '✦ Post'}
                </button>
            </div>
        </form>
    );
};

export default CreatePost;
