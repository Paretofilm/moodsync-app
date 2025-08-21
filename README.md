# MoodSync - Social Mood Tracking App

[![Amplify Backend Pipeline](https://github.com/Paretofilm/moodsync-app/actions/workflows/amplify-pipeline-main.yml/badge.svg)](https://github.com/Paretofilm/moodsync-app/actions/workflows/amplify-pipeline-main.yml)

A beautiful, social mood tracking application built with AWS Amplify Gen 2, Next.js, and React. Track your daily moods, share with friends, and get AI-powered insights about your emotional wellbeing.

## ✨ Features

### 🎯 Core Mood Tracking

- **Color-coded mood system**: Happy (Yellow), Sad (Blue), Energetic (Orange), Calm (Green), Anxious (Purple)
- **Intensity scale**: 1-10 rating for each mood entry
- **Rich entries**: Add notes, photos, Spotify tracks, and custom tags
- **Privacy controls**: Keep moods private or share with friends

### 👥 Social Features

- **Friend connections**: Send/accept friend requests
- **Real-time feed**: See friends' mood updates live
- **Comments & interactions**: Engage with friends' mood posts
- **Privacy settings**: Control who can see your moods

### 📅 Mood History & Analytics

- **Calendar view**: Visual history with color-coded days
- **Mood patterns**: Track trends and identify patterns
- **Weekly statistics**: Mood distribution and consistency metrics

### 🤖 AI-Powered Insights

- **Weekly analysis**: AI-generated insights about mood patterns
- **Personalized recommendations**: Suggestions based on your data
- **Wellness scoring**: Track your emotional wellbeing over time

### 📱 Modern Experience

- **Responsive design**: Works perfectly on desktop and mobile
- **Real-time updates**: Live mood feed with instant notifications
- **File uploads**: Secure photo storage with AWS S3
- **Social authentication**: Login with Google/Facebook

## 🏗️ Tech Stack

- **Frontend**: Next.js 14 with App Router, React, TypeScript
- **Backend**: AWS Amplify Gen 2
- **Database**: Amazon DynamoDB (via Amplify Data)
- **Authentication**: Amazon Cognito with social providers
- **Storage**: Amazon S3 (via Amplify Storage)
- **Real-time**: AWS AppSync GraphQL subscriptions
- **UI Components**: Amplify UI React components

## 🚀 Quick Start

### Prerequisites

- Node.js v18.16.0 or later
- npm v6.14.4 or later
- AWS account (for deployment)

### Local Development

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Configure Amplify**:

   ```bash
   npx ampx sandbox
   ```

   This will:
   - Deploy your backend to AWS
   - Create `amplify_outputs.json` with your configuration

3. **Start the development server**:

   ```bash
   npm run dev
   ```

4. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Social Login Setup (Optional)

To enable Google and Facebook login, configure external providers:

1. **Google OAuth**:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create OAuth 2.0 credentials
   - Add secrets to Amplify:
     ```bash
     npx ampx sandbox secret set GOOGLE_CLIENT_ID
     npx ampx sandbox secret set GOOGLE_CLIENT_SECRET
     ```

2. **Facebook Login**:
   - Go to [Facebook Developers](https://developers.facebook.com/)
   - Create a Facebook app and get App ID/Secret
   - Add secrets to Amplify:
     ```bash
     npx ampx sandbox secret set FACEBOOK_CLIENT_ID
     npx ampx sandbox secret set FACEBOOK_CLIENT_SECRET
     ```

## 📊 Data Models

- **Mood Entry**: User moods with colors, intensity, notes, photos, and Spotify tracks
- **User Profile**: Extended user information and privacy settings
- **Friendship System**: Friend requests and connections with status tracking
- **AI Insights**: Weekly mood analysis with personalized recommendations

## 🎨 Mood Color System

- 😊 **Happy**: Yellow (`#FFD700`)
- 😢 **Sad**: Blue (`#4169E1`)
- ⚡ **Energetic**: Orange (`#FF8C00`)
- 😌 **Calm**: Green (`#32CD32`)
- 😰 **Anxious**: Purple (`#9370DB`)

## 🚀 Deployment

### Deploy to AWS Amplify

1. **Push your code to GitHub**:

   ```bash
   git add .
   git commit -m "Initial MoodSync setup"
   git push origin main
   ```

2. **Connect to Amplify Console**:
   - Go to [AWS Amplify Console](https://console.aws.amazon.com/amplify/)
   - Choose "Host web app"
   - Connect your GitHub repository

3. **Configure environment variables** (for social login):
   - Add your OAuth secrets in the Amplify Console
   - Update callback URLs in your OAuth provider settings

## 📄 License

This project is licensed under the MIT License.
