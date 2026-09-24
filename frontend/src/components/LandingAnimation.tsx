'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function LandingAnimation({ onComplete }: { onComplete: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const text1Ref = useRef<HTMLDivElement>(null);
  const text2Ref = useRef<HTMLDivElement>(null);
  const text3Ref = useRef<HTMLDivElement>(null);
  const text4Ref = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const [progress, setProgress] = useState(0);
  const [showHint, setShowHint] = useState(true);

  useEffect(() => {
    const tl = gsap.timeline({
      paused: true, // Start paused, controlled by user
      onComplete,
      defaults: {
        ease: 'power4.inOut'
      }
    });

    timelineRef.current = tl;

    // Beat 1: "Ideas die quietly." - Text fractures into particles
    tl.fromTo(text1Ref.current,
      { opacity: 0, y: 50 },
      { opacity: 1, y: 0, duration: 1.5 }
    )
    .to(text1Ref.current, {
      opacity: 0,
      scale: 1.2,
      filter: 'blur(10px)',
      duration: 1,
      ease: 'power2.in'
    }, '+=1.5')
    .addLabel('fragmentation')
    .fromTo(particlesRef.current,
      { opacity: 0, scale: 0 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'elastic.out(1, 0.5)' },
      'fragmentation-=0.5'
    )
    .to(particlesRef.current, {
      opacity: 0,
      y: -200,
      duration: 1.5,
      ease: 'expo.inOut'
    }, 'fragmentation+=0.3')

    // Beat 2: "Locked. Forever." - Text crystallizes into solid block
    .addLabel('crystallization')
    .fromTo(text2Ref.current,
      { opacity: 0, scale: 0.8, filter: 'blur(5px)' },
      { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.2, ease: 'elastic.out(1, 0.5)' },
      'crystallization'
    )
    .to(text2Ref.current, {
      opacity: 0,
      scale: 1.1,
      filter: 'blur(2px)',
      duration: 0.8,
      ease: 'power2.in'
    }, 'crystallization+=2')

    // Beat 3: "Unchangeable. Verifiable." - Block opens like vault
    .addLabel('vault')
    .fromTo(text3Ref.current,
      { opacity: 0, y: 30 },
      { opacity: 1, y: 0, duration: 1, ease: 'expo.out' },
      'vault'
    )
    .to(text3Ref.current, {
      opacity: 0,
      scale: 0.95,
      duration: 0.6,
      ease: 'power2.in'
    }, 'vault+=2')

    // Beat 4: "Enter." - Transition to app
    .addLabel('enter')
    .fromTo(text4Ref.current,
      { opacity: 0, scale: 0.9 },
      { opacity: 1, scale: 1, duration: 0.8, ease: 'expo.out' },
      'enter'
    )
    .to(containerRef.current, {
      opacity: 0,
      duration: 0.5,
      ease: 'power2.in'
    }, 'enter+=1.5');

    // Update progress on timeline update
    tl.eventCallback('onUpdate', () => {
      setProgress(tl.progress());
    });

    // Scroll control
    const handleScroll = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY * 0.001;
      const newProgress = Math.max(0, Math.min(1, tl.progress() + delta));
      tl.progress(newProgress);
      
      // Hide hint once user starts scrolling
      if (newProgress > 0.05) {
        setShowHint(false);
      }
    };

    // Keyboard control
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
        e.preventDefault();
        const newProgress = Math.min(1, tl.progress() + 0.05);
        tl.progress(newProgress);
        setShowHint(false);
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const newProgress = Math.max(0, tl.progress() - 0.05);
        tl.progress(newProgress);
        setShowHint(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        tl.progress(1); // Skip to end
        setShowHint(false);
      }
    };

    // Add event listeners
    window.addEventListener('wheel', handleScroll, { passive: false });
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      tl.kill();
      window.removeEventListener('wheel', handleScroll);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onComplete]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 flex items-center justify-center bg-ink cursor-pointer"
      style={{ backgroundColor: 'var(--color-ink)', zIndex: 9999 }}
      onClick={() => {
        // Click to advance slightly
        if (timelineRef.current) {
          const newProgress = Math.min(1, timelineRef.current.progress() + 0.1);
          timelineRef.current.progress(newProgress);
          setShowHint(false);
        }
      }}
    >
      <div className="relative">
        {/* Subtle scroll indicator */}
        {showHint && (
          <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2 text-white/40 text-xs archive-mono">
              <div className="w-6 h-px bg-white/40"></div>
              <span>Scroll to explore</span>
              <div className="w-6 h-px bg-white/40"></div>
            </div>
          </div>
        )}

        {/* Beat 1 */}
        <div
          ref={text1Ref}
          className="absolute inset-0 flex items-center justify-center text-white archive-display"
          style={{ fontSize: 'var(--text-display-xl)', opacity: 0 }}
        >
          Ideas die quietly.
        </div>

        {/* Beat 2 */}
        <div
          ref={text2Ref}
          className="absolute inset-0 flex items-center justify-center text-white archive-display"
          style={{ fontSize: 'var(--text-display-xl)', opacity: 0 }}
        >
          Locked. Forever.
        </div>

        {/* Beat 3 */}
        <div
          ref={text3Ref}
          className="absolute inset-0 flex items-center justify-center text-white archive-display"
          style={{ fontSize: 'var(--text-display-xl)', opacity: 0 }}
        >
          Unchangeable. Verifiable.
        </div>

        {/* Beat 4 */}
        <div
          ref={text4Ref}
          className="absolute inset-0 flex items-center justify-center text-white archive-display"
          style={{ fontSize: 'var(--text-display-xl)', opacity: 0 }}
        >
          Enter.
        </div>

        {/* Particles */}
        <div
          ref={particlesRef}
          className="absolute inset-0 opacity-0"
          style={{
            background: 'radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%)',
            opacity: 0
          }}
        />
      </div>
    </div>
  );
}