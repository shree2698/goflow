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
          const refreshRes = await fetch(`${this.baseUrl}/auth/refresh`, {
            method: "POST",
            headers: { "Content-Type": "application/json" }
            // assuming credentials: "include" if refresh token is in cookies
            // or if we have to send it, but we said refresh token flow
          });
          
          if (!refreshRes.ok) {
            const { useAuthStore } = require("../stores/auth-store");
            useAuthStore.getState().clearAuth();
            throw await refreshRes.json();
          }
          
          const data = await refreshRes.json();
          const { useAuthStore } = require("../stores/auth-store");
          useAuthStore.getState().setAuth(data.data.user, data.data.access_token);
          
          this.isRefreshing = false;
          this.onRefreshed(data.data.access_token);
          
          // Retry with new token
          const newHeaders = { ...options.headers, Authorization: `Bearer ${data.data.access_token}` };
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
