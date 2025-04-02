"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";
import WeatherDetails from "@/components/WeatherDetails";
import NewsApp from "@/components/NewsDetails";

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState("weather");
  const [cryptoData, setCryptoData] = useState(null);
  const [newsData, setNewsData] = useState(null);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Dashboard</h1>
      <div className="flex space-x-4 mb-6">
        {["weather", "crypto", "news"].map((tab) => (
          <Button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={
              selectedTab === tab
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-700"
            }
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Button>
        ))}
      </div>

      <motion.div
        key={selectedTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
      >
        {selectedTab === "weather" && <WeatherDetails />}

        {selectedTab === "crypto" && (
          <Card>
            <CardContent className="p-4">
              {cryptoData ? (
                <div>
                  {cryptoData.map((crypto) => (
                    <div key={crypto.name} className="mb-2">
                      <h2 className="text-lg font-bold">{crypto.name}</h2>
                      <p>Price: ${crypto.price}</p>
                      <p>24h Change: {crypto.change}%</p>
                      <p>Market Cap: ${crypto.marketCap}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p>Loading...</p>
              )}
            </CardContent>
          </Card>
        )}

        {selectedTab === "news" && <NewsApp />}
      </motion.div>
    </div>
  );
}
