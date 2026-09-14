import axios from 'axios';
import { registerAxiosInstance } from './interceptors';

const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  // Fallback para desarrollo en red local (IPs privadas numéricas)
  if (typeof window !== 'undefined' && window.location.hostname) {
    const host = window.location.hostname;
    const isLocalIp = /^(\d{1,3}\.){3}\d{1,3}$/.test(host) && host !== '127.0.0.1';
    if (isLocalIp) {
      return `http://${host}:3000`;
    }
  }

  return 'http://localhost:3000';
};

const BASE_URL = getBaseURL();
const API_BASE_URL = `${BASE_URL}/api`;

export const novenaApi = axios.create({
  baseURL: API_BASE_URL,
});

// Registrar la instancia para aplicar interceptores
registerAxiosInstance(novenaApi);

