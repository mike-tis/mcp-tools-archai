import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchTokens,
  searchTopics,
  getTopicDetails,
  getTopicPosts,
  tokensSearchParams as lunarCrushTokensSearchParams,
  topicsSearchParams,
  generalSearchParams,
  topicDetailsParams,
  topicPostsParams,
  LunarCrushToken,
  LunarCrushTopic,
  LunarCrushTopicDetails,
  LunarCrushTopicPost
} from "./lunarCrush.js";
import {
  searchProjects,
  tokensSearchParams as tokenTerminalTokensSearchParams,
  TokenTerminalProject
} from "./tokenTerminal.js";

export const configSchema = z.object({
  LunarCrushApiKey: z.string().describe("LunarCrush API key"),
  TokenTerminalApiKey: z.string().describe("Token Terminal API key"),
  timeout: z.number().default(5000).describe("Request timeout in milliseconds"),
});

export default function createStatelessServer({
  config,
  sessionId,
}: {
  config: z.infer<typeof configSchema>; 
  sessionId: string; 
}) {
  const server = new McpServer({
    name: "ARCH AI MCP Server",
    version: "1.0.0",
  });

  server.tool(
    "lunarCrushTokensSearch",
    "Search and filter cryptocurrency tokens from LunarCrush API",
    lunarCrushTokensSearchParams,
    async ({ query, limit = 10 }) => {
      try {
        const tokens = await searchTokens(
          config.LunarCrushApiKey,
          config.timeout,
          query,
          limit
        );

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(tokens)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error searching LunarCrush tokens: ${errorMessage}`
            }
          ],
        };
      }
    }
  );
  
  server.tool(
    "lunarCrushTopicsSearch",
    "Search and filter trending social topics from LunarCrush API",
    topicsSearchParams,
    async ({ query, limit = 10 }) => {
      try {
        const topics = await searchTopics(
          config.LunarCrushApiKey,
          config.timeout,
          query,
          limit
        );

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(topics)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error searching LunarCrush topics: ${errorMessage}`
            }
          ],
        };
      }
    }
  );

  server.tool(
    "lunarCrushGeneralSearch",
    "Search both cryptocurrency tokens and social topics from LunarCrush API",
    generalSearchParams,
    async ({ query, limit = 5 }) => {
      try {
        const [tokens, topics] = await Promise.all([
          searchTokens(config.LunarCrushApiKey, config.timeout, query, limit),
          searchTopics(config.LunarCrushApiKey, config.timeout, query, limit)
        ]);

        const results = {
          tokens,
          topics
        };

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(results)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error performing general LunarCrush search: ${errorMessage}`
            }
          ],
        };
      }
    }
  );

  server.tool(
    "lunarCrushTopicDetails",
    "Get detailed information and metrics for a specific social topic from LunarCrush API",
    topicDetailsParams,
    async ({ topic }) => {
      try {
        const topicDetails = await getTopicDetails(
          config.LunarCrushApiKey,
          config.timeout,
          topic
        );

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(topicDetails)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error fetching LunarCrush topic details: ${errorMessage}`
            }
          ],
        };
      }
    }
  );

  server.tool(
    "lunarCrushTopicPosts",
    "Get top social media posts for a specific topic from LunarCrush API",
    topicPostsParams,
    async ({ topic, limit = 10, startTime }) => {
      try {
        const topicPosts = await getTopicPosts(
          config.LunarCrushApiKey,
          config.timeout,
          topic,
          limit,
          startTime
        );

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(topicPosts)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error fetching LunarCrush topic posts: ${errorMessage}`
            }
          ],
        };
      }
    }
  );

  server.tool(
    "tokenTerminalTokensSearch",
    "Search and filter cryptocurrency projects from Token Terminal API",
    tokenTerminalTokensSearchParams,
    async ({ query, limit = 5 }) => {
      try {
        const projects = await searchProjects(
          config.TokenTerminalApiKey,
          config.timeout,
          query,
          limit
        );

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(projects)
            }
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        
        return {
          content: [
            { 
              type: "text", 
              text: `Error searching Token Terminal projects: ${errorMessage}`
            }
          ],
        };
      }
    }
  );

  return server.server;
}