import axios from 'axios';

export interface WebSearchResult {
  summary: string;
  sources: { title: string; url: string; snippet?: string }[];
  raw?: unknown;
}

export interface GoogleSearchOptions {
  query: string;
  language?: string;
  maxResults?: number;
}

export async function googleWebSearch(options: GoogleSearchOptions): Promise<WebSearchResult> {
  const { query, language = 'tr', maxResults = 3 } = options;
  
  // Google Custom Search API credentials
  const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;
  
  if (!apiKey || !searchEngineId) {
    throw new Error('Google Search API credentials not configured');
  }

  try {
    // Google Custom Search API call
    const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
      params: {
        key: apiKey,
        cx: searchEngineId,
        q: query,
        num: Math.min(maxResults, 10), // Google allows max 10 results per request
        lr: language === 'tr' ? 'lang_tr' : 'lang_en',
        safe: 'active', // Safe search enabled
        fields: 'items(title,link,snippet,displayLink)' // Only get needed fields
      },
      timeout: 10000 // 10 second timeout
    });

    const items = response.data.items || [];
    
    // Extract sources from Google results
    const sources = items.map((item: any) => ({
      title: item.title || 'Başlık yok',
      url: item.link || '',
      snippet: item.snippet || ''
    }));

    // Generate summary from search results
    const summary = generateSummaryFromResults(query, sources, language);

    return {
      summary,
      sources: sources.slice(0, maxResults),
      raw: response.data
    };

  } catch (error: any) {
    console.error('Google Search API error:', error.message);
    
    // Fallback response
    return {
      summary: language === 'tr' 
        ? `"${query}" hakkında arama yapıldı ancak şu anda sonuçlar alınamadı. Lütfen daha sonra tekrar deneyin.`
        : `Search was performed for "${query}" but results could not be retrieved at the moment. Please try again later.`,
      sources: [],
      raw: { error: error.message }
    };
  }
}

function generateSummaryFromResults(query: string, sources: { title: string; url: string; snippet?: string }[], language: string): string {
  if (sources.length === 0) {
    return language === 'tr' 
      ? `"${query}" hakkında sonuç bulunamadı.`
      : `No results found for "${query}".`;
  }

  const topSnippets = sources
    .filter(source => source.snippet)
    .slice(0, 3)
    .map(source => source.snippet)
    .join(' ');

  if (language === 'tr') {
    return `"${query}" hakkında güncel bilgiler: ${topSnippets}. Detaylı bilgi için aşağıdaki kaynakları inceleyebilirsiniz.`;
  } else {
    return `Current information about "${query}": ${topSnippets}. You can review the sources below for detailed information.`;
  }
}

// Alternative provider using Google's Programmable Search Engine
export async function googleProgrammableSearch(options: GoogleSearchOptions): Promise<WebSearchResult> {
  return googleWebSearch(options);
}