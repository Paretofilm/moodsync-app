"use client";

import { useState, useRef } from "react";
import { FileUploader } from "@aws-amplify/ui-react-storage";
import { generateClient } from "aws-amplify/data";
import { uploadData } from "aws-amplify/storage";
import type { Schema } from "../../../amplify/data/resource";
import MoodSelector, { type MoodType, MOOD_TYPES } from "./MoodSelector";

const client = generateClient<Schema>();

interface AddMoodEntryProps {
  onMoodAdded?: (moodId: string) => void;
  onCancel?: () => void;
}

export default function AddMoodEntry({
  onMoodAdded,
  onCancel,
}: AddMoodEntryProps) {
  const [selectedMood, setSelectedMood] = useState<MoodType | undefined>();
  const [intensity, setIntensity] = useState(5);
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [spotifyLink, setSpotifyLink] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedPhoto, setUploadedPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePhotoUpload = async (file: File) => {
    try {
      setIsUploading(true);
      const fileName = `mood-selfies/\${Date.now()}-\${file.name}`;

      await uploadData({
        path: fileName,
        data: file,
        options: {
          contentType: file.type,
        },
      });

      setUploadedPhoto(fileName);
    } catch (error) {
      console.error("Error uploading photo:", error);
      alert("Failed to upload photo. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const parseSpotifyLink = (link: string) => {
    // Parse Spotify track link to extract track ID and metadata
    const trackMatch = link.match(/track\/([a-zA-Z0-9]+)/);
    if (trackMatch) {
      return { trackId: trackMatch[1] };
    }
    return null;
  };

  const addTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedMood) {
      alert("Please select a mood");
      return;
    }

    setIsSubmitting(true);

    try {
      const spotifyData = spotifyLink ? parseSpotifyLink(spotifyLink) : null;
      const moodColor = Object.keys(MOOD_TYPES).find(
        (key) => key === selectedMood,
      ) as keyof typeof MOOD_TYPES;

      const moodEntry = {
        userId: "", // This will be set automatically by Amplify auth
        moodType: selectedMood,
        moodColor: moodColor,
        intensity,
        note: note.trim() || undefined,
        photoKey: uploadedPhoto || undefined,
        spotifyTrackId: spotifyData?.trackId || undefined,
        spotifyTrackName: "", // Would be populated from Spotify API
        spotifyArtist: "", // Would be populated from Spotify API
        tags: tags.length > 0 ? tags : undefined,
        isPrivate,
        date: new Date().toISOString().split("T")[0], // Today's date
      };

      const result = await client.models.Mood.create(moodEntry);

      if (result.data) {
        onMoodAdded?.(result.data.id);
        // Reset form
        setSelectedMood(undefined);
        setIntensity(5);
        setNote("");
        setTags([]);
        setSpotifyLink("");
        setIsPrivate(false);
        setUploadedPhoto(null);
      }
    } catch (error) {
      console.error("Error creating mood entry:", error);
      alert("Failed to save mood entry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="add-mood-entry">
      <div className="header">
        <h2>Add Mood Entry</h2>
        {onCancel && (
          <button type="button" onClick={onCancel} className="close-button">
            ×
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <MoodSelector
          selectedMood={selectedMood}
          selectedIntensity={intensity}
          onMoodChange={setSelectedMood}
          onIntensityChange={setIntensity}
          disabled={isSubmitting}
        />

        {/* Note Section */}
        <div className="form-group">
          <label htmlFor="mood-note">Add a note (optional)</label>
          <textarea
            id="mood-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's going on? How are you feeling?"
            maxLength={500}
            disabled={isSubmitting}
            rows={3}
          />
          <small>{note.length}/500 characters</small>
        </div>

        {/* Photo Upload */}
        <div className="form-group">
          <label>Add a mood selfie (optional)</label>
          <FileUploader
            acceptedFileTypes={["image/*"]}
            path="mood-selfies/"
            maxFileCount={1}
            maxSize={5000000} // 5MB
            onUploadSuccess={(event) => {
              setUploadedPhoto(event.path);
            }}
            onUploadError={(error) => {
              console.error("Upload error:", error);
            }}
            isResumable
          />
          {uploadedPhoto && (
            <div className="uploaded-photo">✓ Photo uploaded successfully</div>
          )}
        </div>

        {/* Spotify Link */}
        <div className="form-group">
          <label htmlFor="spotify-link">Spotify track (optional)</label>
          <input
            id="spotify-link"
            type="url"
            value={spotifyLink}
            onChange={(e) => setSpotifyLink(e.target.value)}
            placeholder="Paste Spotify track link here"
            disabled={isSubmitting}
          />
        </div>

        {/* Tags */}
        <div className="form-group">
          <label>Tags (optional)</label>
          <div className="tags-input">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              disabled={isSubmitting}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addTag();
                }
              }}
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isSubmitting || !tagInput.trim()}
            >
              Add
            </button>
          </div>
          {tags.length > 0 && (
            <div className="tags-list">
              {tags.map((tag) => (
                <span key={tag} className="tag">
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    disabled={isSubmitting}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Privacy Settings */}
        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              disabled={isSubmitting}
            />
            Keep this mood private
          </label>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button
            type="submit"
            disabled={!selectedMood || isSubmitting || isUploading}
            className="submit-button"
            style={{
              backgroundColor: selectedMood
                ? MOOD_TYPES[selectedMood].color
                : "#ccc",
            }}
          >
            {isSubmitting ? "Saving..." : "Save Mood"}
          </button>
        </div>
      </form>

      <style jsx>{`
        .add-mood-entry {
          max-width: 600px;
          margin: 0 auto;
          padding: 1rem;
        }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .header h2 {
          margin: 0;
          color: #333;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #666;
          padding: 0;
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .form-group {
          margin-bottom: 1.5rem;
        }

        .form-group label {
          display: block;
          margin-bottom: 0.5rem;
          font-weight: 500;
          color: #333;
        }

        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
          transition: border-color 0.2s;
        }

        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #4caf50;
        }

        .form-group small {
          color: #666;
          font-size: 0.875rem;
        }

        .tags-input {
          display: flex;
          gap: 0.5rem;
        }

        .tags-input input {
          flex: 1;
        }

        .tags-input button {
          padding: 0.75rem 1rem;
          background: #4caf50;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .tags-input button:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .tags-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .tag {
          display: inline-flex;
          align-items: center;
          gap: 0.25rem;
          background: #f0f0f0;
          padding: 0.25rem 0.5rem;
          border-radius: 20px;
          font-size: 0.875rem;
        }

        .tag button {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 1rem;
          color: #666;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          cursor: pointer;
        }

        .uploaded-photo {
          margin-top: 0.5rem;
          color: #4caf50;
          font-weight: 500;
        }

        .form-actions {
          text-align: center;
          margin-top: 2rem;
        }

        .submit-button {
          padding: 1rem 2rem;
          font-size: 1.1rem;
          font-weight: 600;
          color: #000;
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 150px;
        }

        .submit-button:disabled {
          background: #ccc !important;
          cursor: not-allowed;
          transform: none;
        }

        .submit-button:not(:disabled):hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      `}</style>
    </div>
  );
}
