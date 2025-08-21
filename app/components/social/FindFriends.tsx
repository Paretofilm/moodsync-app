"use client";

import { useState, useEffect, useRef } from "react";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { generateClient } from "aws-amplify/data";
import { getCurrentUser } from "aws-amplify/auth";
import type { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>();

type UserProfileData = Schema["UserProfile"]["type"];

interface UserSearchResult extends UserProfileData {
  friendshipStatus?:
    | "NONE"
    | "PENDING_SENT"
    | "PENDING_RECEIVED"
    | "FRIENDS"
    | "BLOCKED";
}

interface FindFriendsProps {
  onFriendRequestSent?: (userId: string) => void;
}

export default function FindFriends({ onFriendRequestSent }: FindFriendsProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [friendships, setFriendships] = useState<Map<string, string>>(
    new Map(),
  );
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    getCurrentUserInfo();
    loadFriendships();
  }, []);

  useEffect(() => {
    // Debounce search
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.trim().length >= 2) {
      searchTimeoutRef.current = setTimeout(() => {
        searchUsers();
      }, 500);
    } else {
      setSearchResults([]);
    }

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, currentUserId]);

  const getCurrentUserInfo = async () => {
    try {
      const user = await getCurrentUser();
      setCurrentUserId(user.userId);
    } catch (error) {
      console.error("Error getting current user:", error);
    }
  };

  const loadFriendships = async () => {
    if (!currentUserId) return;

    try {
      // Get all friendships involving current user
      const [asRequester, asAddressee] = await Promise.all([
        client.models.Friendship.list({
          filter: { requesterId: { eq: currentUserId } },
        }),
        client.models.Friendship.list({
          filter: { addresseeId: { eq: currentUserId } },
        }),
      ]);

      const friendshipMap = new Map<string, string>();

      // Process friendships where current user is the requester
      asRequester.data?.forEach((friendship) => {
        friendshipMap.set(
          friendship.addresseeId,
          friendship.status === "ACCEPTED"
            ? "FRIENDS"
            : friendship.status === "PENDING"
              ? "PENDING_SENT"
              : friendship.status === "BLOCKED"
                ? "BLOCKED"
                : "NONE",
        );
      });

      // Process friendships where current user is the addressee
      asAddressee.data?.forEach((friendship) => {
        friendshipMap.set(
          friendship.requesterId,
          friendship.status === "ACCEPTED"
            ? "FRIENDS"
            : friendship.status === "PENDING"
              ? "PENDING_RECEIVED"
              : friendship.status === "BLOCKED"
                ? "BLOCKED"
                : "NONE",
        );
      });

      setFriendships(friendshipMap);
    } catch (error) {
      console.error("Error loading friendships:", error);
    }
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || !currentUserId) return;

    setIsSearching(true);

    try {
      const result = await client.models.UserProfile.list({
        filter: {
          or: [
            { username: { contains: searchQuery } },
            { displayName: { contains: searchQuery } },
          ],
        },
      });

      if (result.data) {
        // Filter out current user and add friendship status
        const usersWithStatus = result.data
          .filter((user) => user.userId !== currentUserId)
          .map((user) => ({
            ...user,
            friendshipStatus: friendships.get(user.userId) || "NONE",
          }));

        setSearchResults(usersWithStatus);
      }
    } catch (error) {
      console.error("Error searching users:", error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const sendFriendRequest = async (targetUserId: string) => {
    try {
      await client.models.Friendship.create({
        requesterId: currentUserId,
        addresseeId: targetUserId,
        status: "PENDING",
      });

      // Update local state
      const updatedFriendships = new Map(friendships);
      updatedFriendships.set(targetUserId, "PENDING_SENT");
      setFriendships(updatedFriendships);

      // Update search results
      setSearchResults((results) =>
        results.map((user) =>
          user.userId === targetUserId
            ? { ...user, friendshipStatus: "PENDING_SENT" }
            : user,
        ),
      );

      onFriendRequestSent?.(targetUserId);
    } catch (error) {
      console.error("Error sending friend request:", error);
      alert("Failed to send friend request. Please try again.");
    }
  };

  const cancelFriendRequest = async (targetUserId: string) => {
    try {
      await client.models.Friendship.delete({
        requesterId: currentUserId,
        addresseeId: targetUserId,
      });

      // Update local state
      const updatedFriendships = new Map(friendships);
      updatedFriendships.set(targetUserId, "NONE");
      setFriendships(updatedFriendships);

      // Update search results
      setSearchResults((results) =>
        results.map((user) =>
          user.userId === targetUserId
            ? { ...user, friendshipStatus: "NONE" }
            : user,
        ),
      );
    } catch (error) {
      console.error("Error canceling friend request:", error);
      alert("Failed to cancel friend request. Please try again.");
    }
  };

  const getActionButton = (user: UserSearchResult) => {
    switch (user.friendshipStatus) {
      case "FRIENDS":
        return <span className="status-badge friends">✓ Friends</span>;
      case "PENDING_SENT":
        return (
          <button
            className="action-button cancel-button"
            onClick={() => cancelFriendRequest(user.userId)}
          >
            Cancel Request
          </button>
        );
      case "PENDING_RECEIVED":
        return (
          <span className="status-badge pending">Pending Your Response</span>
        );
      case "BLOCKED":
        return <span className="status-badge blocked">Blocked</span>;
      default:
        return (
          <button
            className="action-button add-button"
            onClick={() => sendFriendRequest(user.userId)}
          >
            Add Friend
          </button>
        );
    }
  };

  return (
    <div className="find-friends-container">
      <div className="search-section">
        <h2>Find Friends</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by username or display name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
          {isSearching && <div className="search-spinner">🔍</div>}
        </div>

        {searchQuery.length > 0 && searchQuery.length < 2 && (
          <p className="search-hint">Type at least 2 characters to search</p>
        )}
      </div>

      <div className="results-section">
        {searchResults.length === 0 &&
          searchQuery.length >= 2 &&
          !isSearching && (
            <div className="no-results">
              <p>No users found matching "{searchQuery}"</p>
              <p>Try searching with different keywords.</p>
            </div>
          )}

        {searchResults.length > 0 && (
          <div className="results-list">
            {searchResults.map((user) => (
              <div key={user.userId} className="user-card">
                <div className="user-avatar">
                  {user.profilePicture ? (
                    <StorageImage
                      path={user.profilePicture}
                      alt={`${user.displayName || user.username}'s avatar`}
                      fallbackSrc="/default-avatar.png"
                    />
                  ) : (
                    <div className="default-avatar">
                      {(user.displayName || user.username)
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="user-info">
                  <h4 className="user-name">
                    {user.displayName || user.username}
                  </h4>
                  {user.displayName && user.username !== user.displayName && (
                    <p className="username">@{user.username}</p>
                  )}
                  {user.bio && <p className="user-bio">{user.bio}</p>}
                  <div className="user-privacy">
                    {user.isPrivate ? (
                      <span className="privacy-badge private">
                        🔒 Private Profile
                      </span>
                    ) : (
                      <span className="privacy-badge public">
                        🌍 Public Profile
                      </span>
                    )}
                  </div>
                </div>

                <div className="user-actions">{getActionButton(user)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .find-friends-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .search-section {
          margin-bottom: 2rem;
        }

        .search-section h2 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .search-box {
          position: relative;
          display: flex;
          align-items: center;
        }

        .search-input {
          flex: 1;
          padding: 0.75rem 1rem;
          border: 2px solid #e0e0e0;
          border-radius: 12px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .search-input:focus {
          outline: none;
          border-color: #4caf50;
        }

        .search-spinner {
          position: absolute;
          right: 1rem;
          font-size: 1.2rem;
          animation: pulse 1.5s infinite;
        }

        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        .search-hint {
          margin: 0.5rem 0 0 0;
          font-size: 0.875rem;
          color: #666;
        }

        .no-results {
          text-align: center;
          padding: 3rem 1rem;
          color: #666;
        }

        .no-results p {
          margin: 0.5rem 0;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .user-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .user-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .user-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .user-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .default-avatar {
          width: 100%;
          height: 100%;
          background: #4caf50;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          font-weight: 600;
        }

        .user-info {
          flex: 1;
        }

        .user-name {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .username {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #666;
        }

        .user-bio {
          margin: 0 0 0.5rem 0;
          font-size: 0.875rem;
          color: #666;
          line-height: 1.4;
        }

        .user-privacy {
          margin-top: 0.5rem;
        }

        .privacy-badge {
          font-size: 0.75rem;
          padding: 0.25rem 0.5rem;
          border-radius: 12px;
          font-weight: 500;
        }

        .privacy-badge.private {
          background: #fff3cd;
          color: #856404;
        }

        .privacy-badge.public {
          background: #d1ecf1;
          color: #0c5460;
        }

        .user-actions {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }

        .action-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
          min-width: 120px;
          text-align: center;
        }

        .add-button {
          background: #4caf50;
          color: white;
        }

        .add-button:hover {
          background: #45a049;
        }

        .cancel-button {
          background: #f44336;
          color: white;
        }

        .cancel-button:hover {
          background: #da190b;
        }

        .status-badge {
          font-size: 0.875rem;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          font-weight: 500;
          text-align: center;
          min-width: 120px;
        }

        .status-badge.friends {
          background: #d4edda;
          color: #155724;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.blocked {
          background: #f8d7da;
          color: #721c24;
        }

        @media (max-width: 768px) {
          .user-card {
            flex-direction: column;
            text-align: center;
          }

          .user-info {
            text-align: center;
          }

          .user-actions {
            width: 100%;
          }

          .action-button,
          .status-badge {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
