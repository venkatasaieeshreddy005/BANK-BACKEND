import axios from "axios";

// Automatically switch between localhost and your live Render backend URL
const baseURL = window.location.hostname === "localhost"
  ? "http://localhost:3000/api"
  : "https://vaulta-uani.onrender.com/api";

const api = axios.create({
  baseURL: baseURL, 
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;