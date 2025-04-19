'use client'
import Link from "next/link";
import Image from "next/image";
import { CTAButtons } from "@/app/(landing)/home/CTAButtons";
import { cn } from "@/utils";
import { env } from "@/env";
import { HeroAB } from "@/app/(landing)/home/HeroAB";

export function HeroText(props: {
  children: React.ReactNode;
  className?: string;
}) {
  const { className, ...rest } = props;

  return (
    <h1
      className={cn("font-[600] mb-5 text-6xl sm:text-7xl lg:text-7xl tracking-tight bg-gradient-to-b from-white via to-[#636363] text-transparent bg-clip-text leading-[1.15] font-sans", className)}
      {...rest}
    />
  );
}

export function HeroSubtitle(props: { children: React.ReactNode }) {
  return <p className=" text-sm sm:text-sm text-gray-400 max-w-lg font-[300] font-sans" {...props} />;
}

export function HeroHome() {
  if (env.NEXT_PUBLIC_POSTHOG_HERO_AB) return <HeroAB />;
  return <Hero />;
}

export function Hero(props: {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
}) {
  return (
    <div className="relative pt-24 overflow-hidden bg-black min-h-screen">
      <div className="absolute inset-0">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute h-[3px] w-[3px] rounded-full bg-white"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.3 + 0.1,
              animation: `float ${Math.random() * 10 + 5}s infinite ${Math.random() * 5}s`
            }}
          />
        ))}
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          50% { transform: translate(${Math.random() * 20}px, ${Math.random() * 20}px); }
        }
        @keyframes shine {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(100%);
          }
        }
      `}</style>
      <div className="pt-10 sm:pt-16 pb-24 relative">
        <div 
          className="absolute top-0 left-1/2 -translate-x-1/2 w-[140%] h-[800px] z-0"
          style={{
            background: 'radial-gradient(circle at 50% 100%, rgba(249, 115, 22, 0.7) 0%, rgba(249, 115, 22, 0.2) 25%, transparent 60%)'
          }}
        />
        <div className="mx-auto max-w-7xl px-6 lg:px-8 relative z-10">
          <div className="mx-auto max-w-5xl flex flex-col justify-center items-center text-center">
            <HeroText>
              {props.title || (
                <>
                  Transform your email experience with MailX's intelligence
                </>
              )}
            </HeroText>
            <HeroSubtitle>
              {props.subtitle ||
                "Our AI-powered virtual assistant conquers your inbox in minutes, not hours. Wave goodbye to email chaos—start your Mail X journey today! "}
            </HeroSubtitle>
            <CTAButtons />
          </div>
          
          <div className="mt-4 flex justify-center relative mb-24 pt-10">
            <div className="relative w-[90%] max-w-[1400px] aspect-[16/7.5] rounded-xl overflow-hidden shadow-lg z-10 p-[2px] bg-gradient-to-r from-transparent via-orange-500/50 to-transparent">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-transparent via-white to-transparent animate-shine" />
              <div className="relative w-full h-full rounded-xl overflow-hidden bg-black/80">
                <Image 
                  src="/images/inbox-final.png"
                  alt="MailX Demo" 
                  fill 
                  className="object-cover brightness-90 z-20" 
                  priority
                />
                <div 
                  className="absolute inset-0 z-10"
                  style={{
                    background: 'linear-gradient(180deg, rgba(249, 115, 22, 0.4) 0%, rgba(249, 115, 22, 0.1) 100%)',
                    mixBlendMode: 'overlay'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add the shine animation
const styles = `
@keyframes shine {
  0% {
    transform: translateX(-200%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(200%);
    opacity: 0;
  }
}

.animate-shine {
  animation: shine 8s ease-in-out infinite;
}
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
