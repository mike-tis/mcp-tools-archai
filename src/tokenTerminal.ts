import { z } from "zod";

// Types for the API responses
export interface TokenTerminalProject {
  project_id: string;
  name: string;
  slug: string;
  blockchain: string;
  category: string;
  subcategory: string;
  description: string;
  coingecko_id: string;
  terminal_id: string;
  ethereum_contract_addresses: string[];
  l2_scaling_solution: boolean;
  products: TokenTerminalProduct[];
}

export interface TokenTerminalProduct {
  product_id: string;
  product_name: string;
  symbol: string;
  ethereum_contract_address: string;
}

export interface TokenTerminalMetricAvailability {
  name: string;
  project_id: string;
  symbol: string;
  description: Record<string, any>;
  market_sectors: Record<string, any>;
  chains: string[];
  links: {
    summary: string;
    url: string;
  }[];
  aggregate_by_options: Record<string, any>;
  metric_availability: string;
  metric_definitions: {
    metric_id: string;
    definition: string;
  }[];
  metric_sources: {
    metric_id: string;
    definition: string;
  }[];
}

// Merged project with metrics
export interface TokenTerminalMergedProject extends Omit<TokenTerminalProject, 'description'>, Omit<TokenTerminalMetricAvailability, 'project_id' | 'name'> {
  // Merged fields from both interfaces, excluding duplicate fields
}

// Schemas for tool parameters
export const tokensSearchParams = {
  query: z.string().describe("Search query to filter projects (case insensitive, partial match on name, project_id, coingecko_id or product details)"),
  limit: z.number().max(10).default(5).describe("Maximum number of results to return (default: 5, max: 10)"),
};

export const tokensSearchMultipleParams = {
  queries: z.array(z.string()).describe("Array of search queries to filter projects (maximum 5 queries processed)"),
};

// API functions
export async function searchProjects(
  apiKey: string, 
  timeout: number, 
  query: string, 
  limit: number = 5
): Promise<TokenTerminalMergedProject[]> {
  try {
    // Enforce maximum limit
    const actualLimit = Math.min(limit, 10);
    
    const response = await fetch("https://api.tokenterminal.com/v2/projects", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Token Terminal API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!Array.isArray(data.data)) {
      throw new Error("Invalid response format from Token Terminal API");
    }

    const queryLower = query.toLowerCase();
    const filteredProjects = data.data.filter((project: TokenTerminalProject) => {
      // Match on project fields
      const nameMatch = project.name?.toLowerCase().includes(queryLower);
      const projectIdMatch = project.project_id?.toLowerCase().includes(queryLower);
      const coingeckoIdMatch = project.coingecko_id?.toLowerCase().includes(queryLower);
      
      return nameMatch || projectIdMatch || coingeckoIdMatch;
    });

    const limitedResults = filteredProjects.slice(0, actualLimit);

    // Fetch metric availability for each project and merge the data
    const mergedProjects = await Promise.all(limitedResults.map(async (project) => {
      try {
        const metricAvailability = await getProjectMetricAvailability(
          apiKey,
          timeout,
          project.project_id
        );

        // Merge project and metric availability data
        // Explicitly omit duplicate fields from metric availability
        const { project_id: _pid, name: _name, ...metricRest } = metricAvailability;
        
        // Return merged object
        return {
          ...project,
          ...metricRest
        } as TokenTerminalMergedProject;
      } catch (error) {
        // If fetching metrics fails for a project, return just the project data
        console.error(`Error fetching metrics for ${project.project_id}:`, error);
        return project as unknown as TokenTerminalMergedProject;
      }
    }));

    return mergedProjects;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error searching Token Terminal projects: ${errorMessage}`);
  }
}

export async function getProjectMetricAvailability(
  apiKey: string,
  timeout: number,
  projectId: string
): Promise<TokenTerminalMetricAvailability> {
  try {
    const response = await fetch(`https://api.tokenterminal.com/v2/projects/${encodeURIComponent(projectId)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(timeout),
    });

    if (!response.ok) {
      throw new Error(`Token Terminal API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.data) {
      throw new Error("Invalid response format from Token Terminal API");
    }

    return data.data as TokenTerminalMetricAvailability;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    throw new Error(`Error fetching project metric availability: ${errorMessage}`);
  }
}