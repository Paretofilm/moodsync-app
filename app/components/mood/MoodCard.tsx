"use client";

import { useState } from "react";
import { StorageImage } from "@aws-amplify/ui-react-storage";
import type { Schema } from "../../../amplify/data/resource";
import { MOOD_TYPES } from "./MoodSelector";

type MoodData = Schema["Mood"]["type"];

interface MoodCardProps {
  mood: MoodData;
  showUserInfo?: boolean;
  onComment?: (moodId: string) => void;
  onLike?: (moodId: string) => void;
  className?: string;
}

export default function MoodCard({
  mood,
  showUserInfo = false,
  onComment,
  onLike,
  className = "",
}: MoodCardProps) {
  const [showFullNote, setShowFullNote] = useState(false);

  const moodData = MOOD_TYPES[mood.moodType];
  const moodDate = new Date(mood.date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const truncateNote = (note: string, maxLength: number = 150) => {
    if (note.length <= maxLength) return note;
    return showFullNote ? note : `${note.substring(0, maxLength)}...`;
  };

  const formatIntensity = (intensity: number) => {
    if (intensity <= 3) return "Low";
    if (intensity <= 6) return "Moderate";
    if (intensity <= 8) return "High";
    return "Very High";
  };

  return (
    <div className={`mood-card ${className}`}>
      {/* Header */}
      <div className="mood-header">
        <div className="mood-indicator">
          <div
            className="mood-circle"
            style={{ backgroundColor: moodData.color }}
          >
            <span className="mood-emoji">{moodData.emoji}</span>
          </div>
          <div className="mood-info">
            <h3 className="mood-type">{moodData.label}</h3>
            <p className="mood-intensity">
              {formatIntensity(mood.intensity)} intensity ({mood.intensity}/10)
            </p>
          </div>
        </div>
        <div className="mood-date">
          <time dateTime={mood.date}>{moodDate}</time>
        </div>
      </div>

      {/* Mood Photo */}
      {mood.photoKey && (
        <div className="mood-photo">
          <StorageImage
            path={mood.photoKey}
            alt="Mood selfie"
            fallbackSrc="/placeholder-image.png"
          />
        </div>
      )}

      {/* Note */}
      {mood.note && (
        <div className="mood-note">
          <p>{truncateNote(mood.note)}</p>
          {mood.note.length > 150 && (
            <button
              type="button"
              className="toggle-note"
              onClick={() => setShowFullNote(!showFullNote)}
            >
              {showFullNote ? "Show less" : "Show more"}
            </button>
          )}
        </div>
      )}

      {/* Spotify Track */}
      {mood.spotifyTrackId && (
        <div className="spotify-track">
          <div className="spotify-icon">🎵</div>
          <div className="track-info">
            {mood.spotifyTrackName && mood.spotifyArtist ? (
              <p>
                <strong>{mood.spotifyTrackName}</strong> by {mood.spotifyArtist}
              </p>
            ) : (
              <p>Listening to music on Spotify</p>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      {mood.tags && mood.tags.length > 0 && (
        <div className="mood-tags">
          {mood.tags.map((tag, index) => (
            <span key={index} className="tag">
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Privacy Indicator */}
      {mood.isPrivate && <div className="privacy-indicator">🔒 Private</div>}

      {/* Actions */}
      <div className="mood-actions">
        <button
          type="button"
          className="action-button like-button"
          onClick={() => onLike?.(mood.id)}
        >
          ❤️ Like
        </button>
        <button
          type="button"
          className="action-button comment-button"
          onClick={() => onComment?.(mood.id)}
        >
          💬 Comment
        </button>
        <div className="mood-timestamp">
          {new Date(mood.createdAt || "").toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </div>
      </div>

      <style jsx>{`
        .mood-card {
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 1.5rem;
          overflow: hidden;
          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .mood-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .mood-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          padding: 1.5rem 1.5rem 1rem;
        }

        .mood-indicator {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .mood-circle {
          width: 60px;
          height: 60px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .mood-info h3 {
          margin: 0 0 0.25rem 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #333;
        }

        .mood-intensity {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        .mood-date {
          text-align: right;
          color: #666;
          font-size: 0.875rem;
        }

        .mood-photo {
          margin: 0 1.5rem 1rem;
          border-radius: 12px;
          overflow: hidden;
        }

        .mood-photo img {
          width: 100%;
          height: auto;
          display: block;
        }

        .mood-note {
          padding: 0 1.5rem 1rem;
        }

        .mood-note p {
          margin: 0 0 0.5rem 0;
          color: #333;
          line-height: 1.5;
        }

        .toggle-note {
          background: none;
          border: none;
          color: #4caf50;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .spotify-track {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1.5rem;
          margin: 0 1.5rem 1rem;
          background: #f8f8f8;
          border-radius: 12px;
        }

        .spotify-icon {
          font-size: 1.25rem;
        }

        .track-info p {
          margin: 0;
          font-size: 0.875rem;
          color: #333;
        }

        .mood-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          padding: 0 1.5rem 1rem;
        }

        .tag {
          background: #f0f0f0;
          color: #666;
          padding: 0.25rem 0.75rem;
          border-radius: 20px;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .privacy-indicator {
          padding: 0 1.5rem 1rem;
          font-size: 0.875rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }

        .mood-actions {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1rem 1.5rem;
          border-top: 1px solid #f0f0f0;
        }

        .action-button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 0.875rem;
          color: #666;
          display: flex;
          align-items: center;
          gap: 0.25rem;
          padding: 0.5rem;
          border-radius: 8px;
          transition: background-color 0.2s;
        }

        .action-button:hover {
          background: #f8f8f8;
          color: #333;
        }

        .mood-timestamp {
          font-size: 0.75rem;
          color: #999;
        }

        @media (max-width: 768px) {
          .mood-header {
            flex-direction: column;
            gap: 1rem;
          }

          .mood-date {
            text-align: left;
          }

          .mood-actions {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
}
