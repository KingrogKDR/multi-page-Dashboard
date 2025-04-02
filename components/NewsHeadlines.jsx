import React from 'react';

const NewsHeadlines = ({ articles, loading, onSelectArticle }) => {
  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!articles.length) {
    return <div className="text-center p-4">No crypto news found.</div>;
  }

  return (
    <div className="space-y-4">
      {articles.map((article) => (
        <div 
          key={article.article_id} 
          className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition"
          onClick={() => onSelectArticle(article)}
        >
          <h2 className="text-lg font-semibold">{article.title}</h2>
          <div className="flex items-center justify-between mt-2">
            <span className="text-sm text-gray-500">{article.source_id}</span>
            <span className="text-sm text-gray-500">
              {new Date(article.pubDate).toLocaleDateString()}
            </span>
          </div>
          {article.image_url && (
            <img 
              src={article.image_url} 
              alt={article.title} 
              className="mt-2 w-full h-48 object-cover rounded"
            />
          )}
          <p className="mt-2 text-gray-700 line-clamp-2">{article.description}</p>
          <button 
            className="mt-2 text-blue-600 hover:text-blue-800"
            onClick={(e) => {
              e.stopPropagation();
              onSelectArticle(article);
            }}
          >
            Read more →
          </button>
        </div>
      ))}
    </div>
  );
};

export default NewsHeadlines;