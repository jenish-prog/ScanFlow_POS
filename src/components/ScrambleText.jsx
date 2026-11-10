import React, { useEffect, useState } from 'react';

const ENCRYPTED_TEXT_CHARS = '-_~`!@#$%^&*()+=[]{}|;:,.<>?';
const MAX_REVEAL_STEPS = 48;

function getTextSegments(text) {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, {
      granularity: 'grapheme',
    });

    return Array.from(segmenter.segment(text), ({ segment }) => segment);
  }

  return Array.from(text);
}

function getRandomEncryptedTextChar() {
  return ENCRYPTED_TEXT_CHARS[
    Math.floor(Math.random() * ENCRYPTED_TEXT_CHARS.length)
  ];
}

function getStableEncryptedTextChar(segment, index) {
  let hash = index + 1;

  for (const character of segment) {
    hash = (hash * 31 + (character.codePointAt(0) || 0)) % 2147483647;
  }

  return ENCRYPTED_TEXT_CHARS[hash % ENCRYPTED_TEXT_CHARS.length];
}

function getEncryptedTextChar(segment, index, mode) {
  return mode === 'stable'
    ? getStableEncryptedTextChar(segment, index)
    : getRandomEncryptedTextChar();
}

function scrambleSegments(segments, revealedCount, mode) {
  return segments
    .map((segment, index) => {
      if (segment.trim() === '' || index < revealedCount) return segment;
      return getEncryptedTextChar(segment, index, mode);
    })
    .join('');
}

function scrambleText(text, revealedCount, mode) {
  return scrambleSegments(getTextSegments(text), revealedCount, mode);
}

function shouldReduceMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export default function ScrambleText({
  children,
  className = '',
  intervalMs = 32,
}) {
  const [displayText, setDisplayText] = useState(() =>
    scrambleText(children, 0, 'stable')
  );

  useEffect(() => {
    const segments = getTextSegments(children);

    if (segments.length === 0 || intervalMs <= 0 || shouldReduceMotion()) {
      setDisplayText(children);
      return undefined;
    }

    let revealedCount = 0;
    const revealStep = Math.max(1, Math.ceil(segments.length / MAX_REVEAL_STEPS));
    setDisplayText(scrambleSegments(segments, revealedCount, 'random'));

    const timer = window.setInterval(() => {
      revealedCount = Math.min(segments.length, revealedCount + revealStep);
      setDisplayText(scrambleSegments(segments, revealedCount, 'random'));

      if (revealedCount >= segments.length) window.clearInterval(timer);
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [children, intervalMs]);

  return (
    <span className={`inline-block ${className}`}>
      <span aria-hidden="true">{displayText}</span>
      <span aria-atomic="true" aria-live="polite" className="sr-only">
        {children}
      </span>
    </span>
  );
}
