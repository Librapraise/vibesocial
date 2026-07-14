import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { 
  Flame, 
  Clock, 
  MapPin, 
  Sparkles, 
  ShieldCheck, 
  ArrowRight, 
  Layers, 
  Compass, 
  ChevronRight, 
  Activity, 
  Zap, 
  Users, 
  Ticket, 
  Martini
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import logoImg from "@/assets/logo.png";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 120,
      damping: 14,
    },
  },
};

const cardHoverVariants = {
  initial: { y: 0, scale: 1, borderColor: "rgba(39, 39, 42, 0.5)", boxShadow: "0 0 0px rgba(236, 72, 153, 0)" },
  hover: {
    y: -10,
    scale: 1.03,
    borderColor: "rgba(236, 72, 153, 0.6)",
    boxShadow: "0 0 25px rgba(236, 72, 153, 0.25), inset 0 0 10px rgba(236, 72, 153, 0.1)",
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 18,
    },
  },
};

const glowVariants = {
  animate1: {
    scale: [1, 1.2, 0.85, 1],
    x: [0, 40, -30, 0],
    y: [0, -40, 30, 0],
    rotate: [0, 90, 180, 360],
    transition: {
      duration: 15,
      repeat: Infinity,
      repeatType: "mirror" as const,
      ease: "linear",
    },
  },
  animate2: {
    scale: [1, 0.8, 1.25, 1],
    x: [0, -50, 40, 0],
    y: [0, 30, -40, 0],
    rotate: [0, -90, -180, -360],
    transition: {
      duration: 18,
      repeat: Infinity,
      repeatType: "mirror" as const,
      ease: "linear",
    },
  },
  animate3: {
    scale: [1, 1.3, 0.9, 1],
    x: [0, 30, -20, 0],
    y: [0, -25, 35, 0],
    transition: {
      duration: 12,
      repeat: Infinity,
      repeatType: "mirror" as const,
      ease: "easeInOut",
    },
  },
};

