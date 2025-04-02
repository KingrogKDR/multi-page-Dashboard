import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const defaultCoins = ["BTC", "ETH", "SOL"];

const API_CONFIG = {
  baseUrl: "https://api.coincap.io/v2",
  maxRetries: 4,
  initialDelay: 5000,
};

const loadFavorites = () => {
  if (typeof window !== "undefined") {
    try {
      const favoritesJson = localStorage.getItem("favoriteCryptoCoins");
      return favoritesJson ? JSON.parse(favoritesJson) : [];
    } catch (error) {
      console.error("Error loading favorites from localStorage:", error);
      return [];
    }
  }
  return [];
};

const saveFavorites = (favorites) => {
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem("favoriteCryptoCoins", JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  }
};

const fetchWithRetry = async (url, retries = API_CONFIG.maxRetries) => {
  let attempt = 0;

  while (attempt <= retries) {
    try {
      return await axios.get(url);
    } catch (error) {
      if (
        attempt >= retries ||
        (error.response?.status !== 429 && error.response?.status !== 503)
      ) {
        throw error;
      }

      const delay = API_CONFIG.initialDelay * Math.pow(2, attempt);
      console.log(
        `Rate limited, retrying in ${delay}ms (attempt ${
          attempt + 1
        }/${retries})`
      );

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, delay));

      attempt++;
    }
  }
};

class RequestQueue {
  constructor(concurrency = 2, interval = 1000) {
    this.queue = [];
    this.running = 0;
    this.concurrency = concurrency;
    this.interval = interval;
    this.lastRequestTime = 0;
  }

  add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.running >= this.concurrency || this.queue.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    if (timeSinceLastRequest < this.interval) {
      await new Promise((resolve) =>
        setTimeout(resolve, this.interval - timeSinceLastRequest)
      );
    }

    if (!this.queue || this.queue.length === 0) {
      this.running--;
      return;
    }

    const { fn, resolve, reject } = this.queue.shift();
    this.lastRequestTime = Date.now();

    try {
      const result = await fn();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      this.running--;
      this.process();
    }
  }
}

const apiQueue = new RequestQueue(2, 500);

export const fetchCryptoData = createAsyncThunk(
  "crypto/fetchCryptoData",
  async (
    { searchedCoin = null, refreshOnly = false },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState();
      const favorites = state.crypto.favorites;

      let coinsToFetch = refreshOnly
        ? state.crypto.cryptoData.map((coin) => coin.symbol)
        : searchedCoin && !defaultCoins.includes(searchedCoin.toUpperCase())
        ? [searchedCoin.toUpperCase(), ...defaultCoins]
        : defaultCoins;

      favorites.forEach((fav) => {
        if (!coinsToFetch.includes(fav)) {
          coinsToFetch.push(fav);
        }
      });

      const uniqueCoins = [...new Set(coinsToFetch)];

      // Process coins with queue to avoid rate limiting
      const cryptoPromises = uniqueCoins.map(async (symbol) => {
        try {
          // Queue the search request
          const searchResponse = await apiQueue.add(() =>
            fetchWithRetry(
              `${API_CONFIG.baseUrl}/assets?search=${symbol.toLowerCase()}`
            )
          );

          let coinData;
          let coinId;

          if (searchResponse.data.data && searchResponse.data.data.length > 0) {
            // Find the exact match or closest match
            const exactMatch = searchResponse.data.data.find(
              (coin) => coin.symbol.toLowerCase() === symbol.toLowerCase()
            );

            coinData = exactMatch || searchResponse.data.data[0];
            coinId = coinData.id;

            // Queue the detailed data request
            const detailResponse = await apiQueue.add(() =>
              fetchWithRetry(`${API_CONFIG.baseUrl}/assets/${coinId}`)
            );

            coinData = detailResponse.data.data;

            // Queue the historical data request
            const historyResponse = await apiQueue.add(() =>
              fetchWithRetry(
                `${API_CONFIG.baseUrl}/assets/${coinId}/history?interval=d1&limit=7`
              )
            );

            const historyData = historyResponse.data.data;
            const priceHistory = {
              prices: historyData.map((item) => parseFloat(item.priceUsd)),
              labels: historyData.map((item) => {
                const date = new Date(item.time);
                return date.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
              }),
            };

            return {
              id: coinId,
              symbol: coinData.symbol,
              name: coinData.name,
              price: parseFloat(coinData.priceUsd),
              priceChange24h: parseFloat(coinData.changePercent24Hr),
              marketCap: parseFloat(coinData.marketCapUsd),
              volume24h: parseFloat(coinData.volumeUsd24Hr),
              supply: parseFloat(coinData.supply),
              maxSupply: coinData.maxSupply
                ? parseFloat(coinData.maxSupply)
                : null,
              logo: `https://assets.coincap.io/assets/icons/${coinData.symbol.toLowerCase()}@2x.png`,
              isFavorite: favorites.includes(coinData.symbol),
              lastUpdated: new Date().toISOString(),
              priceHistory: priceHistory,
            };
          }
          return {
            symbol: symbol.toUpperCase(),
            name: symbol.toUpperCase(),
            error: "Cryptocurrency not found",
            isFavorite: favorites.includes(symbol.toUpperCase()),
          };
        } catch (error) {
          console.error(`Error fetching data for ${symbol}:`, error);

          // Return partial data if we already have this coin in state
          const existingData = getState().crypto.cryptoData.find(
            (c) => c.symbol === symbol.toUpperCase()
          );

          if (existingData) {
            return {
              ...existingData,
              error: `Failed to update: ${error.message || "API error"}`,
              stale: true,
              isFavorite: favorites.includes(symbol.toUpperCase()),
            };
          }

          return {
            symbol: symbol.toUpperCase(),
            name: symbol.toUpperCase(),
            error: error.message || "Failed to fetch data",
            isFavorite: favorites.includes(symbol.toUpperCase()),
          };
        }
      });

      const cryptoData = await Promise.all(cryptoPromises);
      if (searchedCoin) cryptoData.sort((a, b) => (a.symbol === searchedCoin.toUpperCase() ? -1 : 1));
      return cryptoData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.error || "Error fetching cryptocurrency data"
      );
    }
  }
);

