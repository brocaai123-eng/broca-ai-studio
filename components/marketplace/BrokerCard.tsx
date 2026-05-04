"use client";

import { useState } from "react";
import { Mail, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { BrokerProfileData } from "@/lib/types/marketplace";

interface BrokerCardProps {
  broker: BrokerProfileData;
}

export default function BrokerCard({ broker }: BrokerCardProps) {
  const fullName = broker.profile?.full_name || "Unknown Broker";
  const brokerEmail = broker.contact_email || broker.profile?.email || "";

  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    if (!form.name || !form.email || !form.message) {
      setError("Name, email and message are required.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/marketplace/brokers/${broker.id}/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senderName: form.name,
          senderEmail: form.email,
          subject: form.subject,
          message: form.message,
        }),
      });
      if (res.ok) {
        setSent(true);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to send message.");
      }
    } catch {
      setError("Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setShowModal(false);
    setSent(false);
    setError(null);
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <>
      <div className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 hover:shadow-md transition-all duration-200">
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-foreground truncate">{fullName}</h3>
            {broker.is_verified && (
              <Badge className="bg-blue-500 text-white text-[10px] px-1.5 py-0">Verified</Badge>
            )}
          </div>
          {broker.brokerage_name && (
            <p className="text-sm text-muted-foreground truncate">{broker.brokerage_name}</p>
          )}
          {broker.specialties?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {broker.specialties.slice(0, 4).map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0 capitalize">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Contact button */}
        <div className="flex-shrink-0">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => setShowModal(true)}
          >
            <Mail className="w-3.5 h-3.5 mr-1.5" />
            Contact
          </Button>
        </div>
      </div>

      {/* Contact Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={handleClose}
        >
          <div
            className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Contact {fullName}</h2>
                {brokerEmail && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" />
                    {brokerEmail}
                  </p>
                )}
              </div>
              <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
                <X className="w-5 h-5" />
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6">
                <p className="text-green-600 font-medium text-lg">Message sent!</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Your message has been delivered to {fullName}.
                </p>
                <Button className="mt-4" onClick={handleClose}>Close</Button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Your Name</Label>
                    <Input
                      placeholder="John Doe"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium mb-1 block">Your Email</Label>
                    <Input
                      type="email"
                      placeholder="you@email.com"
                      value={form.email}
                      onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Subject (optional)</Label>
                  <Input
                    placeholder="Inquiry about..."
                    value={form.subject}
                    onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium mb-1 block">Message</Label>
                  <Textarea
                    placeholder="Write your message here..."
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  />
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <Button className="w-full" onClick={handleSend} disabled={sending}>
                  {sending ? "Sending..." : "Send Message"}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