export default function Landing() {
  const navigate = useNavigate();
  const { loginAsDemo } = useAuth();

  const handleTryDemo = (e: React.MouseEvent) => {
    e.preventDefault();
    loginAsDemo();
    navigate("/Home");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-x-hidden selection:bg-pink-500 selection:text-white relative">
      {/* Futuristic Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f0f11_1px,transparent_1px),linear-gradient(to_bottom,#0f0f11_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none opacity-40"></div>

      {/* Animated glow effects in background */}
      <motion.div 
        variants={glowVariants}
        animate="animate1"
        className="absolute top-0 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-[120px] pointer-events-none"
      ></motion.div>
      <motion.div 
        variants={glowVariants}
        animate="animate2"
        className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[150px] pointer-events-none"
      ></motion.div>
      <motion.div 
        variants={glowVariants}
        animate="animate3"
        className="absolute bottom-10 left-1/3 w-80 h-80 bg-orange-600/5 rounded-full blur-[100px] pointer-events-none"
      ></motion.div>

      {/* Modern Navigation Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 transition duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 font-black text-2xl tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-600">
            <img src={logoImg} alt="VibeSocial Logo" className="w-10 h-10 object-cover rounded-xl shadow-lg shadow-pink-500/20 border border-zinc-800" />
            VibeSocial
          </Link>

          {/* Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition duration-200">Features</a>
            <a href="#how-it-works" className="hover:text-white transition duration-200">How It Works</a>
            <a href="#use-cases" className="hover:text-white transition duration-200">Use Cases</a>
            <Link to="/SubscriptionPlans" className="hover:text-white transition duration-200">Pricing</Link>
          </nav>

          {/* CTAs */}
          <div className="flex items-center gap-4">
            <Link to="/Login">
              <Button variant="ghost" className="text-zinc-300 hover:text-white font-medium">
                Log In
              </Button>
            </Link>
            <Link to="/Register">
              <Button className="bg-gradient-to-r from-orange-500 to-pink-600 hover:from-orange-600 hover:to-pink-700 text-white font-bold px-6 rounded-xl shadow-lg shadow-pink-500/20 transition-all duration-300 hover:scale-105">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section 
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: false, margin: "-100px" }}
        className="relative pt-20 pb-24 md:pt-32 md:pb-36 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center"
      >
        {/* Dynamic Badge */}
        <motion.div 
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 text-zinc-300 text-xs font-semibold mb-8 shadow-inner hover:border-pink-500/30 transition-all duration-300"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Crowdsourcing local vibes in real-time</span>
        </motion.div>

        {/* Main Heading */}
        <motion.h1 
          variants={itemVariants}
          className="text-5xl sm:text-7xl font-black tracking-tight leading-none mb-8 max-w-5xl"
        >
          Know the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-pink-500 to-purple-500">
            Vibe
          </span>{" "}
          Before You{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-500 to-blue-500">
            Go.
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p 
          variants={itemVariants}
          className="text-zinc-400 text-lg sm:text-xl max-w-3xl leading-relaxed mb-12"
        >
          VibeSocial is the premier platform connecting partygoers, lounge lovers, and event organizers. Check crowd levels, wait times, music style, and vibe scores in real-time.
        </motion.p>

        {/* Action Buttons */}
        <motion.div 
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-sm mb-16"
        >
          <Link to="/Home" className="w-full sm:w-auto">
            <Button className="w-full bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-bold py-6 px-8 rounded-xl flex items-center justify-center gap-2 transition duration-300 group shadow-xl">
              Explore Live Venues
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/Register" className="w-full sm:w-auto">
            <Button variant="outline" className="w-full border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900 text-zinc-300 hover:text-white font-bold py-6 px-8 rounded-xl transition duration-300">
              Create Account
            </Button>
          </Link>
        </motion.div>

        {/* Visual Mockup Dashboard Container */}
        <motion.div 
          variants={itemVariants}
          className="w-full max-w-5xl rounded-3xl overflow-hidden border border-zinc-800/80 bg-zinc-900/40 p-4 sm:p-6 backdrop-blur shadow-2xl relative group"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-pink-500/5 via-transparent to-transparent pointer-events-none"></div>
          {/* Card Headers */}
          <div className="flex items-center justify-between border-b border-zinc-800/80 pb-4 mb-6">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-zinc-800"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-zinc-800"></span>
              <span className="w-3.5 h-3.5 rounded-full bg-zinc-800"></span>
            </div>
            <div className="px-4 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800/80 text-xs text-zinc-500 font-mono">
              vibesocial.app/live
            </div>
            <div className="w-12"></div>
          </div>

          {/* Simulated Application UI Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
            {/* Mock Card 1 */}
            <motion.div 
              variants={cardHoverVariants}
              initial="initial"
              whileHover="hover"
              className="p-6 rounded-2xl bg-zinc-950 border flex flex-col justify-between relative overflow-hidden cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-orange-500/10 text-orange-400 text-xs font-semibold uppercase tracking-wider">Lounge</span>
                  <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg text-amber-400 font-black text-sm">
                    <Flame className="w-4 h-4 fill-amber-400" />
                    9.4
                  </div>
                </div>
                <h4 className="font-bold text-zinc-100 text-lg mb-1">Velvet Skyline</h4>
                <p className="text-xs text-zinc-500 mb-4">742 Evergreen Terrace, NY</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Wait Time:</span>
                    <span className="font-semibold text-zinc-200">~15 mins</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Music:</span>
                    <span className="font-semibold text-zinc-200">Acoustic & Wine</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-zinc-900">
                <span className="text-xs text-zinc-500">24 updates tonight</span>
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
              </div>
            </motion.div>

            {/* Mock Card 2 */}
            <motion.div 
              variants={cardHoverVariants}
              initial="initial"
              whileHover="hover"
              className="p-6 rounded-2xl bg-zinc-950 border flex flex-col justify-between relative overflow-hidden cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-pink-500/10 text-pink-400 text-xs font-semibold uppercase tracking-wider">Nightclub</span>
                  <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg text-pink-500 font-black text-sm">
                    <Flame className="w-4 h-4 fill-pink-500" />
                    9.8
                  </div>
                </div>
                <h4 className="font-bold text-zinc-100 text-lg mb-1">Neon Club & Bass</h4>
                <p className="text-xs text-zinc-500 mb-4">456 Dark Alley, IL</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Wait Time:</span>
                    <span className="font-semibold text-pink-500">Packed (~45m wait)</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Music:</span>
                    <span className="font-semibold text-zinc-200">Techno & House</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-zinc-900">
                <span className="text-xs text-zinc-500">92 updates tonight</span>
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span>
              </div>
            </motion.div>

            {/* Mock Card 3 */}
            <motion.div 
              variants={cardHoverVariants}
              initial="initial"
              whileHover="hover"
              className="p-6 rounded-2xl bg-zinc-950 border flex flex-col justify-between relative overflow-hidden cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-start mb-4">
                  <span className="px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-semibold uppercase tracking-wider">Rooftop</span>
                  <div className="flex items-center gap-1.5 bg-zinc-900 px-2.5 py-1 rounded-lg text-purple-400 font-black text-sm">
                    <Flame className="w-4 h-4 fill-purple-400" />
                    8.9
                  </div>
                </div>
                <h4 className="font-bold text-zinc-100 text-lg mb-1">Rooftop Oasis</h4>
                <p className="text-xs text-zinc-500 mb-4">100 Pine Street, CA</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Wait Time:</span>
                    <span className="font-semibold text-emerald-400">No Wait</span>
                  </div>
                  <div className="flex justify-between text-xs text-zinc-400">
                    <span>Music:</span>
                    <span className="font-semibold text-zinc-200">Deep House</span>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-between items-center pt-4 border-t border-zinc-900">
                <span className="text-xs text-zinc-500">42 updates tonight</span>
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </motion.section>

      {/* Core Features Section */}
      <section id="features" className="py-24 bg-zinc-950 border-t border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-20"
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-transparent bg-clip-text bg-gradient-to-r from-zinc-100 to-zinc-400">
              Engineered for the Perfect Night
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              No more guessing if a bar is empty, has a long line, or plays the music you hate.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: false, margin: "-100px" }}
            className="grid grid-cols-1 md:grid-cols-3 gap-8"
          >
            {/* Feature 1 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -10, borderColor: "rgba(249, 115, 22, 0.6)", boxShadow: "0 0 20px rgba(249, 115, 22, 0.2)" }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 transition duration-300 group cursor-pointer"
            >
              <div className="p-3.5 w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 mb-6 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Flame className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Live Vibe Scores</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Crowdsourced ratings create a unified, real-time vibe score representing energy levels, audio quality, and overall crowd sentiment.
              </p>
            </motion.div>

            {/* Feature 2 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -10, borderColor: "rgba(236, 72, 153, 0.6)", boxShadow: "0 0 20px rgba(236, 72, 153, 0.2)" }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 transition duration-300 group cursor-pointer"
            >
              <div className="p-3.5 w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-500 mb-6 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Clock className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Queue & Line Diagnostics</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Instantly check wait times submitted by users currently at the venue. Know before you leave if it is packed, active, or empty.
              </p>
            </motion.div>

            {/* Feature 3 */}
            <motion.div 
              variants={itemVariants}
              whileHover={{ y: -10, borderColor: "rgba(168, 85, 247, 0.6)", boxShadow: "0 0 20px rgba(168, 85, 247, 0.2)" }}
              className="p-8 rounded-3xl bg-zinc-900/50 border border-zinc-800 transition duration-300 group cursor-pointer"
            >
              <div className="p-3.5 w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-500 mb-6 flex items-center justify-center group-hover:scale-110 transition duration-300">
                <Ticket className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-3">Integrated Ticket Purchasing</h3>
              <p className="text-zinc-400 text-sm leading-relaxed">
                Purchase tickets for local events directly through the app. Scan your digital QR ticket at the door for rapid check-ins.
              </p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-24 bg-zinc-900/30 border-t border-zinc-900 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <motion.div
              initial={{ opacity: 0, x: -40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.6 }}
            >
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-8">
                How VibeSocial Works
              </h2>
              <div className="space-y-8">
                {/* Step 1 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 font-bold flex items-center justify-center text-sm">1</div>
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-1">Find Local Hotspots</h4>
                    <p className="text-zinc-400 text-sm">Filter through clubs, rooftop lounges, concert venues, and craft cocktail bars nearby.</p>
                  </div>
                </div>
                {/* Step 2 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-pink-500/20 text-pink-500 font-bold flex items-center justify-center text-sm">2</div>
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-1">Check Live Updates</h4>
                    <p className="text-zinc-400 text-sm">Read the status feed containing real-time photos, wait-time reports, and vibe ratings from real people already inside.</p>
                  </div>
                </div>
                {/* Step 3 */}
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/20 text-purple-500 font-bold flex items-center justify-center text-sm">3</div>
                  <div>
                    <h4 className="font-bold text-zinc-100 mb-1">Join the Party</h4>
                    <p className="text-zinc-400 text-sm">Buy tickets securely with Stripe, head to the venue, and submit your own updates to help other partygoers!</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Visual Flow Representation */}
            <motion.div 
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative p-6 rounded-3xl bg-zinc-900 border border-zinc-800"
            >
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
                  <Activity className="w-5 h-5 text-pink-500 animate-pulse" />
                  <span className="text-sm font-semibold">Generating Real-time Feed...</span>
                </div>
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-500">Alex updated Velvet Lounge</span>
                    <span className="text-xs text-zinc-500 font-mono">1m ago</span>
                  </div>
                  <p className="text-sm text-zinc-300 font-medium">"Line is about 10 people deep. Music is upbeat house, vibes are great!"</p>
                  <div className="flex gap-2 mt-3">
                    <span className="text-xs px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Wait: 10m</span>
                    <span className="text-xs px-2.5 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">Vibe: 9.5</span>
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-orange-500/10 to-pink-500/10 border border-pink-500/20 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-semibold text-zinc-200">Vibe Score updated: 9.2 (Highly Active)</span>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-pink-500 animate-ping"></span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section id="use-cases" className="py-24 bg-zinc-950 border-t border-zinc-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-4">
              Designed for Everyone in the Scene
            </h2>
            <p className="text-zinc-400 max-w-2xl mx-auto text-lg">
              Whether you are going out for a drink or managing the entire dancefloor.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {/* For Partygoers */}
            <motion.div 
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10, borderColor: "rgba(236, 72, 153, 0.5)", boxShadow: "0 0 25px rgba(236, 72, 153, 0.2)" }}
              className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700 transition duration-300 cursor-pointer"
            >
              <div className="p-3 w-12 h-12 rounded-xl bg-pink-500/10 text-pink-500 mb-6 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-3">For Partygoers & Socialites</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Avoid disappointing nights. Scan maps, read crowd sentiments, view pricing, find music matching your mood, purchase tickets, and coordinate meetups effortlessly with friends.
              </p>
              <ul className="space-y-2.5 text-sm text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-pink-500" />
                  Real-time wait times & entry covers
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-pink-500" />
                  Live user feeds & status updates
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-pink-500" />
                  Personalized dashboard & alerts
                </li>
              </ul>
            </motion.div>

            {/* For Organizers */}
            <motion.div 
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: false, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              whileHover={{ y: -10, borderColor: "rgba(249, 115, 22, 0.5)", boxShadow: "0 0 25px rgba(249, 115, 22, 0.2)" }}
              className="p-8 rounded-3xl bg-zinc-900/30 border border-zinc-800/80 hover:border-zinc-700 transition duration-300 cursor-pointer"
            >
              <div className="p-3 w-12 h-12 rounded-xl bg-orange-500/10 text-orange-500 mb-6 flex items-center justify-center">
                <Martini className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-100 mb-3">For Venues & Event Organizers</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-6">
                Fill your venue and build long-term customer loyalty. Publish upcoming concerts or theme nights, sell tickets securely, and moderate your venue's profile in real-time.
              </p>
              <ul className="space-y-2.5 text-sm text-zinc-300 font-medium">
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  List events & manage ticket inventories
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  Stripe-enabled payouts
                </li>
                <li className="flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-orange-500" />
                  Real-time audience analytics & insights
                </li>
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Pricing / Plan Teaser Section */}
      <section className="py-20 bg-zinc-900/40 border-t border-zinc-900 text-center relative">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="max-w-4xl mx-auto px-4"
        >
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight mb-6">
            Ready to Amplify Your Nights?
          </h2>
          <p className="text-zinc-400 text-lg mb-10 max-w-xl mx-auto leading-relaxed">
            Get unlimited access to real-time vibes, premium notifications, and advance ticket pre-sales.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/SubscriptionPlans">
              <Button className="bg-gradient-to-r from-orange-500 via-pink-500 to-purple-600 hover:opacity-90 text-white font-bold px-8 py-6 rounded-xl transition duration-300 hover:scale-105 shadow-xl">
                View Subscription Plans
              </Button>
            </Link>
            <Button variant="ghost" onClick={handleTryDemo} className="text-zinc-400 hover:text-white font-bold py-6 px-8 rounded-xl">
              Try Local Demo Free
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-950 border-t border-zinc-900 pt-16 pb-12 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12 text-left mb-12">
          {/* Brand Info */}
          <div>
            <div className="flex items-center gap-3 font-black text-xl tracking-tight text-white mb-4">
              <img src={logoImg} alt="VibeSocial Logo" className="w-8 h-8 object-cover rounded-lg border border-zinc-800" />
              VibeSocial
            </div>
            <p className="text-zinc-500 text-sm leading-relaxed">
              Making nights out predictable, active, and social through crowdsourced real-time data sharing.
            </p>
          </div>

          {/* Links: Discover */}
          <div>
            <h4 className="font-bold text-zinc-200 mb-4 text-sm uppercase tracking-wider">Discover</h4>
            <ul className="space-y-2.5 text-zinc-500 text-sm">
              <li><Link to="/Home" className="hover:text-zinc-300 transition">Search Venues</Link></li>
              <li><Link to="/UpcomingEvents" className="hover:text-zinc-300 transition">Upcoming Events</Link></li>
              <li><Link to="/PopularTrends" className="hover:text-zinc-300 transition">Trending Spots</Link></li>
              <li><Link to="/Leaderboard" className="hover:text-zinc-300 transition">Vibe Rankings</Link></li>
            </ul>
          </div>

          {/* Links: Resources */}
          <div>
            <h4 className="font-bold text-zinc-200 mb-4 text-sm uppercase tracking-wider">Company</h4>
            <ul className="space-y-2.5 text-zinc-500 text-sm">
              <li><Link to="/HelpCenter" className="hover:text-zinc-300 transition">Help Center</Link></li>
              <li><Link to="/Feedback" className="hover:text-zinc-300 transition">Submit Feedback</Link></li>
              <li><Link to="/ReportBug" className="hover:text-zinc-300 transition">Report a Bug</Link></li>
            </ul>
          </div>

          {/* Links: Legal & Rules */}
          <div>
            <h4 className="font-bold text-zinc-200 mb-4 text-sm uppercase tracking-wider">Legal & Trust</h4>
            <ul className="space-y-2.5 text-zinc-500 text-sm">
              <li><Link to="/PrivacyPolicy" className="hover:text-zinc-300 transition">Privacy Policy</Link></li>
              <li><Link to="/TermsOfService" className="hover:text-zinc-300 transition">Terms of Service</Link></li>
              <li><Link to="/CommunityGuidelines" className="hover:text-zinc-300 transition">Community Guidelines</Link></li>
              <li><Link to="/SafetyCenter" className="hover:text-zinc-300 transition">Safety Center</Link></li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-zinc-900 pt-8 flex flex-col sm:flex-row items-center justify-between text-zinc-600 text-sm">
          <p>&copy; 2026 VibeSocial. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-zinc-400">Twitter</a>
            <a href="#" className="hover:text-zinc-400">Instagram</a>
            <a href="#" className="hover:text-zinc-400">Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
