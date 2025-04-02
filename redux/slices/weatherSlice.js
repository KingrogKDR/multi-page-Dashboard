import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const defaultCities = ["New York", "London", "Tokyo"];

const loadFavorites = () => {
  if (typeof window !== "undefined") {
    try {
      const favoritesJson = localStorage.getItem("favoriteWeatherCities");
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
      localStorage.setItem("favoriteWeatherCities", JSON.stringify(favorites));
    } catch (error) {
      console.error("Error saving favorites to localStorage:", error);
    }
  }
};

export const fetchWeatherData = createAsyncThunk(
  "weather/fetchWeather",
  async (
    { searchedCity = null, refreshOnly = false },
    { rejectWithValue, getState }
  ) => {
    try {
      const state = getState();
      const favorites = state.weather.favorites;

      let citiesToFetch;

      if (refreshOnly) {
        citiesToFetch = state.weather.weatherData.map((city) => city.name);
      } else if (searchedCity && !defaultCities.includes(searchedCity)) {
        citiesToFetch = [searchedCity, ...defaultCities];
      } else {
        citiesToFetch = defaultCities;
      }

      favorites.forEach((fav) => {
        if (!citiesToFetch.includes(fav)) {
          citiesToFetch.push(fav);
        }
      });

      const weatherPromises = citiesToFetch.map(async (city) => {
        try {
          const geoRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?q=${city}&limit=1&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
          );

          if (geoRes.data.length === 0) {
            return {
              name: city,
              error: "City not found",
              isFavorite: favorites.includes(city),
            };
          }

          const { lat, lon } = geoRes.data.coord;

          const currentWeatherRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
          );

          const forecastRes = await axios.get(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY}`
          );

          const dailyTemps = [];
          const dailyLabels = [];

          let lastDate = "";
          forecastRes.data.list.forEach((item) => {
            const itemDate = item.dt_txt.split(" ")[0];

            if (itemDate !== lastDate && dailyTemps.length < 5) {
              dailyTemps.push(item.main.temp);
              const date = new Date(item.dt * 1000);
              dailyLabels.push(
                date.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })
              );

              lastDate = itemDate;
            }
          });

          return {
            name: city,
            displayName: geoRes.data.name,
            temp: currentWeatherRes.data.main.temp,
            humidity: currentWeatherRes.data.main.humidity,
            condition: currentWeatherRes.data.weather[0].description,
            iconCode: currentWeatherRes.data.weather[0].icon,
            isFavorite: favorites.includes(city),
            lastUpdated: new Date().toISOString(),
            forecast: {
              temps: dailyTemps,
              labels: dailyLabels,
            },
          };
        } catch (error) {
          rejectWithValue(`Error fetching weather for ${city}:`, error.message);
          // Return partial data if we already have this city in state
          const existingData = getState().weather.weatherData.find(
            (w) => w.name === city
          );
          if (existingData) {
            return {
              ...existingData,
              error: `Failed to update: ${error.message}`,
              stale: true,
              isFavorite: favorites.includes(city),
            };
          }

          // Otherwise return an error object
          return {
            name: city,
            error: error.message,
            isFavorite: favorites.includes(city),
          };
        }
      });

      const weatherData = await Promise.all(weatherPromises);
      return weatherData;
    } catch (error) {
      return rejectWithValue(
        error.response?.data || "Error fetching weather data"
      );
    }
  }
);

const weatherSlice = createSlice({
  name: "weather",
  initialState: {
    weatherData: [],
    loading: false,
    error: null,
    favorites: loadFavorites(),
    lastRefresh: null,
  },
  reducers: {
    toggleFavorite: (state, action) => {
      const cityName = action.payload;

      if (state.favorites.includes(cityName)) {
        state.favorites = state.favorites.filter((city) => city !== cityName);
      } else {
        state.favorites.push(cityName);
      }

      state.weatherData = state.weatherData.map((city) => {
        if (city.name === cityName) {
          return { ...city, isFavorite: !city.isFavorite };
        }
        return city;
      });

      saveFavorites(state.favorites);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchWeatherData.pending, (state, action) => {
        // Only show loading indicator for initial loads, not refreshes
        const { refreshOnly } = action.meta.arg || {};
        if (!refreshOnly) {
          state.loading = true;
        }
        state.error = null;
      })
      .addCase(fetchWeatherData.fulfilled, (state, action) => {
        state.loading = false;
        state.lastRefresh = new Date().toISOString();

        // Merge new data with existing data
        const newData = action.payload;

        // If it's a complete refresh, replace all data
        if (!action.meta.arg.refreshOnly) {
          state.weatherData = newData;
        } else {
          // For refreshes, update only the cities we fetched
          newData.forEach((newCity) => {
            const existingIndex = state.weatherData.findIndex(
              (city) => city.name === newCity.name
            );
            if (existingIndex >= 0) {
              state.weatherData[existingIndex] = newCity;
            } else {
              state.weatherData.push(newCity);
            }
          });
        }
      })
      .addCase(fetchWeatherData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { toggleFavorite } = weatherSlice.actions;
export default weatherSlice.reducer;
