'use client';

import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import { getCurrentUser } from 'aws-amplify/auth';
import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import outputs from '@/amplify_outputs.json';
import '@aws-amplify/ui-react/styles.css';
import './app.css';

// Components
import AddMoodEntry from './components/mood/AddMoodEntry';
import MoodFeed from './components/mood/MoodFeed';
import MoodCalendar from './components/mood/MoodCalendar';
import FriendsList from './components/social/FriendsList';
import FindFriends from './components/social/FindFriends';
import MoodInsights from './components/insights/MoodInsights';

Amplify.configure(outputs);
const client = generateClient<Schema>();

type ViewType = 'dashboard' | 'add-mood' | 'calendar' | 'friends' | 'find-friends' | 'insights';
type FeedType = 'friends' | 'public' | 'my_moods';

export default function MoodSyncApp() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [feedType, setFeedType] = useState<FeedType>('friends');
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [userProfile, setUserProfile] = useState<Schema['UserProfile']['type'] | null>(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    initializeUser();
  }, []);

  const initializeUser = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.userId);
      await createOrUpdateUserProfile(user);
    } catch (error) {
      console.error('Error initializing user:', error);
    }
  };

  const createOrUpdateUserProfile = async (user: any) => {
    try {
      // Try to get existing profile
      let profile = await client.models.UserProfile.get({
        userId: user.userId
      });

      if (!profile.data) {
        // Create new profile
        const newProfile = await client.models.UserProfile.create({
          userId: user.userId,
          username: user.username || user.userId,
          displayName: user.signInDetails?.loginId || user.username || 'User',
          bio: '',
          isPrivate: false,
          moodVisibility: 'FRIENDS_ONLY',
          notificationsEnabled: true,
          weeklyInsightsEnabled: true,
        });
        setUserProfile(newProfile.data);
      } else {
        setUserProfile(profile.data);
      }
    } catch (error) {
      console.error('Error creating/updating user profile:', error);
    }
  };

  const handleMoodAdded = (moodId: string) => {
    // Refresh the feed when a new mood is added
    setCurrentView('dashboard');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'add-mood':
        return (
          <AddMoodEntry
            onMoodAdded={handleMoodAdded}
            onCancel={() => setCurrentView('dashboard')}
          />
        );
      case 'calendar':
        return <MoodCalendar userId={currentUserId} />;
      case 'friends':
        return (
          <FriendsList
            currentUserId={currentUserId}
            showPendingRequests={true}
          />
        );
      case 'find-friends':
        return <FindFriends />;
      case 'insights':
        return <MoodInsights userId={currentUserId} />;
      case 'dashboard':
      default:
        return (
          <div className="dashboard">
            {/* Quick Actions */}
            <div className="quick-actions">
              <button
                className="quick-action-btn primary"
                onClick={() => setCurrentView('add-mood')}
              >
                ✨ Add Mood
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setCurrentView('calendar')}
              >
                📅 Calendar
              </button>
              <button
                className="quick-action-btn"
                onClick={() => setCurrentView('insights')}
              >
                🤖 Insights
              </button>
            </div>

            {/* Feed Type Selector */}
            <div className="feed-selector">
              <button
                className={`feed-btn ${feedType === 'friends' ? 'active' : ''}`}
                onClick={() => setFeedType('friends')}
              >
                👥 Friends
              </button>
              <button
                className={`feed-btn ${feedType === 'my_moods' ? 'active' : ''}`}
                onClick={() => setFeedType('my_moods')}
              >
                🧑 My Moods
              </button>
              <button
                className={`feed-btn ${feedType === 'public' ? 'active' : ''}`}
                onClick={() => setFeedType('public')}
              >
                🌍 Public
              </button>
            </div>

            {/* Mood Feed */}
            <MoodFeed feedType={feedType} />
          </div>
        );
    }
  };

  return (
    <Authenticator>
      {({ signOut, user }) => (
        <div className="moodsync-app">
          {/* Header */}
          <header className="app-header">
            <div className="header-content">
              <div className="header-left">
                <h1 className="app-logo">
                  <span className="logo-icon">😊</span>
                  MoodSync
                </h1>
              </div>
              
              <div className="header-center">
                <nav className="desktop-nav">
                  <button
                    className={`nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setCurrentView('dashboard')}
                  >
                    🏠 Home
                  </button>
                  <button
                    className={`nav-btn ${currentView === 'friends' ? 'active' : ''}`}
                    onClick={() => setCurrentView('friends')}
                  >
                    👥 Friends
                  </button>
                  <button
                    className={`nav-btn ${currentView === 'find-friends' ? 'active' : ''}`}
                    onClick={() => setCurrentView('find-friends')}
                  >
                    🔍 Discover
                  </button>
                </nav>
              </div>

              <div className="header-right">
                <div className="user-menu">
                  <span className="user-greeting">
                    Hi, {userProfile?.displayName || user?.username || 'User'}! 👋
                  </span>
                  <button className="sign-out-btn" onClick={signOut}>
                    Sign out
                  </button>
                </div>
                
                <button
                  className="mobile-menu-btn"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                  ☰
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {showMobileMenu && (
              <div className="mobile-menu">
                <button
                  className={`mobile-nav-btn ${currentView === 'dashboard' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('dashboard');
                    setShowMobileMenu(false);
                  }}
                >
                  🏠 Home
                </button>
                <button
                  className={`mobile-nav-btn ${currentView === 'add-mood' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('add-mood');
                    setShowMobileMenu(false);
                  }}
                >
                  ✨ Add Mood
                </button>
                <button
                  className={`mobile-nav-btn ${currentView === 'friends' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('friends');
                    setShowMobileMenu(false);
                  }}
                >
                  👥 Friends
                </button>
                <button
                  className={`mobile-nav-btn ${currentView === 'find-friends' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('find-friends');
                    setShowMobileMenu(false);
                  }}
                >
                  🔍 Discover
                </button>
                <button
                  className={`mobile-nav-btn ${currentView === 'calendar' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('calendar');
                    setShowMobileMenu(false);
                  }}
                >
                  📅 Calendar
                </button>
                <button
                  className={`mobile-nav-btn ${currentView === 'insights' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentView('insights');
                    setShowMobileMenu(false);
                  }}
                >
                  🤖 Insights
                </button>
                <button
                  className="mobile-nav-btn sign-out"
                  onClick={signOut}
                >
                  👋 Sign Out
                </button>
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="app-main">
            {renderCurrentView()}
          </main>

          {/* Floating Add Button (Mobile) */}
          <div className="floating-actions">
            <button
              className="floating-add-btn"
              onClick={() => setCurrentView('add-mood')}
              title="Add new mood"
            >
              +
            </button>
          </div>

          <style jsx>{`
            .moodsync-app {
              min-height: 100vh;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            }

            .app-header {
              background: white;
              box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
              position: sticky;
              top: 0;
              z-index: 100;
            }

            .header-content {
              max-width: 1200px;
              margin: 0 auto;
              padding: 1rem;
              display: flex;
              align-items: center;
              justify-content: space-between;
            }

            .app-logo {
              margin: 0;
              font-size: 1.5rem;
              font-weight: 600;
              color: #4CAF50;
              display: flex;
              align-items: center;
              gap: 0.5rem;
            }

            .logo-icon {
              font-size: 1.8rem;
            }

            .desktop-nav {
              display: flex;
              gap: 0.5rem;
            }

            .nav-btn {
              background: none;
              border: none;
              padding: 0.75rem 1rem;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
              color: #666;
            }

            .nav-btn:hover {
              background: #f8f8f8;
              color: #333;
            }

            .nav-btn.active {
              background: #4CAF50;
              color: white;
            }

            .user-menu {
              display: flex;
              align-items: center;
              gap: 1rem;
            }

            .user-greeting {
              font-size: 0.875rem;
              color: #666;
            }

            .sign-out-btn {
              background: #f44336;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 8px;
              cursor: pointer;
              font-size: 0.875rem;
              font-weight: 500;
              transition: background-color 0.2s;
            }

            .sign-out-btn:hover {
              background: #da190b;
            }

            .mobile-menu-btn {
              display: none;
              background: none;
              border: none;
              font-size: 1.2rem;
              cursor: pointer;
              padding: 0.5rem;
            }

            .mobile-menu {
              background: white;
              border-top: 1px solid #f0f0f0;
              padding: 1rem;
              display: flex;
              flex-direction: column;
              gap: 0.5rem;
            }

            .mobile-nav-btn {
              background: none;
              border: none;
              padding: 0.75rem 1rem;
              text-align: left;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
            }

            .mobile-nav-btn:hover {
              background: #f8f8f8;
            }

            .mobile-nav-btn.active {
              background: #4CAF50;
              color: white;
            }

            .mobile-nav-btn.sign-out {
              background: #f44336;
              color: white;
              margin-top: 1rem;
            }

            .app-main {
              max-width: 1200px;
              margin: 0 auto;
              padding: 2rem 1rem;
              min-height: calc(100vh - 80px);
            }

            .dashboard {
              max-width: 800px;
              margin: 0 auto;
            }

            .quick-actions {
              display: flex;
              justify-content: center;
              gap: 1rem;
              margin-bottom: 2rem;
            }

            .quick-action-btn {
              padding: 0.75rem 1.5rem;
              border: 2px solid #e0e0e0;
              background: white;
              border-radius: 12px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
            }

            .quick-action-btn:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }

            .quick-action-btn.primary {
              background: #4CAF50;
              color: white;
              border-color: #4CAF50;
            }

            .quick-action-btn.primary:hover {
              background: #45a049;
            }

            .feed-selector {
              display: flex;
              justify-content: center;
              gap: 0.5rem;
              margin-bottom: 2rem;
              background: white;
              padding: 0.5rem;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }

            .feed-btn {
              flex: 1;
              padding: 0.75rem 1rem;
              background: none;
              border: none;
              border-radius: 8px;
              cursor: pointer;
              font-weight: 500;
              transition: all 0.2s;
              color: #666;
            }

            .feed-btn:hover {
              background: #f8f8f8;
              color: #333;
            }

            .feed-btn.active {
              background: #4CAF50;
              color: white;
            }

            .floating-actions {
              position: fixed;
              bottom: 2rem;
              right: 2rem;
              z-index: 50;
            }

            .floating-add-btn {
              width: 60px;
              height: 60px;
              border-radius: 50%;
              background: #4CAF50;
              color: white;
              border: none;
              font-size: 2rem;
              font-weight: 300;
              cursor: pointer;
              box-shadow: 0 4px 20px rgba(76, 175, 80, 0.4);
              transition: all 0.2s;
              display: none;
            }

            .floating-add-btn:hover {
              transform: scale(1.1);
              box-shadow: 0 6px 25px rgba(76, 175, 80, 0.6);
            }

            @media (max-width: 768px) {
              .desktop-nav {
                display: none;
              }

              .mobile-menu-btn {
                display: block;
              }

              .user-greeting {
                display: none;
              }

              .header-content {
                padding: 0.75rem 1rem;
              }

              .app-main {
                padding: 1rem 0.5rem;
              }

              .quick-actions {
                flex-direction: column;
                align-items: center;
              }

              .quick-action-btn {
                width: 100%;
                max-width: 200px;
              }

              .feed-selector {
                flex-direction: row;
                margin: 1rem 0.5rem 2rem;
              }

              .floating-add-btn {
                display: flex;
                align-items: center;
                justify-content: center;
              }
            }

            @media (max-width: 480px) {
              .app-logo {
                font-size: 1.2rem;
              }

              .logo-icon {
                font-size: 1.4rem;
              }

              .floating-actions {
                bottom: 1rem;
                right: 1rem;
              }

              .floating-add-btn {
                width: 50px;
                height: 50px;
                font-size: 1.5rem;
              }
            }
          `}</style>
        </div>
      )}
    </Authenticator>
  );
}