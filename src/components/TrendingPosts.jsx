import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';

const TrendingPosts = () => {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        api.get('/trending')
            .then(({ data }) => setPosts(data))
            .catch((err) => setError(getErrorMessage(err, 'Could not load trending posts.')))
            .finally(() => setLoading(false));
    }, []);

    return (
        <section className="card">
            <h2 className="card-title">🔥 Trending (last 7 days)</h2>
            {loading && <p className="muted">Loading trending posts...</p>}
            {error && <p className="error">{error}</p>}
            {!loading && !error && posts.length === 0 && <p className="muted">Nothing trending this week yet.</p>}

            {posts.map((post) => (
                <div key={post.id} className="list-item">
                    <h4>{post.title}</h4>
                    <p className="muted">
                        by {post.author?.username || 'Unknown user'} · ❤️ {post.likes_count ?? 0} · 💬 {post.comment_count ?? 0}
                    </p>
                </div>
            ))}
        </section>
    );
};

export default TrendingPosts;