const cryptoSlice = createSlice({
  name: "crypto",
  initialState: {
    cryptoData: [],
    loading: false,
    error: null,
    favorites: loadFavorites(),
    lastRefresh: null,
  },
  reducers: {
    toggleFavorite: (state, action) => {
      const symbol = action.payload;

      if (state.favorites.includes(symbol)) {
        state.favorites = state.favorites.filter((coin) => coin !== symbol);
      } else {
        state.favorites.push(symbol);
      }

      state.cryptoData = state.cryptoData.map((coin) => {
        if (coin.symbol === symbol) {
          return { ...coin, isFavorite: !coin.isFavorite };
        }
        return coin;
      });

      saveFavorites(state.favorites);
    },
    updateLivePrice: (state, action) => {
      const { symbol, price, priceChange, priceChangePercent } = action.payload;

      const coinIndex = state.cryptoData.findIndex(
        (coin) => coin.symbol === symbol
      );
      if (coinIndex !== -1) {
        state.cryptoData[coinIndex] = {
          ...state.cryptoData[coinIndex],
          price,
          priceChange24h: priceChangePercent,
          lastUpdated: new Date().toISOString(),
        };
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCryptoData.pending, (state, action) => {
        // Only show loading indicator for initial loads, not refreshes
        const { refreshOnly } = action.meta.arg || {};
        if (!refreshOnly) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchCryptoData.fulfilled, (state, action) => {
        state.loading = false;
        state.lastRefresh = new Date().toISOString();

        // Merge new data with existing data
        const newData = action.payload;

        // If it's a complete refresh, replace all data
        if (!action.meta.arg.refreshOnly) {
          state.cryptoData = newData;
        } else {
          // For refreshes, update only the coins we fetched
          newData.forEach((newCoin) => {
            const existingIndex = state.cryptoData.findIndex(
              (coin) => coin.symbol === newCoin.symbol
            );
            if (existingIndex >= 0) {
              state.cryptoData[existingIndex] = newCoin;
            } else {
              state.cryptoData.push(newCoin);
            }
          });
        }
      })
      .addCase(fetchCryptoData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { toggleFavorite, updateLivePrice } = cryptoSlice.actions;
export default cryptoSlice.reducer;
