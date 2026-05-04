"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  X,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export default function AiAssistantPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm BROCA Assistant. Ask me about any market, your clients, or listing data.",
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const conversationHistory = messages
        .filter(m => m.id !== '1')
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, conversationHistory }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to get response');

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }]);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
        isError: true,
      }]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formatted = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j}>{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return <div key={i} className="flex items-start gap-1.5 py-0.5"><span className="text-primary">•</span><span>{formatted}</span></div>;
      }
      if (line.trim() === '') return <div key={i} className="h-1" />;
      return <p key={i} className="py-0.5">{formatted}</p>;
    });
  };

  return (
    <>
      {/* Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-all duration-200 hover:scale-105 group"
        >
          <Sparkles className="w-6 h-6 text-primary-foreground" />
          <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
        </button>
      )}

      {/* Popup Panel */}
      {isOpen && (
        <>
          {/* Backdrop (click to close) */}
          <div
            className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setIsOpen(false)}
          />

          <div
            className="fixed z-50 bg-card border border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 duration-300
              inset-4 rounded-2xl h-[calc(100vh-2rem)] w-[calc(100vw-2rem)]
              sm:inset-auto sm:bottom-6 sm:right-6 sm:rounded-2xl sm:w-[380px] sm:h-[560px]"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">BROCA Assistant</p>
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Online
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsOpen(false)}>
                <X className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'user' ? (
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className="bg-primary/10 rounded-xl rounded-br-sm px-3 py-2">
                      <p className="text-sm text-foreground">{msg.content}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-3 h-3 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2 max-w-[85%]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${msg.isError ? 'bg-red-100' : 'bg-primary'}`}>
                      {msg.isError
                        ? <AlertCircle className="w-3 h-3 text-red-600" />
                        : <Sparkles className="w-3 h-3 text-primary-foreground" />
                      }
                    </div>
                    <div className={`bg-muted/50 rounded-xl rounded-bl-sm px-3 py-2 ${msg.isError ? 'border border-red-200' : ''}`}>
                      <div className="text-sm text-muted-foreground leading-relaxed">
                        {formatContent(msg.content)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Sparkles className="w-3 h-3 text-primary-foreground" />
                  </div>
                  <div className="bg-muted/50 rounded-xl px-3 py-2">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-xs">Thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-3">
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 h-9 text-sm"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="icon"
                className="h-9 w-9 bg-primary hover:bg-primary/90"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </form>
          </div>
          </div>
        </>
      )}
    </>
  );
}
