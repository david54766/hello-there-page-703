import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useConversation } from "@elevenlabs/react";
import { useServerFn } from "@tanstack/react-start";
import { mintAgentToken } from "@/lib/voice.functions";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mic, MicOff, Loader2, Volume2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/voice-test")({ component: VoiceTest });

function VoiceTest() {
  const { user } = useAuth();
  const [agentId, setAgentId] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [transcript, setTranscript] = useState<{ role: string; text: string }[]>([]);
  const tokenFn = useServerFn(mintAgentToken);

  useEffect(() => {
    if (!user) return;
    const saved = localStorage.getItem("elevenlabs_agent_id");
    if (saved) setAgentId(saved);
  }, [user]);

  const conversation = useConversation({
    onConnect: () => toast.success("Connected to agent"),
    onDisconnect: () => toast.info("Disconnected"),
    onError: (e: any) => toast.error(String(e?.message ?? e)),
    onMessage: (m: any) => {
      if (m.source === "user" || m.source === "ai") {
        setTranscript((prev) => [...prev, { role: m.source, text: m.message ?? "" }]);
      }
    },
  });

  const start = useCallback(async () => {
    if (!agentId) { toast.error("Paste your ElevenLabs agent ID"); return; }
    setConnecting(true);
    try {
      localStorage.setItem("elevenlabs_agent_id", agentId);
      await navigator.mediaDevices.getUserMedia({ audio: true });
      const { token } = await tokenFn({ data: { agentId } });
      await conversation.startSession({ conversationToken: token, connectionType: "webrtc" });
    } catch (e: any) { toast.error(e.message); }
    finally { setConnecting(false); }
  }, [agentId, conversation, tokenFn]);

  const isLive = conversation.status === "connected";

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 sm:py-10 pb-24 md:pb-10">
      <h1 className="mb-2 text-2xl font-semibold tracking-tight sm:text-3xl">Voice agent · live test</h1>
      <p className="mb-6 text-sm text-muted-foreground">Talk to your AI receptionist from the browser. Once your Twilio voice number is approved, real callers hit this same agent.</p>

      <Card className="space-y-4 p-5">
        <div>
          <Label>ElevenLabs Agent ID</Label>
          <Input value={agentId} onChange={(e) => setAgentId(e.target.value)} placeholder="agent_…" disabled={isLive} />
          <p className="mt-1 text-xs text-muted-foreground">Create an agent at <a className="underline" href="https://elevenlabs.io/app/conversational-ai" target="_blank" rel="noreferrer">elevenlabs.io</a>, then paste its ID here.</p>
        </div>

        <div className="flex items-center gap-3">
          {!isLive ? (
            <Button onClick={start} disabled={connecting} className="w-full sm:w-auto">
              {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mic className="h-4 w-4" />} Start call
            </Button>
          ) : (
            <Button variant="destructive" onClick={() => conversation.endSession()} className="w-full sm:w-auto">
              <MicOff className="h-4 w-4" /> End call
            </Button>
          )}
          {isLive && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Volume2 className={`h-4 w-4 ${conversation.isSpeaking ? "text-primary animate-pulse" : ""}`} />
              {conversation.isSpeaking ? "Agent speaking…" : "Listening…"}
            </div>
          )}
        </div>
      </Card>

      {transcript.length > 0 && (
        <Card className="mt-4 max-h-80 space-y-2 overflow-y-auto p-4">
          {transcript.map((t, i) => (
            <div key={i} className={`text-sm ${t.role === "ai" ? "text-foreground" : "text-muted-foreground"}`}>
              <span className="font-medium">{t.role === "ai" ? "Agent" : "You"}:</span> {t.text}
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}