'use client';

import { useState } from 'react';

/**
 * Mood types and their corresponding colors for MoodSync
 */
export const MOOD_TYPES = {
  HAPPY: { color: '#FFD700', label: 'Happy', emoji: '😊' },
  SAD: { color: '#4169E1', label: 'Sad', emoji: '😢' },
  ENERGETIC: { color: '#FF8C00', label: 'Energetic', emoji: '⚡' },
  CALM: { color: '#32CD32', label: 'Calm', emoji: '😌' },
  ANXIOUS: { color: '#9370DB', label: 'Anxious', emoji: '😰' },
} as const;

export type MoodType = keyof typeof MOOD_TYPES;

interface MoodSelectorProps {
  selectedMood?: MoodType;
  selectedIntensity?: number;
  onMoodChange: (mood: MoodType) => void;
  onIntensityChange: (intensity: number) => void;
  disabled?: boolean;
}

export default function MoodSelector({
  selectedMood,
  selectedIntensity = 5,
  onMoodChange,
  onIntensityChange,
  disabled = false
}: MoodSelectorProps) {
  return (
    <div className="mood-selector">
      <h3 className="mood-selector-title">How are you feeling?</h3>
      
      {/* Mood Type Selector */}
      <div className="mood-options">
        {Object.entries(MOOD_TYPES).map(([moodKey, moodData]) => {
          const isSelected = selectedMood === moodKey;
          return (
            <button
              key={moodKey}
              type="button"
              className={`mood-option ${isSelected ? 'selected' : ''}`}
              style={{
                backgroundColor: isSelected ? moodData.color : 'transparent',
                borderColor: moodData.color,
                color: isSelected ? '#000' : moodData.color
              }}
              onClick={() => onMoodChange(moodKey as MoodType)}
              disabled={disabled}
            >
              <span className="mood-emoji">{moodData.emoji}</span>
              <span className="mood-label">{moodData.label}</span>
            </button>
          );
        })}
      </div>

      {/* Intensity Slider */}
      {selectedMood && (
        <div className="mood-intensity">
          <label htmlFor="intensity-slider" className="intensity-label">
            Intensity: {selectedIntensity}/10
          </label>
          <div className="intensity-slider-container">
            <span className="intensity-min">1</span>
            <input
              id="intensity-slider"
              type="range"
              min="1"
              max="10"
              value={selectedIntensity}
              onChange={(e) => onIntensityChange(parseInt(e.target.value))}
              disabled={disabled}
              className="intensity-slider"
              style={{
                background: `linear-gradient(to right, ${MOOD_TYPES[selectedMood].color}30 0%, ${MOOD_TYPES[selectedMood].color} 100%)`
              }}
            />
            <span className="intensity-max">10</span>
          </div>
        </div>
      )}

      <style jsx>{`
        .mood-selector {
          padding: 1.5rem;
          border-radius: 12px;
          background: white;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 1rem;
        }

        .mood-selector-title {
          margin: 0 0 1rem 0;
          font-size: 1.2rem;
          font-weight: 600;
          color: #333;
          text-align: center;
        }

        .mood-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .mood-option {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1rem 0.75rem;
          border: 2px solid;
          border-radius: 12px;
          background: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 80px;
          font-weight: 500;
        }

        .mood-option:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .mood-option:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .mood-option.selected {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          font-weight: 600;
        }

        .mood-emoji {
          font-size: 1.5rem;
          margin-bottom: 0.25rem;
        }

        .mood-label {
          font-size: 0.875rem;
        }

        .mood-intensity {
          text-align: center;
        }

        .intensity-label {
          display: block;
          margin-bottom: 0.75rem;
          font-weight: 500;
          color: #333;
        }

        .intensity-slider-container {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          justify-content: center;
        }

        .intensity-slider {
          flex: 1;
          max-width: 200px;
          height: 6px;
          border-radius: 3px;
          outline: none;
          -webkit-appearance: none;
        }

        .intensity-slider::-webkit-slider-thumb {
          appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #333;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .intensity-slider::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #333;
          cursor: pointer;
          border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
        }

        .intensity-min,
        .intensity-max {
          font-size: 0.875rem;
          color: #666;
          font-weight: 500;
        }
      `}</style>
    </div>
  );
}