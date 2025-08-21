import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * MoodSync Data Schema
 *
 * This schema defines the data models for a social mood tracking application:
 * - Mood: Individual mood entries with photos, notes, and Spotify links
 * - UserProfile: Extended user information and settings
 * - Friendship: Relationships between users
 * - MoodInsight: AI-generated weekly insights about mood patterns
 * - MoodComment: Comments on mood entries from friends
 */
const schema = a.schema({
  // User Profile - extends Cognito user with app-specific data
  UserProfile: a
    .model({
      userId: a.string().required(),
      username: a.string().required(),
      displayName: a.string(),
      bio: a.string(),
      profilePicture: a.string(), // S3 key for profile image
      isPrivate: a.boolean().default(false),
      moodVisibility: a
        .enum(["PUBLIC", "FRIENDS_ONLY", "PRIVATE"])
        .default("FRIENDS_ONLY"),
      notificationsEnabled: a.boolean().default(true),
      weeklyInsightsEnabled: a.boolean().default(true),
    })
    .authorization((allow) => [
      allow.owner(), // Users can manage their own profile
      allow.authenticated().to(["read"]), // Other users can view profiles
    ])
    .identifier(["userId"]),

  // Mood Entry - core mood tracking model
  Mood: a
    .model({
      userId: a.string().required(),
      moodType: a
        .enum(["HAPPY", "SAD", "ENERGETIC", "CALM", "ANXIOUS"])
        .required(),
      moodColor: a
        .enum(["YELLOW", "BLUE", "ORANGE", "GREEN", "PURPLE"])
        .required(),
      intensity: a.integer().required(), // 1-10 scale
      note: a.string(),
      photoKey: a.string(), // S3 key for mood selfie
      spotifyTrackId: a.string(), // Spotify song link
      spotifyTrackName: a.string(),
      spotifyArtist: a.string(),
      tags: a.string().array(), // Custom tags for mood
      isPrivate: a.boolean().default(false),
      date: a.date().required(), // Date of the mood entry
      createdAt: a.datetime(),
      updatedAt: a.datetime(),

      // Relations
      userProfile: a.belongsTo("UserProfile", "userId"),
      comments: a.hasMany("MoodComment", "moodId"),
    })
    .authorization((allow) => [
      allow.owner(), // Mood owners can manage their moods
      allow
        .authenticated()
        .to(["read"])
        .where((mood) => mood.isPrivate.eq(false)), // Public moods
    ]),

  // Friendship model for social connections
  Friendship: a
    .model({
      requesterId: a.string().required(), // User who sent friend request
      addresseeId: a.string().required(), // User who received friend request
      status: a.enum(["PENDING", "ACCEPTED", "DECLINED", "BLOCKED"]).required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),

      // Relations
      requester: a.belongsTo("UserProfile", "requesterId"),
      addressee: a.belongsTo("UserProfile", "addresseeId"),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "update"]), // Users can manage their friendships
      allow.authenticated().to(["create"]), // Anyone can send friend requests
    ])
    .identifier(["requesterId", "addresseeId"]),

  // Comments on mood entries
  MoodComment: a
    .model({
      moodId: a.id().required(),
      commenterId: a.string().required(),
      content: a.string().required(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),

      // Relations
      mood: a.belongsTo("Mood", "moodId"),
      commenter: a.belongsTo("UserProfile", "commenterId"),
    })
    .authorization((allow) => [
      allow.owner(), // Comment owners can manage their comments
      allow.authenticated().to(["read"]), // Friends can view comments
    ]),

  // AI-generated mood insights
  MoodInsight: a
    .model({
      userId: a.string().required(),
      weekStartDate: a.date().required(), // Week this insight covers
      weekEndDate: a.date().required(),
      overallMoodTrend: a.string(),
      dominantMood: a.enum(["HAPPY", "SAD", "ENERGETIC", "CALM", "ANXIOUS"]),
      moodVariability: a.float(), // Statistical measure of mood changes
      insights: a.string().required(), // AI-generated text insights
      recommendations: a.string(), // AI suggestions
      moodFrequency: a.json(), // JSON object with mood type frequencies
      weeklyScore: a.float(), // Overall wellness score 1-10
      createdAt: a.datetime(),

      // Relations
      userProfile: a.belongsTo("UserProfile", "userId"),
    })
    .authorization((allow) => [
      allow.owner(), // Users can only see their own insights
    ])
    .identifier(["userId", "weekStartDate"]),

  // Activity log for social features
  MoodActivity: a
    .model({
      userId: a.string().required(),
      activityType: a
        .enum([
          "MOOD_POSTED",
          "COMMENT_ADDED",
          "FRIEND_REQUEST_SENT",
          "FRIEND_REQUEST_ACCEPTED",
        ])
        .required(),
      targetUserId: a.string(), // User affected by the activity
      moodId: a.id(), // Related mood if applicable
      message: a.string(),
      isRead: a.boolean().default(false),
      createdAt: a.datetime(),

      // Relations
      user: a.belongsTo("UserProfile", "userId"),
      targetUser: a.belongsTo("UserProfile", "targetUserId"),
      mood: a.belongsTo("Mood", "moodId"),
    })
    .authorization((allow) => [
      allow.owner().to(["read", "update"]), // Users can read and mark activities as read
      allow.authenticated().to(["create"]), // System can create activities
    ]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", // Use Cognito user authentication by default
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});

/**
 * Mood Color Mapping for Frontend:
 * - HAPPY = YELLOW (#FFD700)
 * - SAD = BLUE (#4169E1)
 * - ENERGETIC = ORANGE (#FF8C00)
 * - CALM = GREEN (#32CD32)
 * - ANXIOUS = PURPLE (#9370DB)
 */
