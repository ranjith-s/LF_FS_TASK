import React, { useState } from 'react';
import { useAuth } from './AuthContext';
import AuthForm from './components/AuthForm';
import Feed from './components/Feed';
import Search from './components/Search';
import TrendingPosts from './components/TrendingPosts';
import UserProfile from './components/UserProfile';

const TABS = [
    { id: 'feed', label: '🏠 Feed' },
    { id: 'trending', label: '🔥 Trending' },
    { id: 'search', label: '🔍 Search' },
    { id: 'profile', label: '👤 Profile' }
];

const App = () => {
    const { user, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('feed');

    if (!user) return <AuthForm />;

    return (
        <div className="app">
            <header className="header">
                <div className="header-inner">
                    <span className="brand">SocialApp</span>
                    <nav className="nav">
                        {TABS.map((tab) => (
                            <button
                                key={tab.id}
                                className={`nav-button ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                        <button className="nav-button" onClick={logout}>Log out</button>
                    </nav>
                </div>
            </header>

            <main className="main">
                {activeTab === 'feed' && <Feed />}
                {activeTab === 'trending' && <TrendingPosts />}
                {activeTab === 'search' && <Search />}
                {activeTab === 'profile' && <UserProfile userId={user.id} />}
            </main>
        </div>
    );
};

export default App;
