import { configureStore } from "@reduxjs/toolkit";
import weatherReducer from "./slices/weatherSlice";
import newsReducer from './slices/newsSlice';

const store = configureStore({
  reducer: {
    weather: weatherReducer,
    news: newsReducer, 
  },
});

export default store;
