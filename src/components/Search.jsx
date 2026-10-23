import React, { useState } from 'react';
import api, { getErrorMessage } from '../api';

const excerpt = (text) => {
    const value = text || '';
    return value.length > 120 ? `${value.slice(0, 120)}...` : value;
};

const Search = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSearch = async (e) => {
        e.preventDefault();
        const q = query.trim();
        if (!q) return;

        setLoading(true);
        setError('');
        try {
            const { data } = await api.get('/search', { params: { q } });
            setResults(data);
        } catch (err) {
            setError(getErrorMessage(err, 'Search failed.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <section className="card">
            <form className="search-form" onSubmit={handleSearch}>
                <input
                    className="input"
                    type="search"
                    placeholder="Search posts..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    maxLength={100}
                />
                <button className="button" type="submit" disabled={loading || !query.trim()}>
                    {loading ? 'Searching...' : 'Search'}
                </button>
            </form>

            {error && <p className="error">{error}</p>}
            {results?.length === 0 && <p className="muted search-empty">No posts found.</p>}

            {results?.map((post) => (
                <div key={post.id} className="list-item">
                    <h4>{post.title}</h4>
                    <p>{excerpt(post.content)}</p>
                    <p className="muted">by {post.author?.username || 'Unknown user'}</p>
                </div>
            ))}
        </section>
    );
};

export default Search;
