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
const RSS_URL = 'https://www.kathimerini.gr/infeeds/rss/nx-rss-feed.xml';

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

    // Helper to decode HTML entities in a Node.js environment
    const decodeEntities = (encodedString: string): string => {
        if (!encodedString) return '';
        // A minimal decoder for numeric entities and common named entities
        return encodedString.replace(/&#(\d+);/g, (match, dec) => {
            return String.fromCharCode(dec);
        }).replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#0*39;/g, "'");
    };

    while ((match = itemRegex.exec(xml)) !== null) {
        const itemContent = match[1];
        
        // Handles titles that are plain text or wrapped in CDATA.
        const rawTitleMatch = itemContent.match(/<title>([\s\S]*?)<\/title>/);
        let title: string | undefined = undefined;

        if (rawTitleMatch && rawTitleMatch[1]) {
            let rawTitle = rawTitleMatch[1].trim();
            if (rawTitle.startsWith('<![CDATA[') && rawTitle.endsWith(']]>')) {
                title = rawTitle.substring(9, rawTitle.length - 3).trim();
            } else {
                title = rawTitle;
            }
            title = decodeEntities(title);
        }

        const link = itemContent.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim();
        
        // Handles descriptions that are plain text or wrapped in CDATA.
        const descriptionMatch = itemContent.match(/<description>([\s\S]*?)<\/description>/);
        let rawDescription = descriptionMatch ? descriptionMatch[1].trim() : '';
        if (rawDescription.startsWith('<![CDATA[')) {
             rawDescription = rawDescription.substring(9, rawDescription.length - 3).trim();
        }
        // FIX: Corrected a buggy regex used for stripping HTML tags. The '?' was making the closing '>' optional, which could lead to incorrect stripping of partial tags.
        const description = rawDescription ? decodeEntities(rawDescription).replace(/<[^>]*>/gm, '').trim() : '';

        const pubDate = itemContent.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim();
        
        // Extract image URL from <media:thumbnail> tag
        const imageUrl = itemContent.match(/<media:thumbnail url="([^"]*)"/)?.[1];

        if (title && link && pubDate) {
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
]]></content>
  </change>
</changes>
```