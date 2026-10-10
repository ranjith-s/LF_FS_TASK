import React, { useCallback, useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import CreatePost from './CreatePost';
import Post from './Post';

const Feed = () => {
    const [posts, setPosts] = useState([]);
    const [nextCursor, setNextCursor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState('');

    const loadPosts = useCallback(async (cursor) => {
        try {
            const { data } = await api.get('/posts', { params: { cursor } });
            setPosts((prev) => (cursor ? [...prev, ...data.posts] : data.posts));
            setNextCursor(data.next_cursor);
            setError('');
        } catch (err) {
            setError(getErrorMessage(err, 'Could not load the feed.'));
        }
    }, []);

    useEffect(() => {
        loadPosts().finally(() => setLoading(false));
    }, [loadPosts]);

    const loadMore = async () => {
        setLoadingMore(true);
        await loadPosts(nextCursor);
        setLoadingMore(false);
    };

    const updatePost = (postId, getChanges) => {
        setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, ...getChanges(post) } : post)));
    };

    const handleLike = async (post) => {
        try {
            if (post.liked_by_me) await api.delete(`/posts/${post.id}/unlike`);
            else await api.post(`/posts/${post.id}/like`);
            updatePost(post.id, (current) => ({
                liked_by_me: !current.liked_by_me,
                likes_count: current.likes_count + (current.liked_by_me ? -1 : 1)
            }));
        } catch (err) {
            setError(getErrorMessage(err, 'Could not update the like.'));
        }
    };

    const handleDelete = async (postId) => {
        if (!window.confirm('Delete this post?')) return;
        try {
            await api.delete(`/posts/${postId}`);
            setPosts((prev) => prev.filter((post) => post.id !== postId));
        } catch (err) {
            setError(getErrorMessage(err, 'Could not delete the post.'));
        }
    };

    const handleCommentCountChange = (postId, delta) => {
        updatePost(postId, (current) => ({ comment_count: current.comment_count + delta }));
    };

    return (
        <>
            <CreatePost onPostCreated={() => loadPosts()} />

            {error && <div className="banner error">{error}</div>}

            {loading && <p className="muted center">Loading feed...</p>}
            {!loading && !error && posts.length === 0 && <p className="muted center">No posts yet.</p>}

            {posts.map((post) => (
                <Post
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onDelete={handleDelete}
                    onCommentCountChange={handleCommentCountChange}
                />
            ))}

            {nextCursor && !loading && (
                <button className="button secondary load-more" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Loading...' : 'Load more'}
                </button>
            )}
        </>
    );
};

export default Feed;
