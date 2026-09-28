'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function LandingAnimation({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const decorRef = useRef<HTMLDivElement>(null);
  const leftCurtainRef = useRef<HTMLDivElement>(null);
  const rightCurtainRef = useRef<HTMLDivElement>(null);
  const revealSeamRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const lineOneRef = useRef<HTMLParagraphElement>(null);
  const lineTwoRef = useRef<HTMLParagraphElement>(null);
  const lineThreeRef = useRef<HTMLParagraphElement>(null);
  const lineFourRef = useRef<HTMLParagraphElement>(null);
  const provenanceRef = useRef<HTMLParagraphElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const completionRef = useRef(onComplete);
  const [progress, setProgress] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    completionRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);
    if (media.matches) return;

    const context = gsap.context(() => {
      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: 'power3.out' },
        onComplete: () => completionRef.current(),
        onUpdate: () => setProgress(timeline.progress()),
      });

      timelineRef.current = timeline;

      timeline
        .fromTo(lineOneRef.current,
          { autoAlpha: 0, y: 20, filter: 'blur(8px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1 },
        )
        .to(lineOneRef.current, { autoAlpha: 0, y: -12, filter: 'blur(5px)', duration: 0.6 }, '+=1.15')
        .fromTo(lineTwoRef.current,
          { autoAlpha: 0, y: 18, letterSpacing: '0.08em', filter: 'blur(7px)' },
          { autoAlpha: 1, y: 0, letterSpacing: '0em', filter: 'blur(0px)', duration: 1.05 },
          '-=0.12',
        )
        .to(lineTwoRef.current, { autoAlpha: 0, y: -10, duration: 0.55 }, '+=1.2')
        .fromTo(lineThreeRef.current,
          { autoAlpha: 0, scale: 0.985, filter: 'blur(7px)' },
          { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 1.05 },
          '-=0.1',
        )
        .to(lineThreeRef.current, { autoAlpha: 0, y: -8, duration: 0.5 }, '+=1.2')
        .fromTo(lineFourRef.current,
          { autoAlpha: 0, y: 16, filter: 'blur(5px)' },
          { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.9 },
          '-=0.08',
        )
        .fromTo(provenanceRef.current,
          { autoAlpha: 0, y: 8 },
          { autoAlpha: 1, y: 0, duration: 0.55 },
          '-=0.45',
        )
        .to([decorRef.current, copyRef.current, controlsRef.current], {
          autoAlpha: 0,
          y: -10,
          duration: 0.4,
          ease: 'power2.in',
        }, '+=1.2')
        .fromTo(revealSeamRef.current,
          { autoAlpha: 0, scaleY: 0 },
          { autoAlpha: 0.9, scaleY: 1, duration: 0.28, ease: 'power2.out' },
          '<+0.08',
        )
        .to(leftCurtainRef.current, {
          xPercent: -102,
          duration: 1.15,
          ease: 'power4.inOut',
        }, '<+0.2')
        .to(rightCurtainRef.current, {
          xPercent: 102,
          duration: 1.15,
          ease: 'power4.inOut',
        }, '<')
        .to(revealSeamRef.current, {
          autoAlpha: 0,
          duration: 0.2,
          ease: 'power1.out',
        }, '<');
    }, containerRef);

    const getTimeline = () => timelineRef.current;
    const advance = (amount: number) => {
      const timeline = getTimeline();
      if (!timeline) return;
      const nextProgress = Math.min(1, timeline.progress() + amount);
      timeline.progress(nextProgress);
      setProgress(nextProgress);
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      advance(Math.max(-0.16, Math.min(0.16, event.deltaY * 0.001)));
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown' || event.key === ' ') {
        event.preventDefault();
        advance(0.1);
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        advance(-0.1);
      } else if (event.key === 'Enter' || event.key === 'Escape') {
        event.preventDefault();
        skipToArchive();
      }
    };

    function skipToArchive() {
      const timeline = getTimeline();
      if (!timeline) return;
      gsap.to(timeline, {
        progress: 1,
        duration: 0.85,
        ease: 'power2.inOut',
        overwrite: true,
      });
    }

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('keydown', handleKeyDown);
      timelineRef.current?.kill();
      context.revert();
    };
  }, []);

  const handleSkip = () => {
    if (reducedMotion) {
      completionRef.current();
      return;
    }
    const timeline = timelineRef.current;
    if (!timeline) return;
    gsap.to(timeline, {
      progress: 1,
      duration: 0.85,
      ease: 'power2.inOut',
      overwrite: true,
    });
  };

  const handleAdvance = () => {
    if (reducedMotion) return;
    const timeline = timelineRef.current;
    if (!timeline) return;
    const nextProgress = Math.min(1, timeline.progress() + 0.1);
    timeline.progress(nextProgress);
    setProgress(nextProgress);
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 flex items-center justify-center overflow-hidden cursor-pointer ${reducedMotion ? 'landing-reduced-motion' : ''}`}
      role="region"
      aria-label="Permanence Protocol introduction"
      onClick={(event) => {
        if ((event.target as HTMLElement).closest('button, a')) return;
        handleAdvance();
      }}
      style={{
        color: '#faf9f7',
        zIndex: 9999,
        willChange: reducedMotion ? 'auto' : 'transform',
      }}
    >
      <div
        ref={leftCurtainRef}
        className="landing-curtain landing-curtain-left"
        aria-hidden="true"
      />
      <div
        ref={rightCurtainRef}
        className="landing-curtain landing-curtain-right"
        aria-hidden="true"
      />
      <div
        ref={revealSeamRef}
        className="landing-reveal-seam"
        aria-hidden="true"
      />

      <div ref={decorRef} className="absolute inset-0 z-[3] pointer-events-none" aria-hidden="true">
        <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-white/[0.035]" />
        <div className="absolute left-6 right-6 top-6 flex justify-between archive-mono text-[10px] tracking-[0.16em] text-white/35 sm:left-10 sm:right-10 sm:top-8">
          <span>FIELD NOTE 001</span>
          <span>AN ARCHIVE FOR IDEAS</span>
        </div>
      </div>

      <div ref={copyRef} className="relative z-[4] mx-auto flex min-h-[min(70vh,520px)] w-full max-w-5xl items-center justify-center px-6 text-center sm:px-12">
        <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
          <p ref={lineOneRef} className="max-w-4xl archive-display text-[clamp(2.5rem,7vw,6rem)] leading-[1.08] tracking-[-0.04em] text-white" style={{ opacity: 0 }}>
            Before it becomes a theory,<br />before anyone agrees…
          </p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
          <p ref={lineTwoRef} className="max-w-4xl archive-display text-[clamp(2.8rem,8vw,7rem)] leading-[1.05] tracking-[-0.04em] text-white" style={{ opacity: 0 }}>
            there is a first thought.
          </p>
        </div>
        <div className="absolute inset-0 flex items-center justify-center px-6 sm:px-12">
          <p ref={lineThreeRef} className="max-w-4xl archive-display text-[clamp(2.8rem,8vw,7rem)] leading-[1.05] tracking-[-0.04em] text-white" style={{ opacity: 0 }}>
            Keep the words as they were written.
          </p>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 sm:px-12">
          <p ref={lineFourRef} className="max-w-4xl archive-display text-[clamp(2.7rem,7.5vw,6.5rem)] leading-[1.06] tracking-[-0.04em] text-white" style={{ opacity: 0 }}>
            Let the conversation continue.
          </p>
          <p ref={provenanceRef} className="mt-6 max-w-lg text-sm leading-relaxed text-white/55 sm:text-base" style={{ opacity: 0 }}>
            The text is held in an archive. Its hash is recorded on Arbitrum Sepolia, a test network.
          </p>
        </div>

        {reducedMotion && (
          <div className="absolute inset-x-6 bottom-3 text-center sm:bottom-0">
            <p className="archive-display text-2xl leading-snug text-white sm:text-3xl">An idea begins with a first thought.</p>
            <p className="mt-3 text-sm text-white/60">Read the words. Follow the conversation. Check the record.</p>
          </div>
        )}
      </div>

      <div ref={controlsRef} className="absolute inset-x-6 bottom-7 z-[4] flex flex-col items-center gap-4 sm:bottom-9">
        <div className="h-px w-40 overflow-hidden bg-white/15" aria-hidden="true">
          <div className="h-full bg-[#c17a5f] transition-[width] duration-150" style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="archive-mono text-[10px] tracking-[0.12em] text-white/45">
          {reducedMotion ? 'MOTION REDUCED' : 'SCROLL OR USE THE ARROW KEYS TO UNCOVER'}
        </p>
        <button
          type="button"
          onClick={handleSkip}
          className="border border-white/30 px-5 py-2 text-xs text-white/85 transition-colors hover:border-white/70 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
        >
          Enter the archive <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>
  );
}
