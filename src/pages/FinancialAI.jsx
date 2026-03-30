import { useState, useRef, useEffect } from "react";
import { askCabwise } from "../services/cabwiseService";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, Bot, User, 
  ChevronRight, BrainCircuit, Sparkles,
  TrendingUp, CreditCard, PieChart, ClipboardList
} from "lucide-react";

export default function FinancialAI() {
  // 1. Ininitialize as empty array para walang greeting message sa start
  const [messages, setMessages] = useState([]);
  
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSend = async (customInput) => {
    const textToSend = customInput || input;
    if (!textToSend.trim()) return;

    const userMessage = {
      role: "user",
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const replyContent = await askCabwise(updatedMessages);
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: replyContent,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      }]);
    } catch (error) {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: "Sorry, I'm having trouble connecting to the server. Please try again later.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  // 2. English Quick Prompts
  const quickPrompts = [
    { text: "Who are the top 5 drivers with the highest outstanding balance?", icon: User, color: "text-blue-600", bg: "bg-blue-50" },
    { text: "Compare boundary collections from yesterday vs today.", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
    { text: "Show me high-priority payables due tomorrow.", icon: CreditCard, color: "text-amber-600", bg: "bg-amber-50" },
    { text: "Which department is consuming their budget the fastest?", icon: PieChart, color: "text-indigo-600", bg: "bg-indigo-50" },
    { text: "Generate a summary of audit logs from the last 24 hours.", icon: ClipboardList, color: "text-slate-600", bg: "bg-slate-100" }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} 
      animate={{ opacity: 1, y: 0 }} 
      // 3. Tinanggal ang max-w-5xl para full-width ang sakop
      className="flex flex-col h-[calc(100vh-120px)] w-full mx-auto"
    >
      {/* Header Section */}
      <div className="flex items-center justify-between mb-6 shrink-0 px-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-600 rounded-2xl text-white shadow-lg shadow-emerald-200">
            <BrainCircuit className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Cabwise AI</h1>
            <p className="text-slate-500 text-xs font-medium">Autonomous Financial Intelligence</p>
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 flex flex-col bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden relative">
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30 custom-scrollbar">
          
          {/* QUICK PROMPTS - Only visible if no messages yet */}
          <AnimatePresence>
            {messages.length === 0 && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, y: 20 }}
                className="flex flex-col items-center justify-center min-h-[400px] w-full"
              >
                <div className="text-center mb-10">
                  <div className="w-16 h-16 bg-emerald-100 rounded-3xl flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="w-8 h-8 text-emerald-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800">How can I help you today?</h2>
                  <p className="text-slate-500 text-sm mt-2">Ask anything about Envirocab's financial records.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl w-full">
                  {quickPrompts.map((prompt, i) => (
                    <button 
                      key={i}
                      onClick={() => handleSend(prompt.text)}
                      className="flex items-start gap-4 p-5 text-left bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-all group shadow-sm active:scale-[0.98]"
                    >
                      <div className={`p-2.5 rounded-xl ${prompt.bg} ${prompt.color} shrink-0`}>
                        <prompt.icon className="w-5 h-5" />
                      </div>
                      <span className="text-[13px] font-semibold text-slate-700 leading-snug group-hover:text-emerald-900 line-clamp-2">
                        {prompt.text}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Messages Display */}
          {messages.map((msg, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`flex gap-3 max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center shadow-sm ${
                  msg.role === "assistant" ? "bg-emerald-600 text-white" : "bg-slate-800 text-white"
                }`}>
                  {msg.role === "assistant" ? <Bot className="w-5 h-5" /> : <User className="w-5 h-5" />}
                </div>
                <div className="flex flex-col gap-1">
                  <div className={`px-5 py-3.5 text-[14px] leading-relaxed shadow-sm font-medium whitespace-pre-wrap ${
                    msg.role === "assistant" 
                      ? "bg-white border border-slate-200 text-slate-800 rounded-[22px] rounded-tl-[8px]" 
                      : "bg-emerald-600 text-white rounded-[22px] rounded-tr-[8px]"
                  }`}>
                    {msg.content}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
          
          {isTyping && (
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-600 text-white flex items-center justify-center animate-pulse shadow-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div className="bg-white border border-slate-200 px-5 py-4 rounded-[22px] rounded-tl-[8px] flex gap-1.5 items-center shadow-sm h-[48px]">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-bounce"></span>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-white border-t border-slate-100">
          <div className="max-w-4xl mx-auto flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-[2rem] p-2 focus-within:ring-4 focus-within:ring-emerald-500/10 focus-within:border-emerald-300 transition-all shadow-sm">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Message Cabwise..."
              className="flex-1 bg-transparent border-none text-[15px] font-medium text-slate-800 px-4 py-2 focus:outline-none"
            />
            <button 
              onClick={() => handleSend()}
              disabled={!input.trim()}
              className="w-11 h-11 flex items-center justify-center rounded-full bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all active:scale-95 shadow-md"
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </div>
          <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
            Powered by Groq • AI can make mistakes.
          </p>
        </div>

      </div>
    </motion.div>
  );
}