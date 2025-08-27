import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export const configSchema = z.object({
  LunarCrushApiKey: z.string().describe("LunarCrush API key"),
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
    {
      query: z.string().describe("Search query to filter tokens (case insensitive, partial match on symbol, name, or topic)"),
      limit: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
    },
    async ({ query, limit = 10 }) => {
      try {
        const response = await fetch("https://lunarcrush.com/api4/public/coins/list/v2", {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${config.LunarCrushApiKey}`,
            "Content-Type": "application/json",
          },
          signal: AbortSignal.timeout(config.timeout),
        });

        if (!response.ok) {
          throw new Error(`LunarCrush API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        
        if (!data.data || !Array.isArray(data.data)) {
          throw new Error("Invalid response format from LunarCrush API");
        }

        const queryLower = query.toLowerCase();
        const filteredTokens = data.data.filter(token => {
          const symbolMatch = token.symbol?.toLowerCase().includes(queryLower);
          const nameMatch = token.name?.toLowerCase().includes(queryLower);
          const topicMatch = token.topic?.toLowerCase().includes(queryLower);
          
          return symbolMatch || nameMatch || topicMatch;
        });

        const limitedResults = filteredTokens.slice(0, limit);

        const formattedResults = limitedResults.map(token => ({
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

        return {
          content: [
            { 
              type: "text", 
              text: JSON.stringify(formattedResults, null, 2)
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

  return server.server;
}