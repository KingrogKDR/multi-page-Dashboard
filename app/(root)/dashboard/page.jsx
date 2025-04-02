"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { motion } from "framer-motion";
import WeatherDetails from "@/components/WeatherDetails";
import NewsApp from "@/components/NewsDetails";
import CryptoDetails from "@/components/CryptoDetails";

export default function Dashboard() {
  const [selectedTab, setSelectedTab] = useState("weather");

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

        {selectedTab === "crypto" && <CryptoDetails />}

        {selectedTab === "news" && <NewsApp />}
      </motion.div>
    </div>
  );
}
