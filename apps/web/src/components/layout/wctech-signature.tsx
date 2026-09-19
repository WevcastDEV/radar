'use client';

import { Linkedin, MessageCircle, HeartHandshake } from 'lucide-react';

interface WCTechSignatureProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'footer';
}

const LINKEDIN_URL = 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355';
const WHATSAPP_URL = 'https://wa.me/5592992920233';

export function WCTechSignature({ collapsed = false, variant = 'sidebar' }: WCTechSignatureProps) {
  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-2">
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <span className="text-[8px] font-black text-primary">WC</span>
        </div>
        <div className="flex flex-col gap-1">
          <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer" title="LinkedIn" className="p-1 rounded-md text-muted-foreground hover:text-primary transition">
            <Linkedin className="w-3 h-3" />
          </a>
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="p-1 rounded-md text-muted-foreground hover:text-green-500 transition">
            <MessageCircle className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 ${
      variant === 'footer' ? 'pt-4 pb-2' : 'pt-1'
    }`}>
      <HeartHandshake className="w-3 h-3 text-primary" />
      <span className="text-[10px] text-muted-foreground font-medium">Powered by</span>
      <span className="text-[10px] font-black text-foreground tracking-wide">WCTECH</span>
      <div className="flex items-center gap-0.5 ml-1">
        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="LinkedIn do Weverton"
          className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition"
        >
          <Linkedin className="w-3 h-3" />
        </a>
        <a
          href={WHATSAPP_URL}
          target="_blank"
          rel="noopener noreferrer"
          title="WhatsApp WCTECH"
          className="p-1 rounded-md text-muted-foreground hover:text-green-500 hover:bg-green-500/10 transition"
        >
          <MessageCircle className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}
