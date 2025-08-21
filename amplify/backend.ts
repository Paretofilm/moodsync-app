import { defineBackend } from "@aws-amplify/backend";
import { auth } from "./auth/resource.js";
import { data } from "./data/resource.js";
import { storage } from "./storage/resource.js";

/**
 * MoodSync Backend Definition
 *
 * Defines the complete backend infrastructure including:
 * - Authentication with social login
 * - Data models for mood tracking and social features
 * - Storage for mood selfies and profile pictures
 */
defineBackend({
  auth,
  data,
  storage,
});
