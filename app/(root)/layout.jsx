"use client";

import { Provider } from "react-redux";
import store from "@/redux/store";
import { Toaster } from "@/components/ui/toast";

export default function RootGroupLayout({ children }) {
  return (
    <Provider store={store}>
        {children}
        <Toaster />
    </Provider>
  );
}
