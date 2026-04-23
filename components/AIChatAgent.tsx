"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, X, Send, Bot, User, Loader2 } from "lucide-react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, getDocs } from "firebase/firestore";

type Message = {
  role: "user" | "ai";
  content: string;
};

export default function AIChatAgent({ 
  currentUser, 
  userName, 
  isPartner 
}: { 
  currentUser?: { uid: string; displayName?: string | null } | null; 
  userName?: string | null; 
  isPartner?: boolean; 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { 
      role: "ai", 
      content: `Hi ${userName || 'there'}! I'm your HomeFixer Agent. I can help you book services, manage your profile, or give you step-by-step instructions to fix home problems. How can I help you today?` 
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [providers, setProviders] = useState<{ id: string; name: string; category: string; subCategory?: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isOpen]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const snap = await getDocs(collection(db, "providers"));
        setProviders(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as { id: string; name: string; category: string; subCategory?: string })));
      } catch (e) {
        console.error("Failed to load providers for chat", e);
      }
    };
    fetchProviders();
  }, []);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    const updatedMessages: Message[] = [...messages, { role: "user", content: userMessage }];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      try {
        await addDoc(collection(db, "chats"), {
          role: "user",
          uid: currentUser?.uid || "guest",
          content: userMessage,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Could not save user message to Firebase", e);
      }

      const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Missing NEXT_PUBLIC_GEMINI_API_KEY");

      const genAI = new GoogleGenerativeAI(apiKey);
      const providersList = providers.map(p => `- ${p.name} (Category: ${p.category}, Specialization: ${p.subCategory || 'General'}): [PROVIDER_ID: ${p.id}]`).join("\n");
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
      });

      const systemInstruction = `You are the ultimate HomeFixer Support Agent, a helpful, professional AI assistant for residents and professionals in Durgapur.

CURRENT USER CONTEXT:
- Name: ${userName || 'Guest'}
- Logged In: ${currentUser ? 'Yes' : 'No'}
- User Type: ${isPartner ? 'Service Provider (Partner)' : 'Regular Customer'}
- UID: ${currentUser?.uid || 'N/A'}

YOUR CAPABILITIES & RULES:

1. SERVICE BOOKING (Users Only):
   - Categories: Electrician, Plumber, Mechanic, Tutor, Tailor.
   - Available Providers:
${providersList}
   - STEPS: First, ask for the specific problem/specialization. Then, suggest 1-2 matches from the list. 
   - FINAL STEP: Once a choice is made, append: [REDIRECT: /provider?id=PROVIDER_ID].

2. DIY FIXING INSTRUCTIONS (Problem Solving):
   - If a user asks "how to fix" something (e.g., leaky tap, fuse, fan noise), you MUST provide clear, safe, step-by-step DIY instructions immediately.
   - SAFETY FIRST: Always start with a safety warning (e.g., "Turn off the main water/power first").
   - Offer a professional only after providing the DIY steps.

3. PROFILE & ACCOUNT HELP:
   - If asked about their profile or "who am I?", share their name and user type.
   - To help them view/edit their profile, append: [REDIRECT: /profile].
   - If a Partner asks how to see their business, append: [REDIRECT: /partner].

4. PARTNER SUPPORT:
   - Help Partners understand how to register or manage bookings.
   - If they need to register as a partner, append: [REDIRECT: /register-partner].

TONE: Friendly, professional, and extremely useful. Keep responses concise but thorough when giving instructions.`;

      const prompt = `System Instruction:\n${systemInstruction}\n\nConversation History:\n` + updatedMessages
        .map((m) => `${m.role === "user" ? "User" : "Agent"}: ${m.content}`)
        .join("\n") + "\nAgent: ";

      let result;
      let aiResponseText = "";
      let retries = 3;
      while (retries > 0) {
        try {
          result = await model.generateContent(prompt);
          aiResponseText = result.response.text();
          break;
        } catch (e) {
          const apiError = e as { message?: string };
          if (apiError.message?.includes("503") || apiError.message?.includes("429")) {
            retries--;
            await new Promise(r => setTimeout(r, 2000));
          } else throw e;
        }
      }

      if (!result) throw new Error("Failed to generate content after retries");

      const redirectMatch = aiResponseText.match(/\[REDIRECT:\s*(.+?)\]/);
      let redirectUrl: string | null = null;

      if (redirectMatch) {
        redirectUrl = redirectMatch[1].trim();
        aiResponseText = aiResponseText.replace(redirectMatch[0], "").trim();
      }

      try {
        await addDoc(collection(db, "chats"), {
          role: "ai",
          uid: currentUser?.uid || "guest",
          content: aiResponseText || "Sorry, I couldn't generate a response.",
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn("Could not save AI message to Firebase", e);
      }

      setMessages((prev) => [...prev, { role: "ai", content: aiResponseText }]);

      if (redirectUrl) {
        setTimeout(() => {
          router.push(redirectUrl!);
          setIsOpen(false);
        }, 1500);
      }
    } catch (error) {
      console.error("AI Chat Error:", error);
      // In case of completely unexpected non-API errors
      setMessages((prev) => [
        ...prev,
        { role: "ai", content: "Oops! Something went wrong while connecting. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen ? (
        <div
          className="mb-4 w-80 sm:w-96 rounded-2xl overflow-hidden flex flex-col transition-all duration-300 ease-in-out transform origin-bottom-right h-[500px]"
          style={{ background: "var(--surface)", border: "1.5px solid var(--border)", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}
        >
          {/* Header */}
          <div
            className="p-4 flex items-center justify-between"
            style={{ background: "linear-gradient(135deg, #1C2B1F, #2D5A3D)", color: "#FAF6F0" }}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full" style={{ background: "rgba(255,255,255,0.15)" }}>
                <Bot size={20} style={{ color: "#C8965A" }} />
              </div>
              <div>
                <h3 className="font-semibold text-sm" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "0.02em" }}>HomeFixer Support</h3>
                <p className="text-xs hidden sm:block" style={{ color: "rgba(255,255,255,0.6)" }}>Powered by Gemini</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded-full transition-colors"
              style={{ color: "rgba(255,255,255,0.7)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
            >
              <X size={20} />
            </button>
          </div>

          {/* Chat Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" style={{ background: "var(--background)" }}>
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex w-full ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div className={`flex max-w-[85%] ${m.role === "user" ? "flex-row-reverse" : "flex-row"} items-end space-x-2`}>
                  <div
                    className="p-2 rounded-full shrink-0"
                    style={m.role === "user"
                      ? { background: "rgba(200,150,90,0.2)", color: "#C8965A", marginLeft: 8 }
                      : { background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", marginRight: 8 }
                    }
                  >
                    {m.role === "user" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div
                    className={`p-3 text-sm shadow-sm leading-relaxed`}
                    style={m.role === "user"
                      ? { background: "linear-gradient(135deg, #C8965A, #A0714F)", color: "#FAF6F0", borderRadius: "16px 16px 0px 16px" }
                      : { background: "var(--surface)", color: "var(--foreground)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 0px" }
                    }
                  >
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex w-full justify-start">
                <div className="flex max-w-[85%] flex-row items-end space-x-2">
                  <div className="p-2 rounded-full shrink-0 mr-2" style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)" }}>
                    <Bot size={14} />
                  </div>
                  <div
                    className="p-3 text-sm shadow-sm flex space-x-2 items-center"
                    style={{ background: "var(--surface)", color: "var(--muted)", border: "1px solid var(--border)", borderRadius: "16px 16px 16px 0px" }}
                  >
                    <Loader2 size={14} className="animate-spin" style={{ color: "var(--brand)" }} />
                    <span style={{ fontSize: "0.8rem" }}>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-3" style={{ background: "var(--surface)", borderTop: "1px solid var(--border)" }}>
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything..."
                className="input-modern flex-1"
                style={{ padding: "0.6rem 1rem", fontSize: "0.85rem" }}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="p-3 rounded-full transition-colors flex items-center justify-center shrink-0"
                style={{
                  background: (isLoading || !input.trim()) ? "var(--border)" : "linear-gradient(135deg, #C8965A, #A0714F)",
                  color: (isLoading || !input.trim()) ? "var(--muted)" : "#FAF6F0",
                  border: "none",
                  cursor: (isLoading || !input.trim()) ? "not-allowed" : "pointer",
                }}
              >
                <Send size={16} style={{ marginLeft: "2px" }} />
              </button>
            </form>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsOpen(true)}
          className="p-4 rounded-full transition-all duration-300 flex items-center justify-center group"
          style={{ background: "linear-gradient(135deg, #1C2B1F, #2D5A3D)", color: "#FAF6F0", boxShadow: "0 10px 30px rgba(28,43,31,0.5)" }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.08) translateY(-4px)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1) translateY(0)"; }}
        >
          <MessageSquare size={26} className="group-hover:rotate-12 transition-transform" />
        </button>
      )}
    </div>
  );
}
