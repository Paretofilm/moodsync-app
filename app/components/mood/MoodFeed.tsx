"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../../amplify/data/resource";
import MoodCard from "./MoodCard";

const client = generateClient<Schema>();

type MoodData = Schema["Mood"]["type"];

interface MoodFeedProps {
  feedType?: "friends" | "public" | "my_moods";
  limit?: number;
  onMoodSelect?: (mood: MoodData) => void;
}

export default function MoodFeed({
  feedType = "friends",
  limit = 20,
  onMoodSelect,
}: MoodFeedProps) {
  const [moods, setMoods] = useState<MoodData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [friendIds, setFriendIds] = useState<string[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [nextToken, setNextToken] = useState<string | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (currentUserId && (feedType !== "friends" || friendIds.length > 0)) {
      loadMoods();
      setupRealTimeSubscription();
    }
  }, [currentUserId, friendIds, feedType]);

  const initialize = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.userId);

      if (feedType === "friends") {
        await loadFriends(user.userId);
      }
    } catch (error) {
      console.error("Error initializing:", error);
    }
  };

  const loadFriends = async (userId: string) => {
    try {
      // Get accepted friendships
      const [asRequester, asAddressee] = await Promise.all([
        client.models.Friendship.list({
          filter: {
            and: [
              { requesterId: { eq: userId } },
              { status: { eq: "ACCEPTED" } },
            ],
          },
        }),
        client.models.Friendship.list({
          filter: {
            and: [
              { addresseeId: { eq: userId } },
              { status: { eq: "ACCEPTED" } },
            ],
          },
        }),
      ]);

      const friends = [
        ...(asRequester.data?.map((f) => f.addresseeId) || []),
        ...(asAddressee.data?.map((f) => f.requesterId) || []),
      ];

      setFriendIds(friends);
    } catch (error) {
      console.error("Error loading friends:", error);
      setFriendIds([]); // Continue with empty friends list
    }
  };

  const loadMoods = async (refresh = false) => {
    try {
      setIsLoading(refresh ? false : true);

      let query;

      switch (feedType) {
        case "my_moods":
          query = client.models.Mood.list({
            filter: { userId: { eq: currentUserId } },
            limit,
            nextToken: refresh ? null : nextToken,
          });
          break;

        case "public":
          query = client.models.Mood.list({
            filter: { isPrivate: { eq: false } },
            limit,
            nextToken: refresh ? null : nextToken,
          });
          break;

        case "friends":
        default:
          if (friendIds.length === 0) {
            setMoods([]);
            setIsLoading(false);
            return;
          }

          // Fetch all public moods and filter client-side for friends
          // Note: This is a temporary solution. In production, you'd want
          // to use a more efficient server-side filtering approach
          query = client.models.Mood.list({
            filter: { isPrivate: { eq: false } },
            limit: limit * 2, // Fetch more to account for filtering
            nextToken: refresh ? null : nextToken,
          });
          break;
      }

      const result = await query;

      if (result.data) {
        // Filter for friends feed if necessary
        let filteredMoods = result.data;
        if (feedType === "friends" && friendIds.length > 0) {
          filteredMoods = result.data.filter((mood) =>
            friendIds.includes(mood.userId),
          );
        }

        const sortedMoods = filteredMoods.sort(
          (a, b) =>
            new Date(b.createdAt || "").getTime() -
            new Date(a.createdAt || "").getTime(),
        );

        if (refresh) {
          setMoods(sortedMoods);
        } else {
          setMoods((prev) => [...prev, ...sortedMoods]);
        }

        setNextToken(result.nextToken || null);
        setHasMore(!!result.nextToken);
      }
    } catch (error) {
      console.error("Error loading moods:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const setupRealTimeSubscription = () => {
    // Subscribe to new mood entries
    const createSubscription = client.models.Mood.observeQuery().subscribe({
      next: ({ items, isSynced }) => {
        if (isSynced) {
          // Filter items based on feed type
          let filteredItems = items;

          switch (feedType) {
            case "my_moods":
              filteredItems = items.filter(
                (mood) => mood.userId === currentUserId,
              );
              break;
            case "public":
              filteredItems = items.filter((mood) => !mood.isPrivate);
              break;
            case "friends":
            default:
              filteredItems = items.filter(
                (mood) => friendIds.includes(mood.userId) && !mood.isPrivate,
              );
              break;
          }

          // Sort by creation date
          const sortedItems = filteredItems.sort(
            (a, b) =>
              new Date(b.createdAt || "").getTime() -
              new Date(a.createdAt || "").getTime(),
          );

          setMoods(sortedItems.slice(0, limit));
        }
      },
      error: (error) => {
        console.error("Real-time subscription error:", error);
      },
    });

    // Return cleanup function
    return () => {
      createSubscription.unsubscribe();
    };
  };

  const handleMoodComment = (moodId: string) => {
    // In a real app, this would open a comment modal or navigate to comment view
    console.log("Comment on mood:", moodId);
  };

  const handleMoodLike = async (moodId: string) => {
    // In a real app, this would handle liking/unliking
    console.log("Like mood:", moodId);
    // Could create a MoodLike model and implement like functionality
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      loadMoods(false);
    }
  };

  const refresh = () => {
    setNextToken(null);
    loadMoods(true);
  };

  const getFeedTitle = () => {
    switch (feedType) {
      case "my_moods":
        return "My Moods";
      case "public":
        return "Public Moods";
      case "friends":
      default:
        return "Friends' Moods";
    }
  };

  const getEmptyMessage = () => {
    switch (feedType) {
      case "my_moods":
        return "You haven't posted any moods yet. Start by sharing how you're feeling!";
      case "public":
        return "No public moods available. Be the first to share!";
      case "friends":
      default:
        return friendIds.length === 0
          ? "Connect with friends to see their mood updates here!"
          : "Your friends haven't shared any moods yet.";
    }
  };

  if (isLoading && moods.length === 0) {
    return (
      <div className="mood-feed-loading">
        <div className="loading-spinner"></div>
        <p>Loading {getFeedTitle().toLowerCase()}...</p>
      </div>
    );
  }

  return (
    <div className="mood-feed-container">
      {/* Header */}
      <div className="feed-header">
        <h2>{getFeedTitle()}</h2>
        <button
          className="refresh-button"
          onClick={refresh}
          disabled={isLoading}
        >
          🔄 Refresh
        </button>
      </div>

      {/* Stats */}
      {feedType === "friends" && friendIds.length > 0 && (
        <div className="feed-stats">
          <p>Following {friendIds.length} friends</p>
        </div>
      )}

      {/* Moods List */}
      <div className="moods-list">
        {moods.length === 0 ? (
          <div className="empty-feed">
            <div className="empty-icon">😊</div>
            <p>{getEmptyMessage()}</p>
          </div>
        ) : (
          <>
            {moods.map((mood) => (
              <MoodCard
                key={mood.id}
                mood={mood}
                showUserInfo={feedType !== "my_moods"}
                onComment={handleMoodComment}
                onLike={handleMoodLike}
              />
            ))}

            {/* Load More Button */}
            {hasMore && (
              <div className="load-more-section">
                <button
                  className="load-more-button"
                  onClick={loadMore}
                  disabled={isLoading}
                >
                  {isLoading ? "Loading..." : "Load More"}
                </button>
              </div>
            )}

            {!hasMore && moods.length > 0 && (
              <div className="end-of-feed">
                <p>You've reached the end! 🎉</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Real-time Indicator */}
      <div className="realtime-indicator">
        <div className="pulse-dot"></div>
        <span>Live updates enabled</span>
      </div>

      <style jsx>{`
        .mood-feed-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }

        .mood-feed-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem 1rem;
          color: #666;
        }

        .loading-spinner {
          width: 40px;
          height: 40px;
          border: 3px solid #f3f3f3;
          border-top: 3px solid #4caf50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% {
            transform: rotate(0deg);
          }
          100% {
            transform: rotate(360deg);
          }
        }

        .feed-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .feed-header h2 {
          margin: 0;
          color: #333;
        }

        .refresh-button {
          background: #f8f8f8;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          padding: 0.5rem 1rem;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          transition: all 0.2s;
        }

        .refresh-button:hover:not(:disabled) {
          background: #4caf50;
          color: white;
          border-color: #4caf50;
        }

        .refresh-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .feed-stats {
          background: #f8f8f8;
          padding: 0.75rem 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .feed-stats p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .moods-list {
          position: relative;
        }

        .empty-feed {
          text-align: center;
          padding: 3rem 1rem;
          color: #666;
        }

        .empty-icon {
          font-size: 3rem;
          margin-bottom: 1rem;
        }

        .empty-feed p {
          margin: 0;
          line-height: 1.5;
        }

        .load-more-section {
          text-align: center;
          margin: 2rem 0;
        }

        .load-more-button {
          background: #4caf50;
          color: white;
          border: none;
          padding: 0.75rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 500;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .load-more-button:hover:not(:disabled) {
          background: #45a049;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .load-more-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .end-of-feed {
          text-align: center;
          padding: 2rem 1rem;
          color: #666;
        }

        .end-of-feed p {
          margin: 0;
          font-style: italic;
        }

        .realtime-indicator {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(76, 175, 80, 0.9);
          color: white;
          padding: 0.5rem 1rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
          backdrop-filter: blur(10px);
          z-index: 1000;
        }

        .pulse-dot {
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @media (max-width: 768px) {
          .mood-feed-container {
            padding: 0.5rem;
          }

          .feed-header {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .realtime-indicator {
            position: static;
            margin-top: 2rem;
            align-self: center;
          }
        }
      `}</style>
    </div>
  );
}
