import React, { useEffect, useState } from 'react';
import api, { getErrorMessage } from '../api';
import Avatar from './Avatar';

const UserProfile = ({ userId }) => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError('');

        api.get(`/users/${userId}`)
            .then(({ data }) => !cancelled && setProfile(data))
            .catch((err) => !cancelled && setError(getErrorMessage(err, 'Could not load the profile.')))
            .finally(() => !cancelled && setLoading(false));

        return () => {
            cancelled = true;
        };
    }, [userId]);

    if (loading) return <p className="muted center">Loading profile...</p>;
    if (error) return <div className="banner error">{error}</div>;

    return (
        <section className="card profile">
            <Avatar user={profile} size={88} />
            <h2>{profile.username}</h2>
            {profile.bio && <p className="muted">{profile.bio}</p>}
            <div className="stats">
                <div><strong>{profile.total_posts ?? 0}</strong><span className="muted">Posts</span></div>
                <div><strong>{profile.total_comments ?? 0}</strong><span className="muted">Comments</span></div>
                <div><strong>{profile.total_post_likes ?? 0}</strong><span className="muted">Likes</span></div>
            </div>
        </section>
    );
};

export default UserProfile;
