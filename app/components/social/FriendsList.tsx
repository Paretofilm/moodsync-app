"use client";

import { useState, useEffect } from "react";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../amplify/data/resource";

const client = generateClient<Schema>();

type FriendshipData = Schema["Friendship"]["type"];
type UserProfileData = Schema["UserProfile"]["type"];

interface Friend extends UserProfileData {
  friendshipStatus: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
  friendshipId: string;
}

interface FriendsListProps {
  currentUserId: string;
  onFriendSelect?: (friend: Friend) => void;
  showPendingRequests?: boolean;
}

export default function FriendsList({
  currentUserId,
  onFriendSelect,
  showPendingRequests = false,
}: FriendsListProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"friends" | "pending">("friends");

  useEffect(() => {
    fetchFriends();
  }, [currentUserId]);

  const fetchFriends = async () => {
    try {
      setIsLoading(true);

      // Fetch friendships where current user is either requester or addressee
      const friendshipsAsRequester = await client.models.Friendship.list({
        filter: {
          requesterId: { eq: currentUserId },
        },
      });

      const friendshipsAsAddressee = await client.models.Friendship.list({
        filter: {
          addresseeId: { eq: currentUserId },
        },
      });

      // Combine and process friendships
      const allFriendships = [
        ...(friendshipsAsRequester.data || []),
        ...(friendshipsAsAddressee.data || []),
      ];

      // Separate accepted friends and pending requests
      const acceptedFriends: Friend[] = [];
      const pending: Friend[] = [];

      for (const friendship of allFriendships) {
        // Determine the other user's ID
        const otherUserId =
          friendship.requesterId === currentUserId
            ? friendship.addresseeId
            : friendship.requesterId;

        // Fetch the other user's profile
        const userProfile = await client.models.UserProfile.get({
          userId: otherUserId,
        });

        if (userProfile.data) {
          const friend: Friend = {
            ...userProfile.data,
            friendshipStatus: friendship.status,
            friendshipId: `${friendship.requesterId}-${friendship.addresseeId}`,
          };

          if (friendship.status === "ACCEPTED") {
            acceptedFriends.push(friend);
          } else if (friendship.status === "PENDING") {
            pending.push(friend);
          }
        }
      }

      setFriends(acceptedFriends);
      setPendingRequests(pending);
    } catch (error) {
      console.error("Error fetching friends:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFriendRequest = async (
    friendId: string,
    action: "accept" | "decline",
  ) => {
    try {
      // Find the friendship record
      const friendship = await client.models.Friendship.get({
        requesterId: friendId,
        addresseeId: currentUserId,
      });

      if (friendship.data) {
        await client.models.Friendship.update({
          requesterId: friendId,
          addresseeId: currentUserId,
          status: action === "accept" ? "ACCEPTED" : "DECLINED",
        });

        // Refresh the friends list
        fetchFriends();
      }
    } catch (error) {
      console.error("Error handling friend request:", error);
    }
  };

  const removeFriend = async (friend: Friend) => {
    if (
      !confirm(
        `Are you sure you want to remove ${friend.displayName || friend.username} from your friends?`,
      )
    ) {
      return;
    }

    try {
      // Delete the friendship record
      const [requesterId, addresseeId] = friend.friendshipId.split("-");
      await client.models.Friendship.delete({
        requesterId,
        addresseeId,
      });

      // Refresh the friends list
      fetchFriends();
    } catch (error) {
      console.error("Error removing friend:", error);
    }
  };

  const blockUser = async (friend: Friend) => {
    if (
      !confirm(
        `Are you sure you want to block ${friend.displayName || friend.username}?`,
      )
    ) {
      return;
    }

    try {
      const [requesterId, addresseeId] = friend.friendshipId.split("-");
      await client.models.Friendship.update({
        requesterId,
        addresseeId,
        status: "BLOCKED",
      });

      fetchFriends();
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="friends-list-loading">
        <div className="loading-spinner"></div>
        <p>Loading friends...</p>
      </div>
    );
  }

  return (
    <div className="friends-list-container">
      {/* Tabs */}
      <div className="friends-tabs">
        <button
          className={`tab-button ${activeTab === "friends" ? "active" : ""}`}
          onClick={() => setActiveTab("friends")}
        >
          Friends ({friends.length})
        </button>
        {showPendingRequests && (
          <button
            className={`tab-button ${activeTab === "pending" ? "active" : ""}`}
            onClick={() => setActiveTab("pending")}
          >
            Pending ({pendingRequests.length})
          </button>
        )}
      </div>

      {/* Friends List */}
      {activeTab === "friends" && (
        <div className="friends-section">
          {friends.length === 0 ? (
            <div className="empty-state">
              <p>No friends yet. Start connecting with other users!</p>
            </div>
          ) : (
            <div className="friends-grid">
              {friends.map((friend) => (
                <div key={friend.userId} className="friend-card">
                  <div className="friend-avatar">
                    {friend.profilePicture ? (
                      <StorageImage
                        path={friend.profilePicture}
                        alt={`${friend.displayName || friend.username}'s avatar`}
                        fallbackSrc="/default-avatar.png"
                      />
                    ) : (
                      <div className="default-avatar">
                        {(friend.displayName || friend.username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="friend-info">
                    <h4 className="friend-name">
                      {friend.displayName || friend.username}
                    </h4>
                    {friend.bio && <p className="friend-bio">{friend.bio}</p>}
                  </div>

                  <div className="friend-actions">
                    <button
                      className="action-button view-button"
                      onClick={() => onFriendSelect?.(friend)}
                    >
                      View Profile
                    </button>
                    <div className="dropdown">
                      <button className="dropdown-toggle">⋯</button>
                      <div className="dropdown-menu">
                        <button onClick={() => removeFriend(friend)}>
                          Remove Friend
                        </button>
                        <button onClick={() => blockUser(friend)}>
                          Block User
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Pending Requests */}
      {activeTab === "pending" && showPendingRequests && (
        <div className="pending-section">
          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <p>No pending friend requests.</p>
            </div>
          ) : (
            <div className="pending-list">
              {pendingRequests.map((request) => (
                <div key={request.userId} className="pending-card">
                  <div className="friend-avatar">
                    {request.profilePicture ? (
                      <StorageImage
                        path={request.profilePicture}
                        alt={`${request.displayName || request.username}'s avatar`}
                        fallbackSrc="/default-avatar.png"
                      />
                    ) : (
                      <div className="default-avatar">
                        {(request.displayName || request.username)
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="request-info">
                    <h4>{request.displayName || request.username}</h4>
                    <p>wants to be your friend</p>
                  </div>

                  <div className="request-actions">
                    <button
                      className="accept-button"
                      onClick={() =>
                        handleFriendRequest(request.userId, "accept")
                      }
                    >
                      Accept
                    </button>
                    <button
                      className="decline-button"
                      onClick={() =>
                        handleFriendRequest(request.userId, "decline")
                      }
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .friends-list-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .friends-list-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          color: #666;
        }

        .loading-spinner {
          width: 30px;
          height: 30px;
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

        .friends-tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 2rem;
          border-bottom: 2px solid #f0f0f0;
        }

        .tab-button {
          padding: 0.75rem 1.5rem;
          background: none;
          border: none;
          border-bottom: 2px solid transparent;
          cursor: pointer;
          font-weight: 500;
          color: #666;
          transition: all 0.2s;
        }

        .tab-button:hover {
          color: #4caf50;
        }

        .tab-button.active {
          color: #4caf50;
          border-bottom-color: #4caf50;
        }

        .empty-state {
          text-align: center;
          padding: 3rem 1rem;
          color: #666;
        }

        .friends-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        .friend-card {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .friend-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        }

        .friend-avatar {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          overflow: hidden;
          margin: 0 auto 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .friend-avatar img {
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

        .friend-info {
          text-align: center;
          margin-bottom: 1rem;
        }

        .friend-name {
          margin: 0 0 0.5rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .friend-bio {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
          line-height: 1.4;
        }

        .friend-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.5rem;
        }

        .action-button {
          padding: 0.5rem 1rem;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .view-button {
          background: #4caf50;
          color: white;
          flex: 1;
        }

        .view-button:hover {
          background: #45a049;
        }

        .dropdown {
          position: relative;
        }

        .dropdown-toggle {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.5rem;
          font-size: 1.2rem;
          color: #666;
          border-radius: 4px;
          transition: background-color 0.2s;
        }

        .dropdown-toggle:hover {
          background: #f8f8f8;
        }

        .dropdown-menu {
          display: none;
          position: absolute;
          top: 100%;
          right: 0;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 10;
          min-width: 150px;
        }

        .dropdown:hover .dropdown-menu {
          display: block;
        }

        .dropdown-menu button {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          background: none;
          border: none;
          text-align: left;
          cursor: pointer;
          font-size: 0.875rem;
          color: #333;
          border-bottom: 1px solid #f0f0f0;
        }

        .dropdown-menu button:last-child {
          border-bottom: none;
        }

        .dropdown-menu button:hover {
          background: #f8f8f8;
          color: #d32f2f;
        }

        .pending-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .pending-card {
          display: flex;
          align-items: center;
          gap: 1rem;
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .pending-card .friend-avatar {
          width: 50px;
          height: 50px;
          margin: 0;
        }

        .request-info {
          flex: 1;
        }

        .request-info h4 {
          margin: 0 0 0.25rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #333;
        }

        .request-info p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .request-actions {
          display: flex;
          gap: 0.5rem;
        }

        .accept-button {
          background: #4caf50;
          color: white;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: background-color 0.2s;
        }

        .accept-button:hover {
          background: #45a049;
        }

        .decline-button {
          background: #f0f0f0;
          color: #666;
          border: none;
          padding: 0.5rem 1rem;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .decline-button:hover {
          background: #d32f2f;
          color: white;
        }

        @media (max-width: 768px) {
          .friends-grid {
            grid-template-columns: 1fr;
          }

          .pending-card {
            flex-direction: column;
            text-align: center;
          }

          .request-actions {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
