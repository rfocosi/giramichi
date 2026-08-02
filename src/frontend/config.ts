/// <reference types="vite/client" />

export interface AppConfig {
  apiUrl: string;
  isDemo?: boolean;
}

declare global {
  interface Window {
    __CONFIG__?: AppConfig;
  }
}

let appConfig: AppConfig = {
  apiUrl: '',
  isDemo: false,
};

export const fetchConfig = async (): Promise<AppConfig> => {
  // Check build-time environment variables (e.g. Vite dev or build)
  const metaEnv = (import.meta as any).env;
  if (metaEnv) {
    if (metaEnv.VITE_GIRAMICHI_API_URL) {
      appConfig.apiUrl = metaEnv.VITE_GIRAMICHI_API_URL;
    } else if (metaEnv.VITE_API_URL) {
      appConfig.apiUrl = metaEnv.VITE_API_URL;
    }
    if (metaEnv.VITE_DEMO === 'true' || metaEnv.VITE_DEMO === '1') {
      appConfig.isDemo = true;
    }
  }

  // Check runtime configuration injected by frontend image (window.__CONFIG__ from /config.js)
  if (typeof window !== 'undefined' && window.__CONFIG__) {
    if (window.__CONFIG__.apiUrl) {
      appConfig.apiUrl = window.__CONFIG__.apiUrl;
    }
    if (typeof window.__CONFIG__.isDemo === 'boolean') {
      appConfig.isDemo = window.__CONFIG__.isDemo;
    }
  }

  if (!appConfig.apiUrl) {
    throw new Error('GIRAMICHI_API_URL is not defined. Please set the GIRAMICHI_API_URL environment variable.');
  }

  return appConfig;
};

export const isDemoMode = (): boolean => {
  const metaEnv = (import.meta as any).env;
  if (metaEnv && (metaEnv.VITE_DEMO === 'true' || metaEnv.VITE_DEMO === '1')) {
    return true;
  }
  return Boolean(appConfig.isDemo || (typeof window !== 'undefined' && window.__CONFIG__?.isDemo));
};

export const getApiUrl = (): string => {
  if (!appConfig.apiUrl) {
    throw new Error('GIRAMICHI_API_URL is not defined. Please set the GIRAMICHI_API_URL environment variable.');
  }
  return appConfig.apiUrl.replace(/\/+$/, '');
};

export const buildApiUrl = (path: string): string => {
  const base = getApiUrl();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
};
