"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/stores/auth-store";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    full_name: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiClient.post<{ user: any; tokens: { access_token: string; refresh_token: string } }>("/auth/register", formData);
      setAuth(res.data.user, res.data.tokens.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.error?.message || "An error occurred during registration.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0e090a] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#1a1415] rounded-xl p-8 border border-white/10 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Create an Account</h1>
          <p className="text-gray-400">Join GoFlow today</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-[#e6193c]/10 border border-[#e6193c]/50 rounded-lg text-[#e6193c] text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-[#0e090a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#e6193c] focus:ring-1 focus:ring-[#e6193c] transition-colors"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-[#0e090a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#e6193c] focus:ring-1 focus:ring-[#e6193c] transition-colors"
              placeholder="you@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={8}
              className="w-full px-4 py-3 bg-[#0e090a] border border-white/10 rounded-lg text-white focus:outline-none focus:border-[#e6193c] focus:ring-1 focus:ring-[#e6193c] transition-colors"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-[#e6193c] hover:bg-[#e6193c]/90 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Sign Up"}
          </button>
        </form>

        <p className="mt-6 text-center text-gray-400 text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-[#e6193c] hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
