import React, { useState, useEffect } from 'react';
import { MessageSquare, Send, CheckCheck, Bot, Sparkles, X, Minimize2, Maximize2 } from 'lucide-react';
import { cyberAudio } from './CyberAudio';

interface ChatMessage {
  id: string;
  sender: 'bot' | 'lead';
  text: string;
  time: string;
}

interface WhatsAppSimulatorProps {
  isOpen: boolean;
  onClose: () => void;
  leadName?: string;
  leadPhone?: string;
}

export const WhatsAppSimulator: React.FC<WhatsAppSimulatorProps> = ({
  isOpen,
  onClose,
  leadName = 'Restaurante El Portal Bogotá',
  leadPhone = '+57 310 987 6543'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    // Default simulation conversation sequence
    const initialMsgs: ChatMessage[] = [
      {
        id: '1',
        sender: 'bot',
        text: `¡Hola ${leadName}! 👋 Vi su perfil comercial en Bogotá. En LeadForge ayudamos a negocios de su sector a automatizar la prospección de clientes e integrar WhatsApp con IA.🏼`,
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: '2',
        sender: 'lead',
        text: 'Hola! Qué interesante. ¿Cómo funciona esa integración con WhatsApp exactamente?',
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      },
      {
        id: '3',
        sender: 'bot',
        text: 'Nuestros Agentes IA (como GestiBot) atienden solicitudes 24/7, agendan citas en tu base de datos y califican prospectos automáticamente sin intervención humana. 🤖✨',
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      }
    ];

    setMessages(initialMsgs);
  }, [isOpen, leadName]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    cyberAudio.playClick();
    const newMsg: ChatMessage = {
      id: 'msg-' + Date.now(),
      sender: 'bot',
      text: inputText,
      time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setIsTyping(true);

    // Simulate lead AI response after 1.8s
    setTimeout(() => {
      setIsTyping(false);
      cyberAudio.playHotLeadAlert();
      const leadReply: ChatMessage = {
        id: 'msg-reply-' + Date.now(),
        sender: 'lead',
        text: '¡Excelente! Me gustaría agendar una demostración esta semana.',
        time: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, leadReply]);
    }, 1800);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 transition-all duration-300 ${isMinimized ? 'w-72 h-14' : 'w-80 sm:w-96 h-[540px]'}`}>
      <div className="w-full h-full glass-panel rounded-3xl border border-leadforge-primary/40 shadow-[0_0_35px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden relative backdrop-blur-xl">
        
        {/* Top iPhone Dynamic Island / Header */}
        <div className="bg-slate-950/90 px-4 py-3 border-b border-leadforge-border/60 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10B981]" />
            <div>
              <h4 className="text-xs font-extrabold text-[#F8FAFC] truncate max-w-[170px]">{leadName}</h4>
              <span className="text-[10px] text-emerald-400 font-mono block truncate">{leadPhone} ● WhatsApp API</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                cyberAudio.playClick();
                setIsMinimized(!isMinimized);
              }}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => {
                cyberAudio.playClick();
                onClose();
              }}
              className="p-1 text-slate-400 hover:text-leadforge-critical rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!isMinimized && (
          <>
            {/* Chat Messages Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#0B1220]/70 text-xs">
              <div className="text-center my-1">
                <span className="text-[9px] bg-slate-900/80 text-leadforge-primary border border-leadforge-primary/20 px-2.5 py-1 rounded-full font-mono">
                  🔒 Cifrado de extremo a extremo — n8n Evolution API
                </span>
              </div>

              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex ${m.sender === 'bot' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[82%] p-3 rounded-2xl space-y-1 relative shadow-md ${
                      m.sender === 'bot'
                        ? 'bg-gradient-to-r from-cyan-600/90 to-leadforge-primary text-slate-950 rounded-br-none font-medium'
                        : 'bg-slate-900/90 border border-leadforge-border text-slate-100 rounded-bl-none'
                    }`}
                  >
                    <p className="leading-relaxed leading-snug">{m.text}</p>
                    <div className="flex items-center justify-end gap-1 text-[9px] opacity-75">
                      <span>{m.time}</span>
                      {m.sender === 'bot' && <CheckCheck className="h-3 w-3" />}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-slate-900/90 border border-leadforge-border px-3.5 py-2 rounded-2xl rounded-bl-none text-xs text-slate-400 flex items-center gap-1.5 animate-pulse">
                    <Sparkles className="h-3.5 w-3.5 text-leadforge-primary" />
                    <span>Escribiendo respuesta...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Input Area */}
            <form onSubmit={handleSend} className="p-2.5 bg-slate-950/90 border-t border-leadforge-border/60 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Simular respuesta de WhatsApp..."
                className="flex-1 bg-slate-900/90 border border-leadforge-border/60 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-leadforge-primary/60"
              />
              <button
                type="submit"
                className="p-2 bg-gradient-to-r from-leadforge-primary to-cyan-500 text-slate-950 font-bold rounded-xl hover:shadow-glow-primary transition-all flex items-center justify-center"
              >
                <Send className="h-4 w-4 stroke-[2.5]" />
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  );
};
