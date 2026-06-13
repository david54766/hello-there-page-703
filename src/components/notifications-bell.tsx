import { useCallback, useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { markNotificationRead } from "@/lib/leads.functions";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

type Notif = { id: string; title: string; body: string | null; read: boolean; created_at: string };

export function NotificationsBell({ businessId }: { businessId: string | null }) {
  const [items, setItems] = useState<Notif[]>([]);
  const mark = useServerFn(markNotificationRead);

  const loadNotifications = useCallback(async () => {
    if (!businessId) {
      setItems([]);
      return;
    }
    const { data, error } = await supabase
      .from("notifications")
      .select("id,title,body,read,created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) {
      console.warn("Notification refresh failed", error);
      return;
    }
    setItems((data ?? []) as Notif[]);
  }, [businessId]);

  useEffect(() => {
    if (!businessId) {
      setItems([]);
      return;
    }
    void loadNotifications();
    const refresh = () => void loadNotifications();
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };

    const ch = supabase
      .channel(`notif:${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `business_id=eq.${businessId}` }, (p) => {
        if (p.eventType === "DELETE") {
          const id = (p.old as Partial<Notif> | null)?.id;
          if (!id) {
            refresh();
            return;
          }
          setItems((prev) => prev.filter((n) => n.id !== id));
          return;
        }

        const n = p.new as Notif | null;
        if (!n?.id) {
          refresh();
          return;
        }
        setItems((prev) => {
          const index = prev.findIndex((x) => x.id === n.id);
          if (index === -1) return [n, ...prev].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
          const next = [...prev];
          next[index] = n;
          return next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 20);
        });
        if (p.eventType === "INSERT") toast(n.title, { description: n.body ?? undefined });
      })
      .subscribe((status) => {
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          window.setTimeout(refresh, 750);
        }
      });

    const timer = window.setInterval(refresh, 45000);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", refresh);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", refresh);
      void supabase.removeChannel(ch);
    };
  }, [businessId, loadNotifications]);

  const unread = items.filter((n) => !n.read).length;

  async function readAll() {
    const ids = items.filter((n) => !n.read).map((n) => n.id);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    await Promise.all(ids.map((id) => mark({ data: { id } }).catch(() => null)));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute right-1 top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
              {unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-medium">Notifications</span>
          {unread > 0 && <button onClick={readAll} className="text-xs text-muted-foreground hover:text-foreground">Mark all read</button>}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : (
            items.map((n) => (
              <div key={n.id} className={`border-b px-3 py-2 text-sm ${n.read ? "opacity-60" : ""}`}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="mt-0.5 text-xs text-muted-foreground">{n.body}</div>}
                <div className="mt-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</div>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
