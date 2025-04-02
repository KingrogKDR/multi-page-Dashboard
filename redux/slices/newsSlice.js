import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";

const loadCachedNews = () => {
  try {
    if (typeof window !== "undefined") {
      const storedData = localStorage.getItem("cachedNews");
      return storedData ? JSON.parse(storedData) : { articles: [] };
    }
  } catch (error) {
    console.error("Error loading cached news:", error);
  }
  return { articles: [] };
};

const saveNewsToCache = (articles) => {
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem("cachedNews", JSON.stringify({ articles }));
    }
  } catch (error) {
    console.error("Error saving news to localStorage:", error);
  }
};

export const fetchCryptoNews = createAsyncThunk(
  "news/fetchCryptoNews",
  async () => {
    try {
      let apiUrl = `https://newsdata.io/api/1/latest?apikey=${process.env.NEXT_PUBLIC_NEWS_API_KEY}&q=crypto&language=en`;

      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error Response:", errorText);
        throw new Error(
          `Failed to fetch news: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      if (!data.results) {
        console.error("Unexpected API response format:", data);
        throw new Error("Invalid API response format");
      }

      saveNewsToCache(data.results);

      return { articles: data.results };
    } catch (error) {
      console.error("Error fetching crypto news:", error);
      throw error;
    }
  }
);

const newsSlice = createSlice({
  name: "news",
  initialState: {
    articles: [],
    loading: false,
    error: null,
    selectedArticle: null,
    viewMode: "headlines",
  },
  reducers: {
    selectArticle: (state, action) => {
      state.selectedArticle = action.payload;
      state.viewMode = "fullArticle";
    },
    backToHeadlines: (state) => {
      state.viewMode = "headlines";
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCryptoNews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchCryptoNews.fulfilled, (state, action) => {
        state.loading = false;
        state.articles = action.payload.articles || [];
        state.error = null;
      })
      .addCase(fetchCryptoNews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        const cachedNews = loadCachedNews();
        if (cachedNews.articles.length > 0) {
          state.articles = cachedNews.articles;
        }
      });
  },
});

export const { selectArticle, backToHeadlines } = newsSlice.actions;
export default newsSlice.reducer;
