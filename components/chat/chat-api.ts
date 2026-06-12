"use client";

import axios from "axios";

export const CHAT_API_BASE_URL = "https://chat.pupuia.com/api";

export const chatApi = axios.create({
  baseURL: CHAT_API_BASE_URL,
  headers: {
    "Content-Type": "application/json"
  }
});

chatApi.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("auth_token");
    if (token) {
      config.headers["x-auth-token"] = token;
    }
  }
  return config;
});

chatApi.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      window.localStorage.removeItem("auth_token");
      window.localStorage.removeItem("user_data");
    }
    return Promise.reject(error);
  }
);
