"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";
import { LogIn } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<{ user: any; tokens: { access_token: string; refresh_token: string } }>("/auth/login", formData);
      setAuth(res.data.user, res.data.tokens.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.error?.message || "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-3 sm:p-6 w-full">
      <div className="max-w-md w-full bg-card rounded-2xl p-5 sm:p-8 border border-border shadow-2xl my-auto">
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center text-white font-black text-2xl mx-auto mb-3 shadow-lg shadow-accent/20">
            G
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground tracking-tight">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1">Log in to your GoFlow account</p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-accent/10 border border-accent/40 rounded-xl text-accent text-xs sm:text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-medium text-foreground-secondary mb-1.5">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-3.5 py-2.5 sm:py-3 bg-canvas border border-border rounded-xl text-foreground focus:outline-none focus:border-accent text-sm min-h-[44px] transition-colors"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs sm:text-sm font-medium text-foreground-secondary">Password</label>
              <Link href="/password-reset" className="text-xs text-accent hover:underline">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              className="w-full px-3.5 py-2.5 sm:py-3 bg-canvas border border-border rounded-xl text-foreground focus:outline-none focus:border-accent text-sm min-h-[44px] transition-colors"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] flex items-center justify-center gap-2 shadow-sm text-sm"
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <LogIn size={16} />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-foreground-secondary text-xs sm:text-sm">
          Don't have an account?{" "}
          <Link href="/register" className="text-accent font-semibold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
