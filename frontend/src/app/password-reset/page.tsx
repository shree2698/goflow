"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, CheckCircle } from "lucide-react";

export default function PasswordResetPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      setSubmitted(true);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex items-center justify-center p-4 sm:p-6 w-full">
      <div className="max-w-md w-full bg-canvas rounded-3xl p-6 sm:p-10 shadow-neu-flat border border-white/70 my-auto">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-lavender flex items-center justify-center text-white font-black text-2xl mx-auto mb-4 shadow-neu-btn">
            GO
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
            Reset Password
          </h1>
          <p className="text-xs sm:text-sm text-foreground-secondary mt-1 font-medium">
            Enter your email address to receive password reset instructions
          </p>
        </div>

        {submitted ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle size={28} />
            </div>
            <h3 className="text-base font-bold text-foreground">Check your inbox</h3>
            <p className="text-xs text-foreground-secondary leading-relaxed">
              If an account exists for <span className="font-semibold text-foreground">{email}</span>, password reset instructions have been sent.
            </p>
            <div className="pt-4">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-accent hover:underline"
              >
                <ArrowLeft size={14} /> Back to log in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="reset-email" className="block text-xs font-bold uppercase tracking-wider text-foreground-secondary mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground-secondary" />
                <input
                  id="reset-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-10 pr-4 py-3 bg-canvas rounded-xl shadow-neu-pressed text-sm text-foreground placeholder:text-foreground-secondary/60 focus:outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-accent text-white font-bold text-sm shadow-neu-btn hover:brightness-105 active:shadow-neu-btn-active transition-all"
            >
              Send Reset Instructions
            </button>

            <div className="text-center pt-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 text-xs font-semibold text-foreground-secondary hover:text-foreground transition-colors"
              >
                <ArrowLeft size={14} /> Back to log in
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
