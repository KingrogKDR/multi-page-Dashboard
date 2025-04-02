import React, { useEffect, useState, useCallback, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Line } from "react-chartjs-2";
import "chart.js/auto";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  fetchCryptoData,
  toggleFavorite,
  updateLivePrice,
} from "@/redux/slices/cryptoSlice";
import {
  Star,
  StarOff,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { toast } from "sonner";

const REFRESH_INTERVAL = 300000; 


const WEBSOCKET_RECONNECT_DELAY = 30000; 
const WEBSOCKET_MESSAGE_THROTTLE = 2000; 
const defaultCoins = ["BTC", "ETH", "SOL", "ADA", "DOGE"];

const CryptoDetails = () => {
  const dispatch = useDispatch();
  const { cryptoData, loading, error, lastRefresh } = useSelector(
    (state) => state.crypto
  );
  const [coin, setCoin] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [socket, setSocket] = useState(null);
  const [liveUpdates, setLiveUpdates] = useState({});
  const [isConnecting, setIsConnecting] = useState(false);
  const reconnectTimeoutRef = useRef(null);
  const messageQueueRef = useRef([]);
  const processingIntervalRef = useRef(null);
  const lastReconnectAttemptRef = useRef(0);

  // Load initial data
  const loadInitialData = useCallback(() => {
    dispatch(fetchCryptoData({}));
  }, [dispatch]);

  // Process queued WebSocket messages at a controlled rate
  const setupMessageProcessing = useCallback(() => {
    // Clear any existing interval
    if (processingIntervalRef.current) {
      clearInterval(processingIntervalRef.current);
    }

    // Set up new interval to process messages
    processingIntervalRef.current = setInterval(() => {
      if (messageQueueRef.current.length === 0) return;

      // Take all current messages and process them as a batch
      const messages = [...messageQueueRef.current];
      messageQueueRef.current = [];

      // Process messages and update state
      const updates = {};

      messages.forEach((message) => {
        try {
          const data = JSON.parse(message);

          Object.entries(data).forEach(([asset, price]) => {
            const symbol = getSymbolFromAsset(asset);
            const numericPrice = parseFloat(price);

            const existingCoin = cryptoData.find(
              (c) =>
                c.id === asset ||
                c.symbol.toLowerCase() === symbol.toLowerCase()
            );

            if (existingCoin && numericPrice) {
              const oldPrice = existingCoin.price;
              const priceChange = numericPrice - oldPrice;
              const priceChangePercent = oldPrice
                ? (priceChange / oldPrice) * 100
                : 0;

              updates[existingCoin.symbol] = {
                price: numericPrice,
                priceChange,
                priceChangePercent,
              };
            }
          });
        } catch (error) {
          console.log("Error processing WebSocket message:", error);
        }
      });

      // Update live prices in state
      if (Object.keys(updates).length > 0) {
        setLiveUpdates((prev) => ({ ...prev, ...updates }));

        // Dispatch updates to Redux store for selected coins
        Object.entries(updates).forEach(([symbol, data]) => {
          dispatch(
            updateLivePrice({
              symbol,
              price: data.price,
              priceChange: data.priceChange,
              priceChangePercent: data.priceChangePercent,
            })
          );
        });
      }
    }, WEBSOCKET_MESSAGE_THROTTLE);

    return () => {
      if (processingIntervalRef.current) {
        clearInterval(processingIntervalRef.current);
      }
    };
  }, [cryptoData, dispatch]);

  // Connect to WebSocket with fewer coins and better error handling
  const connectWebSocket = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnecting) return;

    // Check for rate limiting
    const now = Date.now();
    if (now - lastReconnectAttemptRef.current < WEBSOCKET_RECONNECT_DELAY) {
      console.log("Reconnect attempted too soon, delaying...");
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, WEBSOCKET_RECONNECT_DELAY);

      return;
    }

    lastReconnectAttemptRef.current = now;
    setIsConnecting(true);

    // Close any existing socket
    if (socket) {
      console.log("Closing previous WebSocket connection");
      socket.close();
    }

    // Filter only important coins to reduce WebSocket load
    // Priority: favorites first, then non-error coins, limit to top 5-7 coins
    const priorityCoins = [...cryptoData]
      .filter((crypto) => !crypto.error)
      .sort((a, b) => {
        // Sort by: 1. Favorites, 2. Default coins, 3. Market cap
        if (a.isFavorite && !b.isFavorite) return -1;
        if (!a.isFavorite && b.isFavorite) return 1;

        const aIsDefault = defaultCoins.includes(a.symbol);
        const bIsDefault = defaultCoins.includes(b.symbol);

        if (aIsDefault && !bIsDefault) return -1;
        if (!aIsDefault && bIsDefault) return 1;

        return b.marketCap - a.marketCap;
      })
      .slice(0, 5); // Limit to 5 most important coins

    if (priorityCoins.length === 0) {
      console.log("No valid cryptocurrencies to track");
      setIsConnecting(false);
      return;
    }

    // Create asset string from priority coins
    const assets = priorityCoins
      .map((crypto) => crypto.id?.toLowerCase())
      .filter(Boolean)
      .join(",");

    if (!assets) {
      console.log("No valid asset IDs to track");
      setIsConnecting(false);
      return;
    }

    console.log(`Connecting WebSocket for priority assets: ${assets}`);
    const wsUrl = `wss://ws.coincap.io/prices?assets=${assets}`;
    const newSocket = new WebSocket(wsUrl);

    // Clear message queue
    messageQueueRef.current = [];

    newSocket.onopen = () => {
      console.log("CoinCap WebSocket Connected");
      setIsConnecting(false);

      toast.success("Live updates connected", {
        description: `Receiving price updates for ${priorityCoins.length} cryptocurrencies`,
        duration: 3000,
      });
    };

    newSocket.onmessage = (event) => {
      // Queue messages instead of processing immediately
      messageQueueRef.current.push(event.data);
    };

    newSocket.onclose = (event) => {
      console.log("WebSocket closed:", event);
      setIsConnecting(false);

      if (!navigator.onLine) {
        console.log("No internet connection. Will reconnect when online.");
        return;
      }

      // Schedule reconnection with delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, WEBSOCKET_RECONNECT_DELAY);
    };

    newSocket.onerror = (error) => {
      console.error("WebSocket Error:", error);
      setIsConnecting(false);

      // Only show toast for persistent errors, not transient ones
      if (newSocket.readyState === WebSocket.CLOSED) {
        toast.error("Live updates disconnected", {
          description: "Will attempt to reconnect shortly...",
          duration: 5000,
        });
      }

      // Close socket if still open
      if (newSocket.readyState === WebSocket.OPEN) {
        newSocket.close();
      }

      // Schedule reconnection with increased delay
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }

      reconnectTimeoutRef.current = setTimeout(() => {
        connectWebSocket();
      }, WEBSOCKET_RECONNECT_DELAY * 2); // Double delay after error
    };

    setSocket(newSocket);
  }, [cryptoData, isConnecting, socket]);

  // Map coinCap asset names to symbols
  const getSymbolFromAsset = (asset) => {
    const mapping = {
      bitcoin: "BTC",
      ethereum: "ETH",
      solana: "SOL",
      cardano: "ADA",
      dogecoin: "DOGE",
      polkadot: "DOT",
      ripple: "XRP",
    };
    return mapping[asset] || asset.toUpperCase();
  };

  // Function to refresh data
  const refreshData = useCallback(() => {
    setRefreshing(true);
    dispatch(fetchCryptoData({ refreshOnly: true }))
      .then((result) => {
        if (result.payload) {
          const failedCoins = result.payload
            .filter((coin) => coin.error)
            .map((coin) => coin.name);

          if (failedCoins.length > 0) {
            toast.error("Some updates failed", {
              description: `Could not refresh: ${failedCoins.join(", ")}`,
            });
          } else {
            toast.success("Crypto data updated", {
              description: "Successfully refreshed cryptocurrency data",
            });
          }

          // Don't automatically reconnect WebSocket after every refresh
          // Only reconnect if it's been closed
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            // Wait before reconnecting
            setTimeout(() => {
              connectWebSocket();
            }, 2000);
          }
        }
      })
      .catch(() => {
        toast.error("Refresh failed", {
          description: "Could not update cryptocurrency data",
        });
      })
      .finally(() => {
        setRefreshing(false);
      });
  }, [dispatch, connectWebSocket, socket]);

  // Initial setup
  useEffect(() => {
    loadInitialData();

    // Set up longer interval for refreshes
    const intervalId = setInterval(() => {
      refreshData();
    }, REFRESH_INTERVAL);

    // Set up message processing
    const cleanupMessageProcessing = setupMessageProcessing();

    // Clean up function
    return () => {
      clearInterval(intervalId);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socket) {
        socket.close();
      }
      cleanupMessageProcessing();
    };
  }, [loadInitialData, refreshData, setupMessageProcessing]);

  // Connect WebSocket when crypto data changes significantly
  useEffect(() => {
    if (
      cryptoData.length > 0 &&
      (!socket || socket.readyState !== WebSocket.OPEN)
    ) {
      // Add delay to prevent rapid reconnections
      const timer = setTimeout(() => {
        connectWebSocket();
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [cryptoData.length, connectWebSocket, socket]);

  // Handle online/offline status
  useEffect(() => {
    const handleOnline = () => {
      console.log("Browser is online, reconnecting WebSocket");
      connectWebSocket();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [connectWebSocket]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (coin.trim()) {
      dispatch(fetchCryptoData({ searchedCoin: coin.trim() })).then((result) => {
        const coinData = result.payload?.find(
          (c) => c.symbol.toLowerCase() === coin.trim().toLowerCase()
        );
  
        if (coinData?.error) {
          toast.error("Coin not found", {
            description: `Could not find data for ${coin}`,
          });
        } else if (coinData) {
          toast.success("Coin added", {
            description: `Added ${coinData.name} to your crypto dashboard`,
          });
  
          setTimeout(() => {
            connectWebSocket();
          }, 2000);
        } else {
          toast.error("Cryptocurrency not found", {
            description: `Could not find cryptocurrency matching "${coin}"`,
          });
        }
      });
  
      setCoin("");
    }
  };

  const handleToggleFavorite = (symbol) => {
    const coinData = cryptoData.find((c) => c.symbol === symbol);

    dispatch(toggleFavorite(symbol));

    if (coinData) {
      const name = coinData.name;
      const isFavorite = coinData.isFavorite;

      if (isFavorite) {
        toast.info("Removed from favorites", {
          description: `${name} has been removed from your favorites`,
        });
      } else {
        toast.success("Added to favorites", {
          description: `${name} has been added to your favorites`,
        });

        // Reconnect to include this favorite in the priority list
        // But delay to avoid rate limiting
        setTimeout(() => {
          connectWebSocket();
        }, 2000);
      }
    }
  };

  const favoriteCrypto = cryptoData.filter((coin) => coin.isFavorite);
  const otherCrypto = cryptoData.filter((coin) => !coin.isFavorite);

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

  const getPriceDisplay = (crypto) => {
    if (liveUpdates[crypto.symbol]) {
      return liveUpdates[crypto.symbol].price.toFixed(2);
    }
    return crypto.price.toFixed(2);
  };

  const get24hChange = (crypto) => {
    if (liveUpdates[crypto.symbol]) {
      return liveUpdates[crypto.symbol].priceChangePercent.toFixed(2);
    }
    return crypto.priceChange24h.toFixed(2);
  };

  const getPriceChangeColor = (change) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-gray-500";
  };

  const CryptoCard = ({ crypto }) => {
    const priceChange = get24hChange(crypto);
    const priceChangeColor = getPriceChangeColor(parseFloat(priceChange));
    const hasLiveData = !!liveUpdates[crypto.symbol];

    return (
      <div
        key={crypto.symbol}
        className={`p-4 rounded-lg shadow ${
          crypto.error ? "bg-red-50" : "bg-gray-100"
        } ${crypto.stale ? "border border-orange-300" : ""} ${
          hasLiveData ? "border-l-4 border-l-green-500" : ""
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center">
            {crypto.logo && (
              <img
                src={crypto.logo}
                alt={crypto.name}
                className="w-8 h-8 mr-2 rounded-full"
              />
            )}
            <div>
              <h3 className="text-lg font-bold">{crypto.name}</h3>
              <p className="text-sm text-gray-500">{crypto.symbol}</p>
            </div>
          </div>
          <Button
            variant="ghost"
            className="p-1 h-8 w-8"
            onClick={() => handleToggleFavorite(crypto.symbol)}
            aria-label={
              crypto.isFavorite ? "Remove from favorites" : "Add to favorites"
            }
          >
            {crypto.isFavorite ? (
              <Star className="text-yellow-500" size={20} />
            ) : (
              <StarOff size={20} />
            )}
          </Button>
        </div>

        {crypto.error ? (
          <div className="text-red-500 mt-2 flex items-center">
            <AlertTriangle size={16} className="mr-1" />
            {crypto.error}
          </div>
        ) : (
          <>
            <div className="flex justify-between items-end my-2">
              <div>
                <p className="text-2xl font-semibold">
                  ${getPriceDisplay(crypto)}
                </p>
                <div className={`flex items-center ${priceChangeColor}`}>
                  {parseFloat(priceChange) > 0 ? (
                    <TrendingUp size={16} className="mr-1" />
                  ) : (
                    <TrendingDown size={16} className="mr-1" />
                  )}
                  <span>{priceChange}%</span>
                  {hasLiveData && (
                    <span className="ml-2 text-xs text-green-500">LIVE</span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Market Cap</p>
                <p className="font-medium">
                  ${(crypto.marketCap / 1000000000).toFixed(2)}B
                </p>
              </div>
            </div>

            {crypto.stale && (
              <p className="text-orange-500 text-sm mt-1">
                Using stale data - refresh failed
              </p>
            )}

            {crypto.priceHistory && (
              <div className="mt-4">
                <h4 className="text-md font-semibold mb-2">
                  Price History (7D)
                </h4>
                <Line
                  data={{
                    labels: crypto.priceHistory.labels,
                    datasets: [
                      {
                        data: crypto.priceHistory.prices,
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
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
                            return `$${context.raw.toFixed(2)}`;
                          },
                        },
                      },
                    },
                    scales: {
                      y: {
                        title: {
                          display: true,
                          text: "USD",
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
  };

  if (loading && cryptoData.length === 0) {
    return (
      <div className="p-4 text-center">Loading cryptocurrency data...</div>
    );
  }

  return (
    <div className="p-4 bg-white shadow rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Cryptocurrency Details</h2>
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
          placeholder="Enter cryptocurrency symbol (e.g., SOL, ADA)"
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
          className="w-full p-2 border rounded"
        />
        <Button
          type="submit"
          className="bg-blue-500 text-white"
          onClick={handleSearch}
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
      {favoriteCrypto.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <Star className="text-yellow-500 mr-2" size={18} />
            Favorite Cryptocurrencies
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {favoriteCrypto.map((crypto) => (
              <CryptoCard key={crypto.symbol} crypto={crypto} />
            ))}
          </div>
        </div>
      )}

      <div>
        {favoriteCrypto.length > 0 && (
          <h3 className="text-lg font-semibold mb-3">Other Cryptocurrencies</h3>
        )}
        {cryptoData.length === 0 ? (
          <div className="text-center p-4">
            No cryptocurrency data available
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {otherCrypto.map((crypto) => (
              <CryptoCard key={crypto.symbol} crypto={crypto} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CryptoDetails;
