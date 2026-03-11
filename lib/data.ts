export interface Service {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "Feather" | "MaterialIcons";
  category: "meta-ads" | "subscriptions";
  isPremium?: boolean;
  isPopular?: boolean;
}

export interface SubscriptionApp {
  id: string;
  name: string;
  description: string;
  price: string;
  icon: string;
  iconFamily: "Ionicons" | "MaterialCommunityIcons" | "MaterialIcons";
  color: string;
}

export interface FAQ {
  question: string;
  answer: string;
}

export const services: Service[] = [
  {
    id: "meta-ads",
    title: "Meta Ads Setup",
    description: "Professional Facebook & Instagram ad campaigns to grow your business",
    icon: "megaphone-outline",
    iconFamily: "Ionicons",
    category: "meta-ads",
    isPremium: true,
    isPopular: true,
  },
  {
    id: "subscriptions",
    title: "App Premium Subscriptions",
    description: "Get premium app subscriptions at the best prices",
    icon: "apps-outline",
    iconFamily: "Ionicons",
    category: "subscriptions",
    isPopular: true,
  },
];

export const subscriptionApps: SubscriptionApp[] = [
  {
    id: "youtube-premium",
    name: "YouTube Premium",
    description: "Ad-free videos, background play, and YouTube Music",
    price: "179",
    icon: "youtube",
    iconFamily: "MaterialCommunityIcons",
    color: "#FF0000",
  },
  {
    id: "amazon-prime",
    name: "Amazon Prime Video",
    description: "Thousands of movies, TV shows, and originals",
    price: "149",
    icon: "movie-open-outline",
    iconFamily: "MaterialCommunityIcons",
    color: "#00A8E1",
  },
  {
    id: "sony-liv",
    name: "Sony LIV",
    description: "Live sports, original series, and entertainment",
    price: "99",
    icon: "television-play",
    iconFamily: "MaterialCommunityIcons",
    color: "#1A1A2E",
  },
  {
    id: "zee5",
    name: "Zee5",
    description: "Movies, web series, TV shows, and live TV",
    price: "79",
    icon: "play-circle-outline",
    iconFamily: "MaterialCommunityIcons",
    color: "#8B5CF6",
  },
];

export const faqs: FAQ[] = [
  {
    question: "How long does Meta Ads setup take?",
    answer: "Typically 2-3 business days for full campaign setup including targeting, creatives, and optimization.",
  },
  {
    question: "Can I cancel a subscription anytime?",
    answer: "Yes, you can request cancellation at any time. We'll process it within 24 hours.",
  },
  {
    question: "How do I pay for services?",
    answer: "We accept UPI, bank transfers, and all major payment methods. Payment details are shared after booking confirmation.",
  },
  {
    question: "Do you offer refunds?",
    answer: "Yes, we offer full refunds within 7 days if the service hasn't been started.",
  },
  {
    question: "How can I track my ad campaign?",
    answer: "We provide weekly reports with key metrics. You'll also get access to the Meta Ads dashboard.",
  },
];
