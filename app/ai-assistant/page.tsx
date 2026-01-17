"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  Sparkles, 
  Send, 
  FileText, 
  Mail, 
  TrendingUp, 
  ArrowLeft,
  Loader2,
  User,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrocaLogo from "@/components/ui/BrocaLogo";
import { toast } from "sonner";

const quickActions = [
  { 
    icon: FileText, 
    label: "Summarize", 
    description: "Extract key details from documents",
    prompt: "Help me summarize a business document. What information do you need?"
  },
  { 
    icon: Mail, 
    label: "Draft Email", 
    description: "Generate professional emails",
    prompt: "I need to draft a professional email for a client. What type of email do you need?"
  },
  { 
    icon: TrendingUp, 
    label: "Analyze Data", 
    description: "Get insights from your data",
    prompt: "I'd like help analyzing business data. What details can you provide?"
  },
];

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm BROCA Assistant, your AI helper for business tasks. I can help you with:\n\n• **Document Analysis** - Summarize contracts, reports, and documents\n• **Client Management** - Assist with onboarding and communication\n• **Data Insights** - Analyze business information\n• **Email Drafting** - Compose professional emails\n• **Platform Help** - Navigate BROCA AI Studio features\n\nHow can I assist you today?",
      timestamp: new Date(),
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // Build conversation history (excluding the initial greeting and system messages)
      const conversationHistory = messages
        .filter(m => m.id !== '1') // Exclude initial greeting
        .map(m => ({ role: m.role, content: m.content }));

      const response = await fetch('/api/ai-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get response');
      }

      // Add AI response
      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiMsg]);

    } catch (error) {
      console.error('AI Assistant error:', error);
      
      // Add error message
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error processing your request. Please try again.",
        timestamp: new Date(),
        isError: true,
      };
      
      setMessages(prev => [...prev, errorMsg]);
      toast.error('Failed to get AI response');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // Format message content with markdown-like styling
  const formatContent = (content: string) => {
    // Split by newlines and process each line
    const lines = content.split('\n');
    
    return lines.map((line, i) => {
      // Bold text: **text**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedParts = parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={j} className="font-semibold text-app-foreground">{part.slice(2, -2)}</strong>;
        }
        return part;
      });

      // Bullet points
      if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
        return (
          <div key={i} className="flex items-start gap-2 py-0.5">
            <span className="text-primary mt-1">•</span>
            <span>{formattedParts}</span>
          </div>
        );
      }

      // Empty lines become spacing
      if (line.trim() === '') {
        return <div key={i} className="h-2" />;
      }

      return <p key={i} className="py-0.5">{formattedParts}</p>;
    });
  };

  return (
    <div className="h-screen bg-app flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-20 border-b border-app bg-app-card flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-app-muted hover:text-app-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-app-foreground">BROCA Assistant</h1>
              <p className="text-xs text-app-muted flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Always ready to help
              </p>
            </div>
          </div>
        </div>
        <Link href="/">
          <BrocaLogo size="sm" />
        </Link>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Chat */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Messages - scrollable container with invisible scrollbar */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-transparent hover:scrollbar-thumb-gray-300 dark:hover:scrollbar-thumb-gray-600 scrollbar-track-transparent">
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {message.role === "user" ? (
                  <div className="flex items-start gap-3 max-w-2xl">
                    <div className="bg-primary/10 rounded-2xl rounded-br-md px-5 py-3">
                      <p className="text-app-foreground whitespace-pre-wrap">{message.content}</p>
                    </div>
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                      <User className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 max-w-2xl">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      message.isError ? 'bg-red-100' : 'bg-primary'
                    }`}>
                      {message.isError ? (
                        <AlertCircle className="w-4 h-4 text-red-600" />
                      ) : (
                        <Sparkles className="w-4 h-4 text-primary-foreground" />
                      )}
                    </div>
                    <div className={`app-card px-5 py-4 rounded-2xl rounded-bl-md ${
                      message.isError ? 'border-red-200 bg-red-50 dark:bg-red-900/20' : ''
                    }`}>
                      <div className={`text-sm leading-relaxed ${
                        message.isError ? 'text-red-700 dark:text-red-300' : 'text-app-muted'
                      }`}>
                        {formatContent(message.content)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-4 h-4 text-primary-foreground" />
                  </div>
                  <div className="app-card px-5 py-4 rounded-2xl rounded-bl-md">
                    <div className="flex items-center gap-2 text-app-muted">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm">BROCA is thinking...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-app bg-app-card p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <Input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about clients, documents, or BROCA features..."
                className="flex-1 h-12 bg-app-muted border-app text-app-foreground placeholder:text-app-muted"
                disabled={isLoading}
              />
              <Button 
                type="submit" 
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading || !input.trim()}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-app-muted text-center mt-2">
              BROCA Assistant specializes in business and platform-related questions.
            </p>
          </div>
        </div>

        {/* Sidebar - Quick Actions */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-app bg-app-card p-6 overflow-y-auto scrollbar-thin flex-shrink-0">
          <h2 className="font-display text-lg font-semibold text-app-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="w-full p-4 bg-app-muted hover:bg-primary/10 rounded-xl text-left transition-colors"
                onClick={() => handleQuickAction(action.prompt)}
                disabled={isLoading}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-app-foreground">{action.label}</span>
                </div>
                <p className="text-sm text-app-muted">{action.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <h3 className="font-medium text-app-foreground mb-2">Pro Tip</h3>
            <p className="text-sm text-app-muted">
              BROCA Assistant can help with documents, client communication, data analysis, and navigating platform features. Ask anything related to your business!
            </p>
          </div>

          <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800">
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Disclaimer
            </h3>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              BROCA Assistant provides general guidance only. For legal, financial, or tax matters, please consult with qualified professionals.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
