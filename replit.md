# iDigitalZone - Client Services App

## Overview
iDigitalZone is a mobile-first client services application designed to provide a streamlined experience for users accessing various services. The project aims to offer a premium SaaS marketplace feel, focusing on business growth services like Meta Ads management and OTT subscriptions. It incorporates a robust referral and rewards system to encourage user engagement and a wallet-only payment system for all in-app purchases. The application is built to be scalable and user-friendly, with a strong emphasis on real-time interactions, secure transactions, and comprehensive legal compliance. The business vision is to capture a significant market share in the digital services sector by offering diverse, high-quality services through an intuitive mobile platform.

## User Preferences
- Firebase Client SDK only (no firebase-admin, no service account keys)
- Frontend-only architecture for data operations
- Backend reserved for Stripe payments only

## System Architecture

### Frontend
The frontend is built with Expo (React Native) using Expo Router for file-based routing. Key UI/UX decisions include a mobile-first approach, premium SaaS marketplace layout with gradient hero sections, social proof elements, and categorized service listings. It features a dedicated wallet screen for managing funds, an invite & earn page for referrals, and a comprehensive legal section.

### Backend
A minimal Express backend runs on port 5000, primarily handling Stripe payment processing and serving the Expo landing page. It does not perform any data operations, as all data interactions are managed directly by the client-side Firebase SDK. In development mode, the backend proxies all non-API requests to the Metro bundler on port 8081.

### Database and Authentication
Firebase is central to the architecture, utilizing Firestore for all data storage and Firebase Auth for user authentication (email/password and phone-based login). Data collections include Users, Chats, Orders, Notifications, OttApps, Bookings, SubscriptionRequests, PushTokens, Counters, and Config. The system leverages Firestore transactions for atomic operations, such as decrementing stock on purchase and generating sequential user IDs.

### Workflows
- **Start Backend**: `npm run server:dev` — Runs Express server on port 5000 (webview)
- **Start Frontend**: Metro bundler via `./node_modules/.bin/expo start --localhost` with environment variables for Replit domain proxying (console output, port 8081)

### Core Features
- **Client Services**: Offers Meta Ads management (with Business Owner and Direct Seller categories) and OTT app subscriptions. Services feature dynamic pricing, original/discounted price displays, and stock management with visual indicators. Meta Ads flow: category selection (`app/meta-ads-category.tsx`) → Business Owner (`app/meta-ads-business.tsx` with video upload + customer details + plan selection) or Direct Seller (`app/service-detail.tsx` with credentials). Stock tracking: `Settings.getMetaAdsStock()`/`setMetaAdsStock()`/`decrementMetaAdsStock()` in `lib/firestore.ts`; stored in `settings/general` document under `metaAdsStock` field with keys `oneTime`, `weekly`, `fifteenDays`, `monthly`, `boSetupManage`, `boOneTime`. Stock is decremented atomically (Firestore transaction) before order creation; returns -1 if depleted. Admin refill UI in settings modal of admin-dashboard.
- **Order Management**: Detailed order views, admin search capabilities, and copyable order IDs. Orders classified into Meta Ads Setup (Business Owner / Direct Seller) and Premium Subscription categories. Meta Ads orders use "Accepted/Rejected" status labels; Premium orders use "In Progress/Cancelled". Automatic wallet refund on rejection (Meta Ads) or cancellation (Premium Subscription) with double-refund guard.
- **Video Upload**: Business Owner orders upload videos to Firebase Storage; admin can preview/download videos from the order card.
- **Chat System**: Real-time in-app support chat with attachment capabilities, quick issue chips, and admin management.
- **Wallet and Payments**: Wallet-only payment system using a rupee balance, integrated withdrawal system with admin approval and dynamic tax, and a referral-based coin reward system with redemption options. Includes a "Spin & Win" wheel on the Profile tab (floating bubble icon, only visible when spins are available) that awards 1–50 DiZi coins per spin. Spins are earned when an order is completed by admin — `spinsEarned` incremented on UserProfile; `spinsUsed` tracks consumed spins. Bubble shows badge count when multiple spins available. Rewards recorded as `spin_reward` wallet transactions. User gets a notification when a spin is unlocked.
- **Affiliate Network (My Network)**: Users get a single auto-generated unique ID (DE01, DE02...) via Firestore counter (`counters/userCounter`). No separate referral code — the unique ID serves as the sole identifier. During signup, users can enter a Sponsor ID to link to their referrer. The "My Network" screen (`app/invite-earn.tsx`) shows the user's unique ID, sponsor info, direct downline members (queried via `sponsorId` field), registered members (stored in `myNetwork` Firestore collection), and earning activity. Users can register new members directly. UserProfile fields: `uniqueId`, `sponsorId`. Network collection: `myNetwork` with fields `ownerId`, `ownerUniqueId`, `memberId`, `memberUniqueId`, `memberName`, `memberEmail`, `memberPhone`, `addedAt`.
- **Referral Earning System**: 3-level commission system on purchases. Level 1 (direct sponsor): 5%, Level 2: 2.5%, Level 3: 1%. Joining bonus: ₹20 credited to new user's wallet on signup. Referral signup bonus: ₹10 credited to sponsor when someone joins using their ID. All bonuses/commissions go to `walletBalance` (rupees), not coins. Earning records stored in `earnings` Firestore collection with `EarningRecord` interface. Commission distribution walks the sponsor chain via `sponsorId` → `Users.getByUniqueId`. Integrated into all purchase flows: `service-detail.tsx`, `meta-ads-business.tsx`, `subscriptions.tsx`. Auth flow bonuses in `auth-context.tsx` (signup) and `invite-earn.tsx` (handleRegisterMember). WalletTransaction types include `joining_bonus`, `referral_signup_bonus`, `level_commission`. My Earning tab shows summary card with total/breakdown, commission structure visual (L1/L2/L3 cards), and earnings history list.
- **Admin Panel**: A hidden, password-protected admin dashboard provides comprehensive management capabilities across chats, OTT apps, bookings, orders, users, and system configurations (e.g., dynamic pricing, referral rewards, withdrawal tax). Long-pressing a user shows detailed profile info (unique ID, sponsor ID, email, phone, join date, wallet/coins/orders) with an account suspend/reactivate toggle. UserProfile has a `suspended` boolean field.
- **Business Book**: Admin-only financial dashboard (`app/business-book.tsx`) with overview (summary cards, net profit, breakdown), orders table (search, status filter, date range filters), and expenses management (add/delete with categories). Uses configurable cost percent from Firestore settings. Firestore `expenses` collection for expense tracking.
- **Legal Compliance**: Includes a full suite of legal pages covering Privacy Policy, Terms & Conditions, Refund & Cancellation, Withdrawal, Referral & Reward, and Disclaimer, compliant with Indian law and app store guidelines.

### State Management
Utilizes React Context for global state management, including `AuthContext` for Firebase Auth and user profiles, `AdminContext` for admin session persistence, and `ThemeContext` for UI themes.

## External Dependencies
- **Firebase**: Firestore (database), Firebase Auth (authentication), Firebase Storage (video uploads).
- **Stripe**: Payment gateway for processing transactions (via Replit integration).
- **Expo**: React Native framework for mobile development.
- **`@expo-google-fonts/inter`**: Custom typography.
- **`expo-linear-gradient`**: Gradient backgrounds.
- **`expo-haptics`**: Haptic feedback.
- **`@react-native-async-storage/async-storage`**: Local data persistence.
- **`expo-clipboard`**: Copy-to-clipboard functionality.