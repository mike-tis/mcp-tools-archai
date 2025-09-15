import { z } from "zod";
import { promises as fs } from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';

export const BLUM_NETWORKS = {
  'solana': 'solana1000.csv',
  'bnb': 'bnb1000.csv',
  'ton': 'ton1000.csv',
} as const;

export interface BlumToken {
  token_address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo_uri: string | null;
  network?: string;
}

export type BlumNetworkKey = keyof typeof BLUM_NETWORKS;

// Update the parameter schemas to use the correct typing
export const blumTokensSearchParams = {
  query: z.string().describe("Search query to filter tokens (case insensitive, partial match on symbol or name)"),
  network: z.enum(Object.keys(BLUM_NETWORKS) as [BlumNetworkKey, ...BlumNetworkKey[]]).optional()
    .describe("Optional network name to search in (e.g., 'solana', 'bnb', 'ton'). If not provided, searches in all networks."),
  limit: z.number().default(10).describe("Maximum number of results to return (default: 10)"),
};

export const blumTokensSearchMultipleParams = {
  queries: z.array(z.string()).describe("Array of search queries to filter tokens (case insensitive, partial match on symbol or name)"),
  network: z.enum(Object.keys(BLUM_NETWORKS) as [BlumNetworkKey, ...BlumNetworkKey[]]).optional()
    .describe("Optional network name to search in (e.g., 'solana', 'bnb', 'ton'). If not provided, searches in all networks."),
  limit: z.number().default(5).describe("Maximum number of results to return per query (default: 5)"),
};

// Read and parse a CSV file
async function readCsvFile(filePath: string, networkName: string): Promise<BlumToken[]> {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
    });

    // Add network information to each token
    return records.map((record: any) => ({
      ...record,
      decimals: parseInt(record.decimals, 10),
      network: networkName
    }));
  } catch (error) {
    console.error(`Error reading CSV file ${filePath}:`, error);
    return [];
  }
}

async function readAllCsvFiles(): Promise<BlumToken[]> {
  const tokens: BlumToken[] = [];
  const blumLocalDir = path.join(process.cwd(), 'src', 'blumLocal');

  try {
    for (const [networkName, fileName] of Object.entries(BLUM_NETWORKS)) {
      const filePath = path.join(blumLocalDir, fileName);
      try {
        const networkTokens = await readCsvFile(filePath, networkName);
        tokens.push(...networkTokens);
      } catch (error) {
        // Skip files that don't exist or can't be read
        console.warn(`Could not read file for network ${networkName}: ${error}`);
      }
    }
    return tokens;
  } catch (error) {
    console.error('Error reading CSV files:', error);
    throw new Error(`Error reading Blum token data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function searchBlumTokens(
  query: string,
  network?: BlumNetworkKey,
  limit: number = 10
): Promise<BlumToken[]> {
  try {
    let tokens: BlumToken[] = [];
    const blumLocalDir = path.join(process.cwd(), 'src', 'blumLocal');
    
    if (network) {
      // No need to check if the network exists in our mapping - TypeScript will enforce this
      const fileName = BLUM_NETWORKS[network];
      
      // Read only the specified network file
      const filePath = path.join(blumLocalDir, fileName);
      tokens = await readCsvFile(filePath, network);
    } else {
      // Read all network files
      tokens = await readAllCsvFiles();
    }

    // Filter tokens by query (case insensitive)
    const queryLower = query.toLowerCase();
    const filteredTokens = tokens.filter(token => {
      const nameMatch = token.name?.toLowerCase().includes(queryLower);
      const symbolMatch = token.symbol?.toLowerCase().includes(queryLower);
      
      return nameMatch || symbolMatch;
    });

    // Return the limited results
    return filteredTokens.slice(0, limit);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error searching Blum tokens: ${errorMessage}`);
  }
}

// Search for tokens using multiple queries
export async function searchBlumTokensMultiple(
  queries: string[],
  network?: BlumNetworkKey,
  limit: number = 5
): Promise<Array<{ query: string; tokens: BlumToken[]; success: boolean; error?: string }>> {
  try {
    // Limit to processing only the first 5 queries
    const limitedQueries = queries.slice(0, 5);
    
    // Process each query
    const results = await Promise.all(
      limitedQueries.map(async (query) => {
        try {
          const tokens = await searchBlumTokens(query, network, limit);
          
          return {
            query,
            tokens,
            success: true
          };
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
          return {
            query,
            tokens: [],
            success: false,
            error: errorMessage
          };
        }
      })
    );

    return results;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error processing multiple Blum token queries: ${errorMessage}`);
  }
}