import React, { useState } from 'react';

const Avatar = ({ user, size = 40 }) => {
    const [failed, setFailed] = useState(false);
    const name = user?.username || '?';

    if (user?.profile_picture_url && !failed) {
        return (
            <img
                className="avatar"
                src={user.profile_picture_url}
                alt={name}
                width={size}
                height={size}
                onError={() => setFailed(true)}
            />
        );
    }

    return (
        <div className="avatar avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }}>
            {name.slice(0, 2).toUpperCase()}
        </div>
    );
};

export default Avatar;
