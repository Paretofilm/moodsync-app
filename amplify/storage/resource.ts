import { defineStorage } from "@aws-amplify/backend";

/**
 * MoodSync Storage Configuration
 *
 * This storage setup handles:
 * - Profile pictures (public read, owner write/delete)
 * - Mood selfies (private to user and friends based on mood privacy settings)
 * - Temporary uploads (for processing before final storage)
 */
export const storage = defineStorage({
  name: "moodsyncStorage",
  access: (allow) => ({
    // Profile pictures - publicly viewable but only owner can modify
    "profile-pictures/{entity_id}/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Mood selfies - private to the user, visibility controlled by app logic
    "mood-selfies/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Temporary uploads - for image processing or preview before final storage
    "temp-uploads/{entity_id}/*": [
      allow.entity("identity").to(["read", "write", "delete"]),
    ],

    // Public shared content - mood images that users explicitly make public
    "public-moods/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read"]),
      allow.authenticated.to(["write"]), // Authenticated users can contribute
    ],
  }),
});
