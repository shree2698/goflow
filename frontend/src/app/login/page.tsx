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
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 w-full">
      <div className="max-w-md w-full bg-canvas rounded-3xl p-6 sm:p-10 shadow-neu-flat border border-white/70 my-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-neu-btn">
            GO
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">Welcome Back</h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1 font-medium">Log in to your GoFlow account</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-canvas shadow-neu-pressed rounded-2xl text-pink text-xs sm:text-sm font-semibold border border-pink/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-foreground-secondary mb-1.5">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-canvas shadow-neu-pressed rounded-2xl text-foreground focus:outline-none text-sm min-h-[46px] transition-all"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="block text-xs sm:text-sm font-semibold text-foreground-secondary">Password</label>
              <Link href="/password-reset" className="text-xs text-lavender hover:underline font-semibold">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-canvas shadow-neu-pressed rounded-2xl text-foreground focus:outline-none text-sm min-h-[46px] transition-all"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-accent to-lavender hover:opacity-95 text-white font-bold rounded-2xl shadow-neu-btn active:shadow-neu-btn-active transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[46px] flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <span>Logging in...</span>
            ) : (
              <>
                <LogIn size={18} />
                <span>Log In</span>
              </>
            )}
          </button>
        </form>

        <p className="mt-8 text-center text-foreground-secondary text-xs sm:text-sm font-medium">
          Don't have an account?{" "}
          <Link href="/register" className="text-accent font-bold hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
