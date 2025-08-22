"use client";

import { useState, useEffect } from "react";
import { Calendar, momentLocalizer, View } from "react-big-calendar";
import moment from "moment";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "../../../amplify/data/resource";
import { MOOD_TYPES } from "./MoodSelector";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);
const client = generateClient<Schema>();

type MoodData = Schema["Mood"]["type"];

interface MoodEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: MoodData;
  color: string;
}

interface MoodCalendarProps {
  userId?: string;
  onDateSelect?: (date: Date, moods: MoodData[]) => void;
  onMoodSelect?: (mood: MoodData) => void;
}

export default function MoodCalendar({
  userId,
  onDateSelect,
  onMoodSelect,
}: MoodCalendarProps) {
  const [moods, setMoods] = useState<MoodData[]>([]);
  const [events, setEvents] = useState<MoodEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewType, setViewType] = useState<View>("month");

  // Fetch moods for the current user
  useEffect(() => {
    fetchMoods();
  }, [userId]);

  // Convert moods to calendar events when moods change
  useEffect(() => {
    const calendarEvents = moods.map((mood) => {
      const moodDate = new Date(mood.date);
      const moodData = mood.moodType ? MOOD_TYPES[mood.moodType] : null;

      return {
        id: mood.id,
        title: moodData
          ? `${moodData.emoji} ${moodData.label} (${mood.intensity}/10)`
          : `Mood (${mood.intensity}/10)`,
        start: moodDate,
        end: moodDate,
        resource: mood,
        color: moodData?.color || "#808080",
      };
    });

    setEvents(calendarEvents);
  }, [moods]);

  const fetchMoods = async () => {
    try {
      setIsLoading(true);

      let query = client.models.Mood.list();

      // If userId is provided, filter by userId
      if (userId) {
        query = client.models.Mood.list({
          filter: {
            userId: { eq: userId },
          },
        });
      }

      const result = await query;

      if (result.data) {
        // Sort moods by date (newest first)
        const sortedMoods = result.data.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        );
        setMoods(sortedMoods);
      }
    } catch (error) {
      console.error("Error fetching moods:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectEvent = (event: MoodEvent) => {
    onMoodSelect?.(event.resource);
  };

  const handleSelectSlot = (slotInfo: { start: Date; end: Date }) => {
    const selectedDateMoods = moods.filter((mood) => {
      const moodDate = new Date(mood.date);
      const slotDate = new Date(slotInfo.start);
      return (
        moodDate.getFullYear() === slotDate.getFullYear() &&
        moodDate.getMonth() === slotDate.getMonth() &&
        moodDate.getDate() === slotDate.getDate()
      );
    });

    setSelectedDate(slotInfo.start);
    onDateSelect?.(slotInfo.start, selectedDateMoods);
  };

  const eventStyleGetter = (event: MoodEvent) => {
    return {
      style: {
        backgroundColor: event.color,
        color: "#000",
        border: "none",
        borderRadius: "4px",
        fontSize: "0.75rem",
        padding: "2px 4px",
      },
    };
  };

  const getMoodStats = () => {
    const stats = {
      total: moods.length,
      thisMonth: 0,
      averageIntensity: 0,
      moodBreakdown: {} as Record<string, number>,
    };

    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    let totalIntensity = 0;

    moods.forEach((mood) => {
      const moodDate = new Date(mood.date);

      // Count this month's moods
      if (
        moodDate.getMonth() === currentMonth &&
        moodDate.getFullYear() === currentYear
      ) {
        stats.thisMonth++;
      }

      // Calculate average intensity
      totalIntensity += mood.intensity;

      // Count mood types
      if (mood.moodType) {
        stats.moodBreakdown[mood.moodType] =
          (stats.moodBreakdown[mood.moodType] || 0) + 1;
      }
    });

    stats.averageIntensity =
      moods.length > 0
        ? Math.round((totalIntensity / moods.length) * 10) / 10
        : 0;

    return stats;
  };

  const stats = getMoodStats();

  if (isLoading) {
    return (
      <div className="mood-calendar-loading">
        <div className="loading-spinner"></div>
        <p>Loading your mood history...</p>
      </div>
    );
  }

  return (
    <div className="mood-calendar-container">
      {/* Header with Stats */}
      <div className="calendar-header">
        <h2>Mood Calendar</h2>
        <div className="mood-stats">
          <div className="stat-item">
            <span className="stat-number">{stats.total}</span>
            <span className="stat-label">Total Moods</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.thisMonth}</span>
            <span className="stat-label">This Month</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{stats.averageIntensity}/10</span>
            <span className="stat-label">Avg Intensity</span>
          </div>
        </div>
      </div>

      {/* View Type Selector */}
      <div className="view-selector">
        {(["month", "week", "day"] as View[]).map((view) => (
          <button
            key={view}
            className={`view-button ${viewType === view ? "active" : ""}`}
            onClick={() => setViewType(view)}
          >
            {view.charAt(0).toUpperCase() + view.slice(1)}
          </button>
        ))}
      </div>

      {/* Mood Legend */}
      <div className="mood-legend">
        <h4>Mood Colors:</h4>
        <div className="legend-items">
          {Object.entries(MOOD_TYPES).map(([moodKey, moodData]) => (
            <div key={moodKey} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: moodData.color }}
              ></div>
              <span>
                {moodData.emoji} {moodData.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar */}
      <div className="calendar-wrapper">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          style={{ height: 600 }}
          view={viewType}
          onView={setViewType}
          date={selectedDate}
          onNavigate={setSelectedDate}
          onSelectEvent={handleSelectEvent}
          onSelectSlot={handleSelectSlot}
          selectable
          eventPropGetter={eventStyleGetter}
          dayPropGetter={(date) => {
            const dayMoods = moods.filter((mood) => {
              const moodDate = new Date(mood.date);
              return (
                moodDate.getFullYear() === date.getFullYear() &&
                moodDate.getMonth() === date.getMonth() &&
                moodDate.getDate() === date.getDate()
              );
            });

            if (dayMoods.length === 0) return {};

            // Get dominant mood for the day
            const moodCounts = dayMoods.reduce(
              (acc, mood) => {
                if (mood.moodType) {
                  acc[mood.moodType] = (acc[mood.moodType] || 0) + 1;
                }
                return acc;
              },
              {} as Record<string, number>,
            );

            const dominantMoodType = Object.entries(moodCounts).sort(
              ([, a], [, b]) => b - a,
            )[0][0] as keyof typeof MOOD_TYPES;

            return {
              style: {
                backgroundColor:
                  dominantMoodType && MOOD_TYPES[dominantMoodType]
                    ? `${MOOD_TYPES[dominantMoodType].color}20`
                    : "#f0f0f020",
                border:
                  dominantMoodType && MOOD_TYPES[dominantMoodType]
                    ? `2px solid ${MOOD_TYPES[dominantMoodType].color}40`
                    : "2px solid #e0e0e040",
              },
            };
          }}
        />
      </div>

      {/* Selected Date Info */}
      {selectedDate && (
        <div className="selected-date-info">
          <h4>
            {selectedDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h4>
          {moods.filter((mood) => {
            const moodDate = new Date(mood.date);
            return (
              moodDate.getFullYear() === selectedDate.getFullYear() &&
              moodDate.getMonth() === selectedDate.getMonth() &&
              moodDate.getDate() === selectedDate.getDate()
            );
          }).length === 0 ? (
            <p>No moods recorded for this date.</p>
          ) : null}
        </div>
      )}

      <style jsx>{`
        .mood-calendar-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 1rem;
        }

        .mood-calendar-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
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

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 2rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .calendar-header h2 {
          margin: 0;
          color: #333;
        }

        .mood-stats {
          display: flex;
          gap: 2rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .stat-number {
          font-size: 1.5rem;
          font-weight: 600;
          color: #4caf50;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .view-selector {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .view-button {
          padding: 0.5rem 1rem;
          border: 2px solid #e0e0e0;
          background: white;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }

        .view-button:hover {
          border-color: #4caf50;
          color: #4caf50;
        }

        .view-button.active {
          background: #4caf50;
          border-color: #4caf50;
          color: white;
        }

        .mood-legend {
          margin-bottom: 2rem;
          padding: 1rem;
          background: #f8f8f8;
          border-radius: 12px;
        }

        .mood-legend h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          color: #333;
        }

        .legend-items {
          display: flex;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.875rem;
        }

        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 50%;
        }

        .calendar-wrapper {
          background: white;
          border-radius: 12px;
          padding: 1rem;
          box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .selected-date-info {
          padding: 1rem;
          background: #f8f8f8;
          border-radius: 12px;
        }

        .selected-date-info h4 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .selected-date-info p {
          margin: 0;
          color: #666;
        }

        @media (max-width: 768px) {
          .calendar-header {
            flex-direction: column;
            text-align: center;
          }

          .mood-stats {
            justify-content: center;
          }

          .calendar-wrapper {
            padding: 0.5rem;
          }

          .legend-items {
            justify-content: center;
          }
        }

        /* Override some react-big-calendar styles */
        :global(.rbc-calendar) {
          font-family: inherit;
        }

        :global(.rbc-event) {
          border: none !important;
          font-size: 0.75rem !important;
          padding: 2px 4px !important;
        }

        :global(.rbc-today) {
          background-color: rgba(76, 175, 80, 0.1) !important;
        }

        :global(.rbc-selected) {
          background-color: rgba(76, 175, 80, 0.2) !important;
        }

        :global(.rbc-header) {
          font-weight: 600 !important;
          color: #333 !important;
        }
      `}</style>
    </div>
  );
}
