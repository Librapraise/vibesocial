import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabaseBrowser } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Lock, User, Zap, Eye, EyeOff, CheckCircle2, ArrowLeft } from "lucide-react";
import { createPageUrl } from "@/utils";
import { cn } from "@/lib/utils";
import logoImg from "@/assets/logo.png";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [done, setDone] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const passwordStrength = () => {
    const p = form.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    return score;
  };

  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-blue-400", "bg-green-400"];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (form.password !== form.confirm) {
      setError("Passwords do not match");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (!acceptedTerms) {
      setError("You must accept the Terms of Service to sign up.");
      return;
    }

    setLoading(true);

    const { error: authError } = await supabaseBrowser.auth.signUp({
      email: form.email.trim(),
      password: form.password,
      options: {
        data: { name: form.name.trim() },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  // Success screen
  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-2">You're in! 🎉</h2>
          <p className="text-zinc-400 mb-8">
            Check your email to confirm your account, then sign in.
          </p>
          <Link to={createPageUrl("Login")}>
            <Button className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl px-8">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const strength = passwordStrength();

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      {/* Back to Home Button */}
      <Link
        to="/"
        className="absolute top-6 left-6 inline-flex items-center gap-2 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-medium transition-all shadow-lg backdrop-blur-md z-50"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Home
      </Link>

      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-2xl mb-4 shadow-lg">
            <img src={logoImg} alt="VibeSocial Logo" className="w-12 h-12 rounded-xl object-cover" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">
            Join <span className="bg-gradient-to-r from-orange-400 to-pink-500 bg-clip-text text-transparent">VibeSocial</span>
          </h1>
          <p className="text-zinc-500 mt-1.5 text-sm">Discover what's lit in your city tonight</p>
        </div>

        {/* Card */}
        <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="register-name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Your full name"
                  required
                  className="bg-zinc-800/60 border-zinc-700 text-white pl-10 h-11 rounded-xl placeholder:text-zinc-600 focus-visible:ring-orange-500/40 focus-visible:border-orange-500/60"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="register-email"
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
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Min 8 characters"
                  required
                  autoComplete="new-password"
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
              {/* Password strength bar */}
              {form.password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={cn(
                          "h-1 flex-1 rounded-full transition-all",
                          i <= strength ? strengthColor[strength] : "bg-zinc-800"
                        )}
                      />
                    ))}
                  </div>
                  <p className={cn("text-xs", strength <= 1 ? "text-red-400" : strength === 2 ? "text-yellow-400" : strength === 3 ? "text-blue-400" : "text-green-400")}>
                    {strengthLabel[strength]} password
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-zinc-300 text-sm font-medium">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="register-confirm"
                  type={showPassword ? "text" : "password"}
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  placeholder="Repeat your password"
                  required
                  autoComplete="new-password"
                  className={cn(
                    "bg-zinc-800/60 border-zinc-700 text-white pl-10 h-11 rounded-xl placeholder:text-zinc-600 focus-visible:ring-orange-500/40",
                    form.confirm && form.confirm !== form.password && "border-red-500/50"
                  )}
                />
              </div>
            </div>
            
            <div className="flex items-start gap-2.5 pt-1">
              <input
                id="register-terms"
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-zinc-700 bg-zinc-800/60 text-orange-500 focus:ring-orange-500/40 focus:ring-offset-zinc-950 focus:ring-2 cursor-pointer"
                required
              />
              <Label htmlFor="register-terms" className="text-zinc-400 text-xs font-normal leading-relaxed select-none cursor-pointer">
                I accept the{" "}
                <Link
                  to={createPageUrl("TermsOfService")}
                  target="_blank"
                  className="text-orange-400 hover:text-orange-300 font-semibold underline transition-colors"
                >
                  Terms of Service
                </Link>{" "}
                and acknowledge the privacy policy.
              </Label>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <Button
              id="register-submit"
              type="submit"
              disabled={loading || !form.name || !form.email || !form.password || !form.confirm || !acceptedTerms}
              className="w-full h-11 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {loading ? "Creating account..." : "Create Free Account"}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-zinc-800 text-center">
            <p className="text-zinc-500 text-sm">
              Already have an account?{" "}
              <Link
                to={createPageUrl("Login")}
                className="text-orange-400 hover:text-orange-300 font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
