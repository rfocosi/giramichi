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
  // Check VITE_DEMO environment variable
  const metaEnv = (import.meta as any).env;
  if (metaEnv && (metaEnv.VITE_DEMO === 'true' || metaEnv.VITE_DEMO === '1')) {
    appConfig.isDemo = true;
  }

  // If window.__CONFIG__ has values, use them
  if (typeof window !== 'undefined' && window.__CONFIG__) {
    if (window.__CONFIG__.apiUrl) {
      appConfig.apiUrl = window.__CONFIG__.apiUrl;
    }
    if (typeof window.__CONFIG__.isDemo === 'boolean') {
      appConfig.isDemo = window.__CONFIG__.isDemo;
    }
  }

  // Fetch dynamic runtime config from /api/config
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.config?.apiUrl === 'string') {
        appConfig.apiUrl = data.config.apiUrl;
      }
      if (data.success && typeof data.config?.isDemo === 'boolean') {
        appConfig.isDemo = appConfig.isDemo || data.config.isDemo;
      }
    }
  } catch (err) {
    // Ignore fetch error if server is non-relative
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
