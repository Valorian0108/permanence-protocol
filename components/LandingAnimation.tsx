'use client';

import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const introduction = [
  {
    eyebrow: 'FIELD NOTE 001',
    title: <>Before it becomes a theory,<br />before anyone agrees…</>,
    detail: 'There is a first thought.',
  },
  {
    eyebrow: 'THE READING ROOM',
    title: <>Keep the words<br />as they were written.</>,
    detail: 'Read ideas. Follow the conversation. Check the record.',
  },
  {
    eyebrow: 'A PUBLIC ARCHIVE',
    title: <>Let the conversation<br />continue.</>,
    detail: 'Readable text is held in an archive. Its hash is recorded on Arbitrum Sepolia, a test network.',
  },
];

export default function LandingAnimation({ onComplete }: { onComplete: () => void }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const leftCurtainRef = useRef<HTMLDivElement>(null);
  const rightCurtainRef = useRef<HTMLDivElement>(null);
  const seamRef = useRef<HTMLDivElement>(null);
  const completionRef = useRef(onComplete);
  const [activeSlide, setActiveSlide] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    completionRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(media.matches);

    const handleMotionChange = (event: MediaQueryListEvent) => setReducedMotion(event.matches);
    media.addEventListener('change', handleMotionChange);
    return () => media.removeEventListener('change', handleMotionChange);
  }, []);

  useEffect(() => {
    if (reducedMotion || !contentRef.current) return;
    gsap.fromTo(contentRef.current,
      { autoAlpha: 0, y: 18, scale: 0.985, filter: 'blur(5px)' },
      { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out' },
    );
  }, [activeSlide, reducedMotion]);

  const enterArchive = () => {
    if (reducedMotion) {
      completionRef.current();
      return;
    }
    const transition = gsap.timeline({ onComplete: () => completionRef.current() });
    transition
      .to(contentRef.current, { autoAlpha: 0, y: -12, duration: 0.28, ease: 'power2.in' })
      .to(seamRef.current, { autoAlpha: 0.85, scaleY: 1, duration: 0.22, ease: 'power2.out' }, '<+0.04')
      .to(leftCurtainRef.current, { xPercent: -102, duration: 0.82, ease: 'power4.inOut' }, '<+0.14')
      .to(rightCurtainRef.current, { xPercent: 102, duration: 0.82, ease: 'power4.inOut' }, '<')
      .to(seamRef.current, { autoAlpha: 0, duration: 0.18 }, '<');
  };

  const slide = introduction[activeSlide];

  return (
    <div
      className={`landing-intro fixed inset-0 flex items-center justify-center overflow-hidden ${reducedMotion ? 'landing-reduced-motion' : ''}`}
      role="region"
      aria-label="Permanence Protocol introduction"
      aria-roledescription="introduction"
      style={{ color: '#faf9f7', zIndex: 9999 }}
    >
      <div ref={leftCurtainRef} className="landing-curtain landing-curtain-left" aria-hidden="true" />
      <div ref={rightCurtainRef} className="landing-curtain landing-curtain-right" aria-hidden="true" />
      <div ref={seamRef} className="landing-reveal-seam" aria-hidden="true" />
      <div className="landing-intro-grain" aria-hidden="true" />

      <div ref={contentRef} className="landing-intro-content relative z-[4] mx-auto flex w-full max-w-5xl flex-col items-center px-6 text-center sm:px-12">
        <div className="landing-intro-topline archive-mono">
          <span>{slide.eyebrow}</span>
          <span>AN ARCHIVE FOR IDEAS</span>
        </div>

        <div className="landing-intro-copy" aria-live="polite" aria-atomic="true">
          <h1 className="archive-display">{slide.title}</h1>
          <p className="landing-intro-detail">{slide.detail}</p>
        </div>

        <div className="landing-intro-controls">
          <div className="landing-intro-progress" aria-label={`Introduction step ${activeSlide + 1} of ${introduction.length}`}>
            {introduction.map((step, index) => (
              <span key={step.eyebrow} className={index === activeSlide ? 'is-current' : index < activeSlide ? 'is-complete' : ''} />
            ))}
          </div>

          <p className="archive-mono landing-intro-hint">
            {reducedMotion ? 'REDUCED MOTION' : `STEP ${String(activeSlide + 1).padStart(2, '0')} OF ${String(introduction.length).padStart(2, '0')}`}
          </p>

          <div className="landing-intro-actions">
            {activeSlide > 0 && (
              <button type="button" className="landing-intro-back" onClick={() => setActiveSlide((step) => Math.max(0, step - 1))}>
                <span aria-hidden="true">←</span> Back
              </button>
            )}
            {activeSlide < introduction.length - 1 ? (
              <button type="button" className="landing-intro-continue" onClick={() => setActiveSlide((step) => Math.min(introduction.length - 1, step + 1))}>
                Continue <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button type="button" className="landing-intro-continue" onClick={enterArchive}>
                Enter the archive <span aria-hidden="true">→</span>
              </button>
            )}
            {activeSlide < introduction.length - 1 && (
              <button type="button" className="landing-intro-skip" onClick={enterArchive}>
                Skip introduction
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
