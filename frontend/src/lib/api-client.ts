export interface ApiResponse<T> {
  success: true;
  data: T;
  meta?: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: { field: string; issue: string }[];
  };
}

class ApiClient {
  private baseUrl: string;
  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Import store dynamically or lazy to avoid circular deps if needed
    // Assuming we can use it directly
    if (typeof window !== "undefined") {
      const { useAuthStore } = require("../stores/auth-store");
      const token = useAuthStore.getState().accessToken;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  }

  private onRefreshed(token: string) {
    this.refreshSubscribers.forEach((cb) => cb(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(cb: (token: string) => void) {
    this.refreshSubscribers.push(cb);
  }

  private async handleRequest(url: string, options: RequestInit): Promise<Response> {
    const res = await fetch(url, options);
    
    if (res.status === 401 && !url.includes("/auth/refresh")) {
      if (!this.isRefreshing) {
        this.isRefreshing = true;
        try {
          const { useAuthStore } = require("../stores/auth-store");
          const currentRefreshToken = useAuthStore.getState().refreshToken;

          if (!currentRefreshToken) {
            useAuthStore.getState().clearAuth();
            throw new Error("No refresh token available");
          }

          const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh_token: currentRefreshToken }),
          });
          
          if (!refreshRes.ok) {
            useAuthStore.getState().clearAuth();
            throw await refreshRes.json();
          }
          
          const data = await refreshRes.json();
          const tokens = data.tokens || data.data?.tokens;
          const newAccessToken = tokens?.access_token || data.access_token;
          const newRefreshToken = tokens?.refresh_token || data.refresh_token || currentRefreshToken;
          const currentUser = useAuthStore.getState().user;

          if (currentUser && newAccessToken) {
            useAuthStore.getState().setAuth(currentUser, newAccessToken, newRefreshToken);
          }
          
          this.isRefreshing = false;
          this.onRefreshed(newAccessToken);
          
          // Retry with new token
          const newHeaders = { ...options.headers, Authorization: `Bearer ${newAccessToken}` };
          return fetch(url, { ...options, headers: newHeaders });
        } catch (error) {
          this.isRefreshing = false;
          this.refreshSubscribers = [];
          throw error;
        }
      } else {
        return new Promise(resolve => {
          this.addRefreshSubscriber(token => {
            const newHeaders = { ...options.headers, Authorization: `Bearer ${token}` };
            resolve(fetch(url, { ...options, headers: newHeaders }));
          });
        });
      }
    }
    
    return res;
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await this.handleRequest(`${this.baseUrl}${endpoint}`, {
      method: "GET",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ success: false, error: { message: "Network error" } }));
      throw err;
    }
    return res.json();
  }

  async post<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await this.handleRequest(`${this.baseUrl}${endpoint}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ success: false, error: { message: "Network error" } }));
      throw err;
    }
    return res.json();
  }

  async patch<T>(endpoint: string, data?: unknown): Promise<ApiResponse<T>> {
    const res = await this.handleRequest(`${this.baseUrl}${endpoint}`, {
      method: "PATCH",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ success: false, error: { message: "Network error" } }));
      throw err;
    }
    return res.json();
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const res = await this.handleRequest(`${this.baseUrl}${endpoint}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });
    if (!res.ok) {
      const err: ApiError = await res.json().catch(() => ({ success: false, error: { message: "Network error" } }));
      throw err;
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();

export const getImageUrl = (url?: string | null): string => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:") || url.startsWith("blob:")) {
    return url;
  }
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081/api/v1";
  const host = baseUrl.replace(/\/api\/v1\/?$/, "");
  
  if (url.startsWith("/")) {
    return `${host}${url}`;
  }
  
  return `${host}/${url}`;
};
