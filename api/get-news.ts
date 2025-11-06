
// Vercel Serverless Function to fetch and parse an RSS feed.
// This function lives in the `api/` directory and becomes an API endpoint.

// Minimal types to avoid a dependency on `@vercel/node`
interface VercelRequest {
  // This API does not use request properties, so the interface can be minimal.
}

interface VercelResponse {
  status: (statusCode: number) => VercelResponse;
  json: (body: any) => void;
  setHeader: (name: string, value: string | string[]) => void;
}

// The target RSS feed URL
const RSS_URL = 'https://www.news.gr/rss.ashx?colid=2';

/**
 * A simple, dependency-free RSS parser using regular expressions.
 * NOTE: This is tailored to the specific structure of the target RSS feed
 * and may not work for other RSS formats. It's a pragmatic choice
 * to avoid adding external parsing libraries.
 * @param {string} xml The XML content of the RSS feed.
 * @returns {Array<object>} An array of parsed news item objects.
 */
function parseRSS(xml: string) {
    const items = [];
    const itemRegex = /<item>([\s\S]*?)<\/item>/g;
    let match;

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];
        
        // Extract fields using regex, supporting CDATA sections.
        const title = itemContent.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/)?.[1]?.trim();
        const link = itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
        const rawDescription = itemContent.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/)?.[1]?.trim();
        const pubDate = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
        const imageUrl = itemContent.match(/<enclosure url="([^"]*)"/)?.[1];

        if (title && link && pubDate) {
            // Clean up the description by removing HTML tags.
            const description = rawDescription ? rawDescription.replace(/<[^>]*>?/gm, '').trim() : '';

            items.push({
                title,
                link,
                description,
                pubDate,
                imageUrl,
            });
        }
    }
    return items;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
  try {
    const response = await fetch(RSS_URL, {
      headers: {
        'User-Agent': 'Vercel-News-Feed-Fetcher/1.0',
      }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch RSS feed: ${response.status} ${response.statusText}`);
    }

    const xmlText = await response.text();
    const newsItems = parseRSS(xmlText);
    
    // Set caching headers to improve performance and reduce load on the source.
    // Cache for 60 seconds on the CDN, and allow stale content for up to 10 minutes while revalidating.
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=600');
    res.setHeader('Access-Control-Allow-Origin', '*'); // Allow cross-origin requests

    res.status(200).json(newsItems);

  } catch (error) {
    console.error('RSS Fetcher Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'Failed to fetch or parse RSS feed', details: errorMessage });
  }
}
