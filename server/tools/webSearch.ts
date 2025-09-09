import pLimit from 'p-limit';
import { googleWebSearch, WebSearchResult } from './providers/googleWeb';

export interface WebSearchOptions {
  query: string;
  maxResults?: number;
  language?: string;
}

// Rate limiting: Max 2 concurrent web search requests
const limit = pLimit(2);

// Configuration from environment variables
const MAX_WEB_SEARCH = parseInt(process.env.MAX_WEB_SEARCH || '3');
const DEBUG_WEBSEARCH = process.env.DEBUG_WEBSEARCH === 'true';

/**
 * Main web search function that coordinates search requests
 * Implements rate limiting, fallback handling, and result normalization
 */
export async function webSearch(options: WebSearchOptions): Promise<WebSearchResult> {
  const { query, maxResults = 3, language = 'tr' } = options;
  
  // Ensure we don't exceed the maximum allowed searches
  const cappedMaxResults = Math.min(maxResults, MAX_WEB_SEARCH);
  
  if (DEBUG_WEBSEARCH) {
    console.log(`🔍 Web search started for query: "${query}" (max results: ${cappedMaxResults}, language: ${language})`);
  }

  try {
    // Use rate-limited Google search
    const result = await limit(() => 
      googleWebSearch({
        query,
        maxResults: cappedMaxResults,
        language
      })
    );

    if (DEBUG_WEBSEARCH) {
      console.log(`✅ Web search completed. Found ${result.sources.length} sources`);
    }

    return result;

  } catch (error: any) {
    console.error('❌ Web search failed:', error.message);
    
    // Fallback response in case of complete failure
    return createFallbackResponse(query, language);
  }
}

/**
 * Create a fallback response when web search fails
 */
function createFallbackResponse(query: string, language: string): WebSearchResult {
  const turkishResponse = `"${query}" hakkında arama yapıldı ancak şu anda web sonuçları alınamadı. Bilgilerimi kullanarak size yardımcı olmaya devam edebilirim.`;
  const englishResponse = `Search was performed for "${query}" but web results could not be retrieved at the moment. I can continue to help you using my existing knowledge.`;
  
  return {
    summary: language === 'tr' ? turkishResponse : englishResponse,
    sources: [],
    raw: { error: 'Search service temporarily unavailable' }
  };
}

/**
 * Check if web search is enabled for a specific agent
 */
export function isWebSearchEnabled(agentTools: any): boolean {
  return Boolean(agentTools?.webSearch);
}

/**
 * Validate web search query before processing
 */
export function validateWebSearchQuery(query: string): { valid: boolean; error?: string } {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query is required and must be a string' };
  }
  
  if (query.trim().length < 2) {
    return { valid: false, error: 'Query must be at least 2 characters long' };
  }
  
  if (query.length > 500) {
    return { valid: false, error: 'Query must be less than 500 characters' };
  }
  
  return { valid: true };
}

/**
 * Sanitize and normalize search results
 */
export function sanitizeSearchResults(result: WebSearchResult): WebSearchResult {
  return {
    summary: result.summary?.slice(0, 2000) || '', // Limit summary length
    sources: result.sources
      .filter(source => source.url && source.title) // Remove invalid sources
      .slice(0, 5) // Max 5 sources
      .map(source => ({
        title: source.title.slice(0, 200), // Limit title length
        url: source.url,
        snippet: source.snippet?.slice(0, 300) || undefined // Limit snippet length
      })),
    raw: DEBUG_WEBSEARCH ? result.raw : undefined // Only include raw data in debug mode
  };
}

export type { WebSearchResult } from './providers/googleWeb';