export interface AppConfig {
  apiUrl: string;
}

declare global {
  interface Window {
    __CONFIG__?: AppConfig;
  }
}

let appConfig: AppConfig = {
  apiUrl: '',
};

export const fetchConfig = async (): Promise<AppConfig> => {
  // If window.__CONFIG__ has a non-empty apiUrl, use it
  if (typeof window !== 'undefined' && window.__CONFIG__?.apiUrl) {
    appConfig.apiUrl = window.__CONFIG__.apiUrl;
  }

  // Fetch dynamic runtime config from /api/config
  try {
    const res = await fetch('/api/config');
    if (res.ok) {
      const data = await res.json();
      if (data.success && typeof data.config?.apiUrl === 'string') {
        appConfig.apiUrl = data.config.apiUrl;
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
