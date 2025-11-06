
import React, { useState, useEffect } from 'react';
import type { NewsItem } from './types';

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center min-h-screen">
    <svg className="animate-spin h-12 w-12 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  </div>
);

const ErrorDisplay: React.FC<{ message: string }> = ({ message }) => (
  <div className="flex justify-center items-center min-h-screen">
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
      <strong className="font-bold">Error:</strong>
      <span className="block sm:inline ml-2">{message}</span>
    </div>
  </div>
);

const NewsCard: React.FC<{ item: NewsItem }> = ({ item }) => {
  const formattedDate = new Date(item.pubDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden transform hover:-translate-y-2 transition-transform duration-300 ease-in-out flex flex-col">
      <img 
        src={item.imageUrl || `https://picsum.photos/seed/${item.link}/600/400`} 
        alt={item.title} 
        className="w-full h-48 object-cover" 
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.onerror = null; // prevent infinite loop
          target.src = `https://picsum.photos/seed/${item.link}/600/400`;
        }}
      />
      <div className="p-6 flex flex-col flex-grow">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm flex-grow mb-4">{item.description}</p>
        <div className="flex justify-between items-center mt-auto">
            <span className="text-xs text-gray-500 dark:text-gray-400">{formattedDate}</span>
            <a 
              href={item.link} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Read More
            </a>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
    const [news, setNews] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNews = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch('/api/get-news');
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({ details: 'Could not parse error response.' }));
                    throw new Error(`API Error: ${response.status} - ${errorData.details || response.statusText}`);
                }
                const data: NewsItem[] = await response.json();
                setNews(data);
            } catch (err) {
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('An unexpected error occurred while fetching news.');
                }
            } finally {
                setLoading(false);
            }
        };

        fetchNews();
    }, []);

    if (loading) {
        return <LoadingSpinner />;
    }

    if (error) {
        return <ErrorDisplay message={error} />;
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <header className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 dark:text-white">
                    Kathimerini News Feed
                </h1>
                <p className="text-lg text-gray-500 dark:text-gray-300 mt-2">
                    Latest news from kathimerini.gr, fetched via a Vercel API
                </p>
            </header>
            
            <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                {news.map((item, index) => (
                    <NewsCard key={item.link + index} item={item} />
                ))}
            </main>
        </div>
    );
};

export default App;