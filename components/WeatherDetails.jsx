import React, { useEffect, useState, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { fetchWeatherData, toggleFavorite } from "@/redux/slices/weatherSlice";
import { Star, StarOff, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

const REFRESH_INTERVAL = 60000; // 60 seconds

const WeatherDetails = () => {
  const dispatch = useDispatch();
  const { weatherData, loading, error, lastRefresh } = useSelector(
    (state) => state.weather
  );
  const [city, setCity] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Function to load initial data
  const loadInitialData = useCallback(() => {
    dispatch(fetchWeatherData({}));
  }, [dispatch]);

  // Function to refresh data
  const refreshData = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchWeatherData({ refreshOnly: true }))
      .then((result) => {
        if (result.payload) {
          const failedCities = result.payload
            .filter((city) => city.error)
            .map((city) => city.name);

          if (failedCities.length > 0) {
            toast.error("Some updates failed", {
              description: `Could not refresh: ${failedCities.join(", ")}`,
            });
          } else {
            toast.success("Weather updated", {
              description: "Successfully refreshed weather data",
            });
          }
        }
      })
      .catch(() => {
        toast.error("Refresh failed", {
          description: "Could not update weather data",
        });
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [dispatch]);

  // Initial data loading
  useEffect(() => {
    loadInitialData();

    // Set up periodic refresh
    const intervalId = setInterval(() => {
      refreshData();
    }, REFRESH_INTERVAL);

    // Clean up on unmount
    return () => clearInterval(intervalId);
  }, [loadInitialData, refreshData]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (city.trim()) {
      dispatch(fetchWeatherData({ searchedCity: city.trim() })).then(
        (result) => {
          const cityData = result.payload?.find(
            (c) => c.name.toLowerCase() === city.trim().toLowerCase()
          );

          if (cityData && cityData.error) {
            toast.error("City not found", {
              description: `Could not find weather data for ${city}`,
            });
          } else if (cityData) {
            toast.success("City added", {
              description: `Added ${
                cityData.displayName || cityData.name
              } to your weather dashboard`,
            });
          }
        }
      );
      setCity("");
    }
  };

  const handleToggleFavorite = (cityName) => {
    const cityData = weatherData.find((c) => c.name === cityName);

    dispatch(toggleFavorite(cityName));

    if (cityData) {
      const displayName = cityData.displayName || cityData.name;
      const isFavorite = cityData.isFavorite;

      if (isFavorite) {
        toast.info("Removed from favorites", {
          description: `${displayName} has been removed from your favorites`,
        });
      } else {
        toast.success("Added to favorites", {
          description: `${displayName} has been added to your favorites`,
        });
      }
    }
  };

  // Filter data into favorites and non-favorites
  const favoriteWeather = weatherData.filter((city) => city.isFavorite);
  const otherWeather = weatherData.filter((city) => !city.isFavorite);

  // Format time since last refresh
  const getTimeSinceRefresh = () => {
    if (!lastRefresh) return "Never";

    const lastRefreshDate = new Date(lastRefresh);
    const now = new Date();
    const diffInSeconds = Math.floor((now - lastRefreshDate) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds} seconds ago`;
    if (diffInSeconds < 3600)
      return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    return `${Math.floor(diffInSeconds / 3600)} hours ago`;
  };

  // Weather card component to avoid repetition
  const WeatherCard = ({ weather }) => (
    <div
      key={weather.name}
      className={`p-4 rounded-lg shadow ${
        weather.error ? "bg-red-50" : "bg-gray-100"
      } ${weather.stale ? "border border-orange-300" : ""}`}
    >
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-bold">
          {weather.displayName || weather.name}
        </h3>
        <Button
          variant="ghost"
          className="p-1 h-8 w-8"
          onClick={() => handleToggleFavorite(weather.name)}
          aria-label={
            weather.isFavorite ? "Remove from favorites" : "Add to favorites"
          }
        >
          {weather.isFavorite ? (
            <Star className="text-yellow-500" size={20} />
          ) : (
            <StarOff size={20} />
          )}
        </Button>
      </div>

      {weather.error ? (
        <div className="text-red-500 mt-2 flex items-center">
          <AlertTriangle size={16} className="mr-1" />
          {weather.error}
        </div>
      ) : (
        <>
          <div className="flex items-center my-2">
            {weather.iconCode && (
              <img
                src={`https://openweathermap.org/img/wn/${weather.iconCode}@2x.png`}
                alt={weather.condition}
                className="w-12 h-12"
              />
            )}
            <div>
              <p className="text-2xl font-semibold">
                {Math.round(weather.temp)}°C
              </p>
              <p className="capitalize">{weather.condition}</p>
            </div>
          </div>

          <p>Humidity: {weather.humidity}%</p>
          {weather.stale && (
            <p className="text-orange-500 text-sm mt-1">
              Using stale data - refresh failed
            </p>
          )}

          {weather.forecast && (
            <div className="mt-4">
              <h4 className="text-md font-semibold mb-2">5-Day Forecast</h4>
              <Line
                data={{
                  labels: weather.forecast.labels,
                  datasets: [
                    {
                      label: "Temperature (°C)",
                      data: weather.forecast.temps,
                      borderColor: "#007bff",
                      backgroundColor: "rgba(0, 123, 255, 0.1)",
                      fill: true,
                      tension: 0.1,
                    },
                  ],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: true,
                  plugins: {
                    legend: {
                      display: false,
                    },
                    tooltip: {
                      callbacks: {
                        label: function (context) {
                          return `${Math.round(context.raw)}°C`;
                        },
                      },
                    },
                  },
                  scales: {
                    y: {
                      title: {
                        display: true,
                        text: "°C",
                      },
                    },
                  },
                }}
              />
            </div>
          )}
        </>
      )}
    </div>
  );

  if (loading && weatherData.length === 0) {
    return <div className="p-4 text-center">Loading weather data...</div>;
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Weather Details</h2>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">
            Last updated: {getTimeSinceRefresh()}
          </span>
          <Button
            size="sm"
            variant="outline"
            onClick={refreshData}
            disabled={refreshing}
            className="flex items-center"
          >
            <RefreshCw
              size={16}
              className={`mr-1 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      <form onSubmit={handleSearch} className="flex space-x-2 mb-4">
        <Input
          type="text"
          placeholder="Enter city name"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <Button
          type="submit"
          className="bg-blue-500 text-white"
          disabled={loading}
        >
          Search
        </Button>
      </form>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
          Error: {error}
        </div>
      )}

      {/* Favorites Section */}
      {favoriteWeather.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Star className="text-yellow-500 mr-2" size={18} />
            Favorite Locations
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteWeather.map((weather) => (
              <WeatherCard key={weather.name} weather={weather} />
            ))}
          </div>
        </div>
      )}

      {/* Other Weather Section */}
      <div>
        {favoriteWeather.length > 0 && (
          <h3 className="text-lg font-semibold mb-3">Other Locations</h3>
        )}
        {weatherData.length === 0 ? (
          <div className="text-center p-4">No weather data available</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherWeather.map((weather) => (
              <WeatherCard key={weather.name} weather={weather} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WeatherDetails;
