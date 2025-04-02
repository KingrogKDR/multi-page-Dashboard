import React from "react";
import { useSelector } from "react-redux";

const FullArticleView = ({ onBack }) => {
  const { selectedArticle } = useSelector((state) => state.news);

  if (!selectedArticle) {
    return (
      <div className="text-center p-4">
        <p>No article selected</p>
        <button
          onClick={onBack}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Back to headlines
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        ← Back to headlines
      </button>

      <h1 className="text-2xl font-bold">{selectedArticle.title}</h1>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <span>Source: {selectedArticle.source_id}</span>
        <span>{new Date(selectedArticle.pubDate).toLocaleDateString()}</span>
      </div>

      {selectedArticle.image_url && (
        <img
          src={selectedArticle.image_url}
          alt={selectedArticle.title}
          className="w-full h-64 object-cover rounded"
        />
      )}

      <div className="prose max-w-none">
        <p>{selectedArticle.description}</p>
        <p>{selectedArticle.content}</p>

        {selectedArticle.link && (
          <a
            href={selectedArticle.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 text-blue-600 hover:text-blue-800"
          >
            Read original article
          </a>
        )}
      </div>
    </div>
  );
};

export default FullArticleView;
