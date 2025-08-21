import { defineAuth, secret } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource for MoodSync
 * Supports email login and social providers (Google/Facebook)
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret("GOOGLE_CLIENT_ID"),
        clientSecret: secret("GOOGLE_CLIENT_SECRET"),
        scopes: ["email", "profile"],
      },
      facebook: {
        clientId: secret("FACEBOOK_CLIENT_ID"),
        clientSecret: secret("FACEBOOK_CLIENT_SECRET"),
        scopes: ["email", "public_profile"],
      },
      callbackUrls: [
        "http://localhost:3000/",
        "https://localhost:3000/",
        // Add your production domain when deployed
        // 'https://yourdomain.com/'
      ],
      logoutUrls: [
        "http://localhost:3000/",
        "https://localhost:3000/",
        // Add your production domain when deployed
        // 'https://yourdomain.com/'
      ],
    },
  },
  userAttributes: {
    email: {
      required: true,
      mutable: true,
    },
    givenName: {
      required: false,
      mutable: true,
    },
    familyName: {
      required: false,
      mutable: true,
    },
    nickname: {
      required: false,
      mutable: true,
    },
    picture: {
      required: false,
      mutable: true,
    },
  },
});
