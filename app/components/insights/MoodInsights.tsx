'use client';

import { useState, useEffect } from 'react';
import { generateClient } from 'aws-amplify/data';
import { getCurrentUser } from 'aws-amplify/auth';
import type { Schema } from '../../../amplify/data/resource';
import { MOOD_TYPES } from '../mood/MoodSelector';

const client = generateClient<Schema>();

type MoodInsightData = Schema['MoodInsight']['type'];
type MoodData = Schema['Mood']['type'];

interface MoodInsightsProps {
  userId?: string;
}

export default function MoodInsights({ userId }: MoodInsightsProps) {
  const [insights, setInsights] = useState<MoodInsightData[]>([]);
  const [currentWeekInsight, setCurrentWeekInsight] = useState<MoodInsightData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [weeklyStats, setWeeklyStats] = useState<{
    totalMoods: number;
    averageIntensity: number;
    moodDistribution: Record<string, number>;
    moodStreak: number;
  } | null>(null);

  useEffect(() => {
    initialize();
  }, []);

  const initialize = async () => {
    try {
      const user = await getCurrentUser();
      const targetUserId = userId || user.userId;
      setCurrentUserId(targetUserId);
      
      await Promise.all([
        loadInsights(targetUserId),
        generateWeeklyStats(targetUserId)
      ]);
    } catch (error) {
      console.error('Error initializing insights:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadInsights = async (targetUserId: string) => {
    try {
      const result = await client.models.MoodInsight.list({
        filter: { userId: { eq: targetUserId } }
      });

      if (result.data) {
        const sortedInsights = result.data.sort((a, b) => 
          new Date(b.weekStartDate).getTime() - new Date(a.weekStartDate).getTime()
        );
        
        setInsights(sortedInsights);
        
        // Check if we have insight for current week
        const currentWeek = getCurrentWeekStart();
        const currentInsight = sortedInsights.find(insight => 
          insight.weekStartDate === currentWeek.toISOString().split('T')[0]
        );
        
        setCurrentWeekInsight(currentInsight || null);
      }
    } catch (error) {
      console.error('Error loading insights:', error);
    }
  };

  const generateWeeklyStats = async (targetUserId: string) => {
    try {
      const currentWeek = getCurrentWeekStart();
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Get moods for current week
      const result = await client.models.Mood.list({
        filter: {
          and: [
            { userId: { eq: targetUserId } },
            { date: { ge: currentWeek.toISOString().split('T')[0] } },
            { date: { le: weekEnd.toISOString().split('T')[0] } }
          ]
        }
      });

      if (result.data) {
        const moods = result.data;
        const totalMoods = moods.length;
        const averageIntensity = totalMoods > 0 
          ? moods.reduce((sum, mood) => sum + mood.intensity, 0) / totalMoods 
          : 0;

        // Calculate mood distribution
        const moodDistribution = moods.reduce((acc, mood) => {
          acc[mood.moodType] = (acc[mood.moodType] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);

        // Calculate mood streak (consecutive days with moods)
        const moodStreak = calculateMoodStreak(moods);

        setWeeklyStats({
          totalMoods,
          averageIntensity: Math.round(averageIntensity * 10) / 10,
          moodDistribution,
          moodStreak
        });
      }
    } catch (error) {
      console.error('Error generating weekly stats:', error);
    }
  };

  const getCurrentWeekStart = () => {
    const now = new Date();
    const monday = new Date(now);
    monday.setDate(now.getDate() - now.getDay() + 1); // Start from Monday
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const calculateMoodStreak = (moods: MoodData[]) => {
    // Simple implementation - count unique days with moods in the week
    const uniqueDays = new Set(moods.map(mood => mood.date));
    return uniqueDays.size;
  };

  const generateAIInsight = async () => {
    if (!weeklyStats || weeklyStats.totalMoods === 0) {
      alert('Not enough mood data this week to generate insights.');
      return;
    }

    setIsGenerating(true);

    try {
      const currentWeek = getCurrentWeekStart();
      const weekEnd = new Date(currentWeek);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Get dominant mood
      const dominantMoodEntry = Object.entries(weeklyStats.moodDistribution)
        .reduce((a, b) => a[1] > b[1] ? a : b);
      const dominantMood = dominantMoodEntry[0] as keyof typeof MOOD_TYPES;

      // Calculate mood variability
      const moodTypes = Object.keys(weeklyStats.moodDistribution).length;
      const moodVariability = moodTypes / 5; // 5 total mood types

      // Generate AI insights (in a real app, this would call an AI service)
      const insights = generateMockAIInsights(weeklyStats, dominantMood);
      const recommendations = generateMockRecommendations(weeklyStats, dominantMood);

      // Calculate weekly score
      const weeklyScore = calculateWeeklyScore(weeklyStats);

      const newInsight = await client.models.MoodInsight.create({
        userId: currentUserId,
        weekStartDate: currentWeek.toISOString().split('T')[0],
        weekEndDate: weekEnd.toISOString().split('T')[0],
        overallMoodTrend: getOverallTrend(weeklyStats),
        dominantMood,
        moodVariability,
        insights,
        recommendations,
        moodFrequency: JSON.stringify(weeklyStats.moodDistribution),
        weeklyScore
      });

      if (newInsight.data) {
        setCurrentWeekInsight(newInsight.data);
        setInsights(prev => [newInsight.data!, ...prev]);
      }
    } catch (error) {
      console.error('Error generating AI insight:', error);
      alert('Failed to generate insights. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const generateMockAIInsights = (stats: typeof weeklyStats, dominantMood: keyof typeof MOOD_TYPES) => {
    if (!stats) return '';

    const moodLabel = MOOD_TYPES[dominantMood].label.toLowerCase();
    const insights = [
      `This week, you've been predominantly ${moodLabel}, which appeared in ${Math.round((stats.moodDistribution[dominantMood] / stats.totalMoods) * 100)}% of your mood entries.`,
      `Your average mood intensity was ${stats.averageIntensity}/10, indicating ${stats.averageIntensity >= 7 ? 'strong' : stats.averageIntensity >= 5 ? 'moderate' : 'mild'} emotional experiences.`,
      `You maintained a ${stats.moodStreak}-day mood tracking streak this week, showing good consistency in self-awareness.`
    ];

    if (Object.keys(stats.moodDistribution).length > 3) {
      insights.push('Your mood variety suggests you experienced a full range of emotions, which is healthy and normal.');
    } else {
      insights.push('Your moods were relatively stable this week, with fewer emotional fluctuations.');
    }

    return insights.join(' ');
  };

  const generateMockRecommendations = (stats: typeof weeklyStats, dominantMood: keyof typeof MOOD_TYPES) => {
    if (!stats) return '';

    const recommendations = [];

    if (dominantMood === 'ANXIOUS' && stats.averageIntensity > 6) {
      recommendations.push('Consider practicing deep breathing exercises or meditation to help manage anxiety levels.');
    } else if (dominantMood === 'SAD' && stats.averageIntensity > 5) {
      recommendations.push('Try engaging in activities that bring you joy, or reach out to friends and family for support.');
    } else if (dominantMood === 'HAPPY' && stats.averageIntensity > 7) {
      recommendations.push('Great job maintaining positive energy! Consider sharing your happiness with others.');
    } else if (dominantMood === 'ENERGETIC') {
      recommendations.push('Channel your energy into productive activities or creative pursuits.');
    } else if (dominantMood === 'CALM') {
      recommendations.push('Your calm state is wonderful for reflection and planning. Use this time for goal setting.');
    }

    if (stats.moodStreak < 3) {
      recommendations.push('Try to track your mood daily for better insights into your emotional patterns.');
    }

    return recommendations.join(' ') || 'Keep up the great work with mood tracking! Consistency helps build emotional awareness.';
  };

  const getOverallTrend = (stats: typeof weeklyStats) => {
    if (!stats) return 'neutral';
    
    if (stats.averageIntensity >= 7) return 'positive';
    if (stats.averageIntensity <= 4) return 'challenging';
    return 'stable';
  };

  const calculateWeeklyScore = (stats: typeof weeklyStats) => {
    if (!stats) return 5;

    let score = 5; // Base score
    
    // Adjust based on average intensity
    if (stats.averageIntensity >= 7) score += 2;
    else if (stats.averageIntensity >= 5) score += 1;
    else if (stats.averageIntensity <= 3) score -= 2;

    // Adjust based on mood diversity
    const moodDiversity = Object.keys(stats.moodDistribution).length;
    if (moodDiversity >= 4) score += 1;
    if (moodDiversity <= 2) score -= 1;

    // Adjust based on consistency
    if (stats.moodStreak >= 6) score += 1;
    else if (stats.moodStreak <= 2) score -= 1;

    return Math.max(1, Math.min(10, score));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (isLoading) {
    return (
      <div className="insights-loading">
        <div className="loading-spinner"></div>
        <p>Loading insights...</p>
      </div>
    );
  }

  return (
    <div className="mood-insights-container">
      <div className="insights-header">
        <h2>Mood Insights</h2>
        <p>AI-powered analysis of your mood patterns</p>
      </div>

      {/* Current Week Stats */}
      {weeklyStats && (
        <div className="weekly-stats-card">
          <h3>This Week</h3>
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number">{weeklyStats.totalMoods}</span>
              <span className="stat-label">Mood Entries</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{weeklyStats.averageIntensity}/10</span>
              <span className="stat-label">Avg Intensity</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{weeklyStats.moodStreak}</span>
              <span className="stat-label">Day Streak</span>
            </div>
          </div>

          {/* Mood Distribution */}
          <div className="mood-distribution">
            <h4>Mood Distribution</h4>
            <div className="mood-bars">
              {Object.entries(weeklyStats.moodDistribution).map(([moodType, count]) => {
                const moodData = MOOD_TYPES[moodType as keyof typeof MOOD_TYPES];
                const percentage = (count / weeklyStats.totalMoods) * 100;
                
                return (
                  <div key={moodType} className="mood-bar-item">
                    <div className="mood-bar-label">
                      <span>{moodData.emoji} {moodData.label}</span>
                      <span>{count}</span>
                    </div>
                    <div className="mood-bar">
                      <div 
                        className="mood-bar-fill"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: moodData.color 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generate Insight Button */}
          {!currentWeekInsight && (
            <div className="generate-insight">
              <button
                className="generate-button"
                onClick={generateAIInsight}
                disabled={isGenerating || weeklyStats.totalMoods === 0}
              >
                {isGenerating ? 'Generating...' : '🤖 Generate AI Insights'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Current Week Insight */}
      {currentWeekInsight && (
        <div className="insight-card current-week">
          <div className="insight-header">
            <h3>This Week's Insight</h3>
            <div className="insight-score">
              <span className="score">{currentWeekInsight.weeklyScore}/10</span>
              <span className="score-label">Wellness Score</span>
            </div>
          </div>

          <div className="insight-content">
            <div className="insight-section">
              <h4>📊 Analysis</h4>
              <p>{currentWeekInsight.insights}</p>
            </div>

            <div className="insight-section">
              <h4>💡 Recommendations</h4>
              <p>{currentWeekInsight.recommendations}</p>
            </div>

            <div className="insight-meta">
              <span>Dominant mood: {MOOD_TYPES[currentWeekInsight.dominantMood].emoji} {MOOD_TYPES[currentWeekInsight.dominantMood].label}</span>
              <span>Week of {formatDate(currentWeekInsight.weekStartDate)}</span>
            </div>
          </div>
        </div>
      )}

      {/* Historical Insights */}
      {insights.length > (currentWeekInsight ? 1 : 0) && (
        <div className="historical-insights">
          <h3>Previous Insights</h3>
          <div className="insights-list">
            {insights.slice(currentWeekInsight ? 1 : 0).map((insight) => (
              <div key={insight.id} className="insight-card historical">
                <div className="insight-header">
                  <h4>Week of {formatDate(insight.weekStartDate)}</h4>
                  <div className="insight-score small">
                    <span className="score">{insight.weeklyScore}/10</span>
                  </div>
                </div>

                <div className="insight-summary">
                  <p className="trend">
                    Overall trend: <strong>{insight.overallMoodTrend}</strong>
                  </p>
                  <p className="dominant-mood">
                    {MOOD_TYPES[insight.dominantMood].emoji} Mostly {MOOD_TYPES[insight.dominantMood].label.toLowerCase()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style jsx>{`
        .mood-insights-container {
          max-width: 800px;
          margin: 0 auto;
          padding: 1rem;
        }

        .insights-loading {
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
          border-top: 3px solid #4CAF50;
          border-radius: 50%;
          animation: spin 1s linear infinite;
          margin-bottom: 1rem;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .insights-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .insights-header h2 {
          margin: 0 0 0.5rem 0;
          color: #333;
        }

        .insights-header p {
          margin: 0;
          color: #666;
        }

        .weekly-stats-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .weekly-stats-card h3 {
          margin: 0 0 1.5rem 0;
          color: #333;
          text-align: center;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .stat-number {
          font-size: 2rem;
          font-weight: 600;
          color: #4CAF50;
        }

        .stat-label {
          font-size: 0.875rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .mood-distribution h4 {
          margin: 0 0 1rem 0;
          color: #333;
        }

        .mood-bars {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .mood-bar-item {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .mood-bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 0.875rem;
          font-weight: 500;
        }

        .mood-bar {
          height: 8px;
          background: #f0f0f0;
          border-radius: 4px;
          overflow: hidden;
        }

        .mood-bar-fill {
          height: 100%;
          transition: width 0.3s ease;
        }

        .generate-insight {
          text-align: center;
          margin-top: 2rem;
        }

        .generate-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 1rem 2rem;
          border-radius: 12px;
          cursor: pointer;
          font-weight: 600;
          font-size: 1rem;
          transition: all 0.2s;
        }

        .generate-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
        }

        .generate-button:disabled {
          background: #ccc;
          cursor: not-allowed;
          transform: none;
        }

        .insight-card {
          background: white;
          border-radius: 16px;
          padding: 2rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
          margin-bottom: 2rem;
        }

        .insight-card.current-week {
          border: 2px solid #4CAF50;
        }

        .insight-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
        }

        .insight-header h3,
        .insight-header h4 {
          margin: 0;
          color: #333;
        }

        .insight-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .insight-score.small {
          flex-direction: row;
          gap: 0.5rem;
        }

        .score {
          font-size: 1.5rem;
          font-weight: 600;
          color: #4CAF50;
        }

        .insight-score.small .score {
          font-size: 1.2rem;
        }

        .score-label {
          font-size: 0.75rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .insight-section {
          margin-bottom: 1.5rem;
        }

        .insight-section h4 {
          margin: 0 0 0.75rem 0;
          color: #333;
          font-size: 1rem;
        }

        .insight-section p {
          margin: 0;
          color: #666;
          line-height: 1.6;
        }

        .insight-meta {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
          color: #999;
          border-top: 1px solid #f0f0f0;
          padding-top: 1rem;
        }

        .historical-insights h3 {
          margin: 0 0 1.5rem 0;
          color: #333;
        }

        .insights-list {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }

        .insight-card.historical {
          padding: 1.5rem;
        }

        .insight-summary {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .insight-summary p {
          margin: 0;
          font-size: 0.875rem;
          color: #666;
        }

        @media (max-width: 768px) {
          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .insight-header,
          .insight-meta,
          .insight-summary {
            flex-direction: column;
            gap: 1rem;
            text-align: center;
          }

          .mood-insights-container {
            padding: 0.5rem;
          }

          .weekly-stats-card,
          .insight-card {
            padding: 1.5rem;
          }
        }
      `}</style>
    </div>
  );
}