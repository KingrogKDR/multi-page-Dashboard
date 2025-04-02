import { configureStore } from "@reduxjs/toolkit";
import weatherReducer from "./slices/weatherSlice";
import newsReducer from './slices/newsSlice';
import cryptoReducer from './slices/cryptoSlice';

const store = configureStore({
  reducer: {
    weather: weatherReducer,
    news: newsReducer, 
    crypto: cryptoReducer,
  },
});

export default store;
