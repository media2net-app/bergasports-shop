"use client";

import { createContext, useContext, type ReactNode } from "react";

import { INSTAGRAM_URL } from "@/lib/site-content";

const InstagramProfileContext = createContext(INSTAGRAM_URL);

export function InstagramProfileProvider({
  url,
  children,
}: {
  url: string;
  children: ReactNode;
}) {
  return (
    <InstagramProfileContext.Provider value={url || INSTAGRAM_URL}>{children}</InstagramProfileContext.Provider>
  );
}

export function useInstagramProfileUrl() {
  return useContext(InstagramProfileContext);
}
