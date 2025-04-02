import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchCryptoNews,
  selectArticle,
  backToHeadlines,
} from "../redux/slices/newsSlice";
import NewsHeadlines from "./NewsHeadlines";
import FullArticleView from "./FullArticleView";

const NewsApp = () => {
  const dispatch = useDispatch();
  const news = useSelector((state) => state.news);
  const { loading, error, articles, viewMode } = news;

  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    dispatch(fetchCryptoNews());
  }, [dispatch, retryCount]);

  const handleRetry = () => {
    setRetryCount((prevCount) => prevCount + 1);
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Latest Crypto News</h1>

      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <h3 className="text-red-700 font-medium mb-2">Error loading news:</h3>
          <p className="text-red-600">{error}</p>
          <button
            onClick={handleRetry}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      ) : viewMode === "headlines" ? (
        <>
          <NewsHeadlines
            articles={articles}
            loading={loading}
            onSelectArticle={(article) => dispatch(selectArticle(article))}
          />
        </>
      ) : (
        <FullArticleView onBack={() => dispatch(backToHeadlines())} />
      )}
    </div>
  );
};

export default NewsApp;
