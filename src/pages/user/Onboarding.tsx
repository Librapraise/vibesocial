import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import {
  Sparkles,
  UserCircle,
  Bell,
  MapPin,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  Zap
} from "lucide-react";
import { cn } from "@/lib/utils";

const VIBE_INTERESTS_LIST = [
  "Techno", "House", "Hip Hop", "R&B", "Jazz", "Latin", "Rock", "Pop", 
  "Cocktails", "Craft Beer", "Rooftops", "Live Bands", "Speakeasies", "Dance Club"
];

type StepId = 1 | 2 | 3;

export default function Onboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user: authUser, checkAppState } = useAuth();
  
  const [currentStep, setCurrentStep] = useState<StepId>(1);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [name, setName] = useState(authUser?.name || "");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  // Permission states
  const [locationGranted, setLocationGranted] = useState(false);
  const [pushGranted, setPushGranted] = useState(false);
  const [requestingLoc, setRequestingLoc] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleNextStep = () => {
    if (currentStep === 1 && selectedTags.length < 3) {
      toast({
        title: "Select at least 3 vibes",
        description: "This helps us personalize your feed.",
        variant: "destructive",
      });
      return;
    }
    setCurrentStep((prev) => (prev + 1) as StepId);
  };

  const handlePrevStep = () => {
    setCurrentStep((prev) => (prev - 1) as StepId);
  };

  const requestLocation = () => {
    if (!navigator.geolocation) {
      toast({ title: "Not Supported", description: "Geolocation is not supported by your browser." });
      return;
    }
    setRequestingLoc(true);
    navigator.geolocation.getCurrentPosition(
      () => {
        setLocationGranted(true);
        setRequestingLoc(false);
        toast({ title: "Location Enabled", description: "We can now show you nearby events." });
      },
      () => {
        setRequestingLoc(false);
        toast({ title: "Permission Denied", description: "You can enable location later in settings.", variant: "destructive" });
      }
    );
  };

  const requestPush = async () => {
    if (typeof Notification === "undefined") {
      toast({ title: "Not Supported", description: "Push notifications are not supported on this device." });
      return;
    }
    setRequestingPush(true);
    const perm = await Notification.requestPermission();
    setPushGranted(perm === "granted");
    setRequestingPush(false);
    if (perm === "granted") {
      toast({ title: "Notifications Enabled", description: "You will receive updates for wait times and capacity changes." });
    } else {
      toast({ title: "Permission Denied", description: "You can enable notifications later in settings.", variant: "destructive" });
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const updates = {
        name: name.trim() || authUser?.name,
        bio: bio.trim(),
        vibe_preferences: selectedTags,
        notification_settings: {
          push_enabled: pushGranted,
          event_start_alerts: true,
          status_updates: true,
          crowd_level_changes: true,
          wait_time_alerts: true,
          chat_mentions: true,
          weekly_digest: true
        }
      };

      await base44.auth.updateMe(updates);
      await checkAppState();
      
      toast({
        title: "Welcome to VibeSocial!",
        description: "Your feed has been personalized.",
      });
      
      navigate("/", { replace: true });
    } catch (err) {
      toast({
        title: "Error saving preferences",
        description: "Please try completing again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-orange-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-lg bg-zinc-900/60 border border-zinc-900 backdrop-blur-xl p-8 rounded-3xl space-y-6 shadow-2xl relative">
        {/* Progress header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-500 to-pink-500 flex items-center justify-center font-bold text-white shadow-lg">
              VS
            </div>
            <span className="font-extrabold text-sm tracking-wide">VibeSocial Onboarding</span>
          </div>
          <span className="text-xs font-bold text-zinc-500">Step {currentStep} of 3</span>
        </div>

        {/* Step progress bar */}
        <div className="h-1.5 w-full bg-zinc-850 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-pink-500 transition-all duration-300"
            style={{ width: `${(currentStep / 3) * 100}%` }}
          />
        </div>

        {/* STEP 1: CHOOSE VIBES */}
        {currentStep === 1 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-orange-400" /> Choose your scene
              </h2>
              <p className="text-xs text-zinc-400">Select at least 3 scene preferences to customize your feed.</p>
            </div>

            <div className="flex flex-wrap gap-2.5 max-h-[220px] overflow-y-auto pr-1">
              {VIBE_INTERESTS_LIST.map((tag) => {
                const isSelected = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    onClick={() => handleToggleTag(tag)}
                    className={cn(
                      "px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center gap-1.5",
                      isSelected
                        ? "bg-orange-500/15 border-orange-500/35 text-orange-400"
                        : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    )}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5" />}
                    {tag}
                  </button>
                );
              })}
            </div>
            <div className="text-right text-[10px] text-zinc-500 font-bold">
              {selectedTags.length} selected (minimum 3)
            </div>
          </div>
        )}

        {/* STEP 2: PROFILE DETAILS */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <UserCircle className="w-5 h-5 text-orange-400" /> Complete your profile
              </h2>
              <p className="text-xs text-zinc-400">Tell the community about yourself.</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Display Name</Label>
                <Input
                  type="text"
                  placeholder="Enter name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-zinc-950 border-zinc-800 focus-visible:ring-orange-500 text-white rounded-xl text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Short Bio</Label>
                <textarea
                  placeholder="Share a quick snippet about your vibe (e.g. Techno lover, weekend raver)..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  maxLength={250}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white rounded-xl p-3 text-sm focus-visible:ring-1 focus-visible:ring-orange-500 outline-none min-h-[90px] resize-none"
                />
                <p className="text-[10px] text-zinc-500 text-right">{bio.length}/250 characters</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: ENABLE PERMISSIONS */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-in fade-in duration-300">
            <div className="space-y-1">
              <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
                <Zap className="w-5 h-5 text-orange-400" /> Unlock full capabilities
              </h2>
              <p className="text-xs text-zinc-400">Allow permissions for a real-time event experience.</p>
            </div>

            <div className="space-y-3">
              {/* Location permission block */}
              <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl">
                <div className="flex gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-orange-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">Location Services</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Find events and check in near your location.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={requestLocation}
                  disabled={locationGranted || requestingLoc}
                  className={cn(
                    "text-xs rounded-xl font-bold border",
                    locationGranted 
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-transparent"
                  )}
                >
                  {requestingLoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : locationGranted ? "Enabled" : "Allow"}
                </Button>
              </div>

              {/* Notification permission block */}
              <div className="flex items-center justify-between p-4 bg-zinc-950/40 border border-zinc-850 rounded-2xl">
                <div className="flex gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-pink-500/10 flex items-center justify-center shrink-0">
                    <Bell className="w-4 h-4 text-pink-400" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-zinc-200">Wait Time alerts</h4>
                    <p className="text-[10px] text-zinc-500 mt-0.5">Receive alert logs for event capacity changes.</p>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={requestPush}
                  disabled={pushGranted || requestingPush}
                  className={cn(
                    "text-xs rounded-xl font-bold border",
                    pushGranted 
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border-transparent"
                  )}
                >
                  {requestingPush ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : pushGranted ? "Enabled" : "Allow"}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Wizard buttons */}
        <div className="flex items-center justify-between gap-4 pt-4 border-t border-zinc-800/60">
          {currentStep > 1 ? (
            <Button
              variant="outline"
              onClick={handlePrevStep}
              className="border-zinc-800 text-zinc-400 hover:bg-zinc-850 hover:text-white rounded-xl text-xs flex items-center gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Back
            </Button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <Button
              onClick={handleNextStep}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto"
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={saving}
              className="bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 ml-auto shadow-lg shadow-orange-500/20"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Complete Setup"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
