import { useState } from "react";
import { Link } from "react-router-dom";
import { 
  Sparkles, 
  Send, 
  FileText, 
  Mail, 
  TrendingUp, 
  ArrowLeft,
  Check,
  Paperclip
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BrocaLogo from "@/components/ui/BrocaLogo";

const quickActions = [
  { icon: FileText, label: "Summarize", description: "Extract key details from documents" },
  { icon: Mail, label: "Draft Email", description: "Generate professional emails" },
  { icon: TrendingUp, label: "Analyze Deal", description: "Get insights on properties" },
];

const sampleConversation = [
  {
    type: "user",
    content: "Summarize the Smith property contract",
  },
  {
    type: "ai",
    content: {
      title: "Contract Summary",
      items: [
        { label: "Purchase Price", value: "$825,000" },
        { label: "Contingencies", value: "Financing, Inspection" },
        { label: "Closing Date", value: "Feb 28, 2025" },
        { label: "Key Terms", value: "As-is condition, $25k earnest" },
      ],
    },
  },
  {
    type: "user",
    content: "What are the potential risks in this deal?",
  },
  {
    type: "ai",
    content: {
      title: "Risk Analysis",
      items: [
        { label: "Inspection Risk", value: "As-is condition means no repairs" },
        { label: "Financing Timeline", value: "30 days may be tight" },
        { label: "Earnest Money", value: "$25k at risk if buyer defaults" },
      ],
    },
  },
];

const AIAssistant = () => {
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    setIsTyping(true);
    setTimeout(() => setIsTyping(false), 2000);
    setInput("");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="h-20 border-b border-border flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Link to="/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-semibold text-foreground">BROCA Assistant</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                Always ready to help
              </p>
            </div>
          </div>
        </div>
        <Link to="/">
          <BrocaLogo size="sm" />
        </Link>
      </header>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Chat */}
        <div className="flex-1 flex flex-col">
          {/* Messages */}
          <div className="flex-1 overflow-auto p-6 space-y-6">
            {sampleConversation.map((message, index) => (
              <div key={index} className={`flex ${message.type === "user" ? "justify-end" : "justify-start"}`}>
                {message.type === "user" && typeof message.content === "string" ? (
                  <div className="chat-bubble-user">
                    <p className="text-foreground">{message.content}</p>
                  </div>
                ) : typeof message.content === "object" && message.content !== null ? (
                  <div className="chat-bubble-ai max-w-lg">
                    <h4 className="font-semibold text-foreground mb-3">
                      {message.content.title}
                    </h4>
                    <ul className="space-y-2">
                      {message.content.items.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-muted-foreground">
                            {item.label}: <span className="text-foreground">{item.value}</span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ))}

            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex justify-start">
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <div className="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                  <span>BROCA is typing...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="text-muted-foreground">
                <Paperclip className="w-5 h-5" />
              </Button>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask BROCA anything..."
                className="flex-1 h-12 bg-secondary/50 border-border/50"
              />
              <Button 
                type="submit" 
                className="h-12 px-6 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <Send className="w-5 h-5" />
              </Button>
            </form>
          </div>
        </div>

        {/* Sidebar - Quick Actions */}
        <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-border p-6">
          <h2 className="font-display text-lg font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="space-y-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="w-full p-4 bg-secondary/30 hover:bg-secondary/50 rounded-xl text-left transition-colors"
                onClick={() => setInput(`${action.label} `)}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                    <action.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="font-medium text-foreground">{action.label}</span>
                </div>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </button>
            ))}
          </div>

          <div className="mt-8 p-4 bg-primary/10 rounded-xl border border-primary/20">
            <h3 className="font-medium text-foreground mb-2">Pro Tip</h3>
            <p className="text-sm text-muted-foreground">
              Upload documents directly to get instant summaries and insights. BROCA can analyze contracts, disclosures, and property reports.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default AIAssistant;
