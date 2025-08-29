import { z } from "zod";

// Types for the API responses
export interface LunarCrushToken {
  id: string;
  symbol: string;
  name: string;
  price: number;
  price_btc: number;
  volume_24h: number;
  market_cap: number;
  market_cap_rank: number;
  percent_change_1h: number;
  percent_change_24h: number;
  percent_change_7d: number;
  percent_change_30d: number;
  galaxy_score: number;
  sentiment: number;
  social_volume_24h: number;
  social_dominance: number;
  market_dominance: number;
  topic: string;
  categories: string[];
  logo: string;
}

export interface LunarCrushTopic {
  topic: string;
  title: string;
  topic_rank: number;
  topic_rank_1h_previous: number;
  topic_rank_24h_previous: number;
  num_contributors: number;
  num_posts: number;
  interactions_24h: number;
}

export interface LunarCrushTopicDetails {
  topic: string;
  title: string;
  topic_rank: number;
  related_topics: string[];
  types_count: Record<string, number>;
  types_interactions: Record<string, number>;
  types_sentiment: Record<string, number>;
  types_sentiment_detail: Record<string, {
    positive: number;
    neutral: number;
    negative: number;
  }>;
  interactions_24h: number;
  num_contributors: number;
  num_posts: number;
  categories: string[];
  trend: 'up' | 'down' | 'flat';
}

export interface LunarCrushTopicPost {
  id: string | number;
  post_type: string;
  post_title: string;
  post_link: string;
  post_image?: string;
  post_created: number;
  post_sentiment: number;
  creator_id: string;
  creator_name: string;
  creator_display_name: string;
  creator_followers: number;
  creator_avatar: string;
  interactions_24h: number;
  interactions_total: number;
}

// Schemas for tool parameters
export const tokensSearchParams = {
  query: z.string().describe("Search query to filter tokens (case insensitive, partial match on symbol, name, or topic)"),
  limit: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
};

export const topicsSearchParams = {
  query: z.string().optional().describe("Optional search query to filter topics (case insensitive, partial match on topic or title)"),
  limit: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
};

export const generalSearchParams = {
  query: z.string().describe("Search query to filter both tokens and topics (case insensitive, partial match)"),
  limit: z.number().default(5).describe("Maximum number of results to return per type (default: 5)"),
};

export const topicDetailsParams = {
  topic: z.string().describe("Topic identifier to get detailed information about (e.g. 'bitcoin')"),
};

export const topicPostsParams = {
  topic: z.string().describe("Topic identifier to get top posts for (e.g. 'bitcoin')"),
  limit: z.number().default(10).describe("Maximum number of posts to return (default: 10)"),
  startTime: z.string().optional().describe("Optional start time as ISO timestamp (e.g. '2023-04-01T00:00:00Z'). If provided, returns top posts for the time range. If not provided, returns top posts from the last 24 hours"),
};

// API functions
export async function searchTokens(
  apiKey: string, 
  timeout: number, 
  query: string, 
  limit: number = 10
): Promise<LunarCrushToken[]> {
  try {
    const response = await fetch("https://lunarcrush.com/api4/public/coins/list/v2", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from LunarCrush API");
    }

    const queryLower = query.toLowerCase();
    const filteredTokens = data.data.filter((token: any) => {
      const symbolMatch = token.symbol?.toLowerCase().includes(queryLower);
      const nameMatch = token.name?.toLowerCase().includes(queryLower);
      const topicMatch = token.topic?.toLowerCase().includes(queryLower);
      
      return symbolMatch || nameMatch || topicMatch;
    });

    const limitedResults = filteredTokens.slice(0, limit);

    return limitedResults.map((token: any) => ({
      id: token.id,
      symbol: token.symbol,
      name: token.name,
      price: token.price,
      price_btc: token.price_btc,
      volume_24h: token.volume_24h,
      market_cap: token.market_cap,
      market_cap_rank: token.market_cap_rank,
      percent_change_1h: token.percent_change_1h,
      percent_change_24h: token.percent_change_24h,
      percent_change_7d: token.percent_change_7d,
      percent_change_30d: token.percent_change_30d,
      galaxy_score: token.galaxy_score,
      sentiment: token.sentiment,
      social_volume_24h: token.social_volume_24h,
      social_dominance: token.social_dominance,
      market_dominance: token.market_dominance,
      topic: token.topic,
      categories: token.categories,
      logo: token.logo,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error searching LunarCrush tokens: ${errorMessage}`);
  }
}

export async function searchTopics(
  apiKey: string, 
  timeout: number, 
  query?: string, 
  limit: number = 10
): Promise<LunarCrushTopic[]> {
  try {
    const response = await fetch("https://lunarcrush.com/api4/public/topics/list/v1", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from LunarCrush API");
    }

    let filteredTopics = data.data;
    
    if (query) {
      const queryLower = query.toLowerCase();
      filteredTopics = data.data.filter((topic: any) => {
        const topicMatch = topic.topic?.toLowerCase().includes(queryLower);
        const titleMatch = topic.title?.toLowerCase().includes(queryLower);
        
        return topicMatch || titleMatch;
      });
    }

    const limitedResults = filteredTopics.slice(0, limit);

    return limitedResults.map((topic: any) => ({
      topic: topic.topic,
      title: topic.title,
      topic_rank: topic.topic_rank,
      topic_rank_1h_previous: topic.topic_rank_1h_previous,
      topic_rank_24h_previous: topic.topic_rank_24h_previous,
      num_contributors: topic.num_contributors,
      num_posts: topic.num_posts,
      interactions_24h: topic.interactions_24h,
    }));
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error searching LunarCrush topics: ${errorMessage}`);
  }
}

export async function getTopicDetails(
  apiKey: string,
  timeout: number,
  topic: string
): Promise<LunarCrushTopicDetails> {
  try {
    const response = await fetch(`https://lunarcrush.com/api4/public/topic/${encodeURIComponent(topic)}/v1`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      throw new Error("Invalid response format from LunarCrush API");
    }

    return data.data as LunarCrushTopicDetails;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error fetching LunarCrush topic details: ${errorMessage}`);
  }
}

export async function getTopicPosts(
  apiKey: string,
  timeout: number,
  topic: string,
  limit: number = 10,
  startTime?: string
): Promise<LunarCrushTopicPost[]> {
  try {
    let url = `https://lunarcrush.com/api4/public/topic/${encodeURIComponent(topic)}/posts/v1`;
    if (startTime) {
      const unixTimestamp = Math.floor(new Date(startTime).getTime() / 1000);
      url += `?start=${unixTimestamp}`;
    }
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data || !Array.isArray(data.data)) {
      throw new Error("Invalid response format from LunarCrush API");
    }

    // Limit the number of results
    return data.data.slice(0, limit) as LunarCrushTopicPost[];
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error fetching LunarCrush topic posts: ${errorMessage}`);
  }
}
