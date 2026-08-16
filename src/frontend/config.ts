/// <reference types="vite/client" />

declare const __APP_VERSION__: string | undefined;

export interface AppConfig {
  apiUrl: string;
  isDemo?: boolean;
  version?: string;
}

declare global {
  interface Window {
    __CONFIG__?: AppConfig;
  }
}

let appConfig: AppConfig = {
  apiUrl: '',
  isDemo: false,
  version: typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.3.0',
};

export const fetchConfig = async (): Promise<AppConfig> => {
  // Check build-time environment variables (e.g. Vite dev or build)
  const metaEnv = (import.meta as any).env;
  if (metaEnv) {
    if (metaEnv.GIRAMICHI_API_URL) {
      appConfig.apiUrl = metaEnv.GIRAMICHI_API_URL;
    } else if (metaEnv.VITE_GIRAMICHI_API_URL) {
      appConfig.apiUrl = metaEnv.VITE_GIRAMICHI_API_URL;
    } else if (metaEnv.VITE_API_URL) {
      appConfig.apiUrl = metaEnv.VITE_API_URL;
    }
    if (metaEnv.VITE_APP_VERSION) {
      appConfig.version = metaEnv.VITE_APP_VERSION;
    }
    if (metaEnv.VITE_DEMO === 'true' || metaEnv.VITE_DEMO === '1' || metaEnv.DEMO === 'true') {
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
    if (window.__CONFIG__.version) {
      appConfig.version = window.__CONFIG__.version;
    }
  }

  if (!appConfig.apiUrl) {
    throw new Error('GIRAMICHI_API_URL is not defined. Please set the GIRAMICHI_API_URL environment variable.');
  }

  return appConfig;
};

export const getDashboardVersion = (): string => {
  if (appConfig.version) {
    return appConfig.version;
  }
  if (typeof __APP_VERSION__ !== 'undefined') {
    return __APP_VERSION__;
  }
  const metaEnv = (import.meta as any).env;
  if (metaEnv?.VITE_APP_VERSION) {
    return metaEnv.VITE_APP_VERSION;
  }
  if (typeof window !== 'undefined' && window.__CONFIG__?.version) {
    return window.__CONFIG__.version;
  }
  return '0.3.0';
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
