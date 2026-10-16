'use client';

import { ShieldCheck, Instagram, Linkedin, Github } from 'lucide-react';
import { useBrandingStore } from '@/stores/branding-store';

interface WCTechSignatureProps {
  collapsed?: boolean;
  variant?: 'sidebar' | 'footer';
}

export function WCTechSignature({ collapsed = false, variant = 'sidebar' }: WCTechSignatureProps) {
  const { instagramUrl, linkedinUrl, githubUrl } = useBrandingStore();

  const finalInstagram = instagramUrl || 'https://www.instagram.com/wctechn_';
  const finalLinkedin = linkedinUrl || 'https://www.linkedin.com/in/weverton-castelo-branco-005b39355';
  const finalGithub = githubUrl || 'https://github.com/WevcastDEV';

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2 py-2">
        <div className="flex flex-col items-center gap-1.5">
          <a
            href={finalInstagram}
            target="_blank"
            rel="noopener noreferrer"
            title="Instagram (@wctechn_)"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 transition-all cursor-pointer"
          >
            <Instagram className="w-3.5 h-3.5" />
          </a>
          <a
            href={finalLinkedin}
            target="_blank"
            rel="noopener noreferrer"
            title="LinkedIn Weverton Castelo Branco"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 transition-all cursor-pointer"
          >
            <Linkedin className="w-3.5 h-3.5" />
          </a>
          <a
            href={finalGithub}
            target="_blank"
            rel="noopener noreferrer"
            title="GitHub WevcastDEV"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent transition-all cursor-pointer"
          >
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center">
          <span className="text-[8px] font-black text-primary">PRO</span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-1.5 ${
      variant === 'footer' ? 'pt-4 pb-2' : 'pt-1'
    }`}>
      {/* Assinatura Radar Comercial v2.0 PRO */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        <span className="text-[10px] text-muted-foreground font-medium">Radar Comercial</span>
        <span className="text-[10px] font-black text-foreground tracking-wide">v2.0 PRO</span>
      </div>

      {/* Redes Sociais: Instagram Pessoal, LinkedIn e GitHub */}
      <div className="flex items-center justify-center gap-1.5 pt-0.5">
        {/* Instagram Pessoal (@wctechn_) */}
        <a
          href={finalInstagram}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold text-muted-foreground hover:text-pink-500 hover:bg-pink-500/10 border border-border/60 hover:border-pink-500/30 transition-all cursor-pointer group shadow-2xs"
          title="Instagram Weverton Castelo (@wctechn_)"
        >
          <Instagram className="w-3.5 h-3.5 text-pink-500 group-hover:scale-110 transition-transform" />
          <span className="text-[9.5px]">Instagram</span>
        </a>

        {/* LinkedIn */}
        <a
          href={finalLinkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-lg text-muted-foreground hover:text-blue-500 hover:bg-blue-500/10 border border-border/60 hover:border-blue-500/30 transition-all cursor-pointer group shadow-2xs"
          title="LinkedIn Weverton Castelo Branco"
        >
          <Linkedin className="w-3.5 h-3.5 text-blue-500/90 group-hover:scale-110 transition-transform" />
        </a>

        {/* GitHub */}
        <a
          href={finalGithub}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent border border-border/60 hover:border-border transition-all cursor-pointer group shadow-2xs"
          title="GitHub WevcastDEV"
        >
          <Github className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
        </a>
      </div>
    </div>
  );
}
