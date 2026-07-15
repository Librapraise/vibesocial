import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseBrowser, useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, Zap, Eye, EyeOff } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function Login() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "admin") {
        navigate(createPageUrl("AdminDashboard"));
      } else {
        navigate(createPageUrl("Home"));
      }
    }
  }, [isAuthenticated, user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error: authError } = await supabaseBrowser.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    // Navigation is handled automatically by the useEffect once isAuthenticated changes
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-pink-600 rounded-2xl shadow-lg shadow-orange-500/25 mb-4">
            <Zap className="w-7 h-7 text-white" fill="white" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Vibe<span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">Social</span>
          </h1>
          <p className="text-zinc-500 mt-1.5 text-sm">Sign in to see what's lit tonight</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="login-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="bg-zinc-800/60 border-zinc-700 text-white pl-10 h-11 rounded-xl placeholder:text-zinc-600 focus-visible:ring-orange-500/40 focus-visible:border-orange-500/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="bg-zinc-800/60 border-zinc-700 text-white pl-10 pr-10 h-11 rounded-xl placeholder:text-zinc-600 focus-visible:ring-orange-500/40 focus-visible:border-orange-500/60"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              id="login-submit"
              type="submit"
              disabled={loading || !form.email || !form.password}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">
              Don't have an account?{" "}
              <Link
                to={createPageUrl("Register")}
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Create one free
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-zinc-700 text-xs mt-6">
          By signing in, you agree to our{" "}
          <Link to={createPageUrl("TermsOfService")} className="text-zinc-600 hover:text-zinc-500">
            Terms of Service
          </Link>
        </p>
      </div>
    </div>
  );
}
