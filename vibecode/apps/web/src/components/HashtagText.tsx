'use client';

import Link from 'next/link';
import { Fragment } from 'react';

interface HashtagTextProps {
  text: string;
  className?: string;
}

// Regex to match hashtags: # followed by letter, then letters/numbers/underscores
const HASHTAG_REGEX = /#([a-zA-Z][a-zA-Z0-9_]{0,49})/g;

/**
 * Renders text with clickable hashtag links
 * Hashtags are styled in terminal accent color and link to /tags/[tag]
 */
export function HashtagText({ text, className }: HashtagTextProps) {
  if (!text) return null;

  const parts: (string | JSX.Element)[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  // Reset regex state
  HASHTAG_REGEX.lastIndex = 0;

  while ((match = HASHTAG_REGEX.exec(text)) !== null) {
    // Add text before the hashtag
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }

    // Add the hashtag as a link
    const tagName = match[1].toLowerCase();
    parts.push(
      <Link
        key={`${tagName}-${match.index}`}
        href={`/tags/${tagName}`}
        className="text-terminal-accent hover:text-terminal-accent/80 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        #{match[1]}
      </Link>
    );

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last hashtag
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  // If no hashtags found, just return the text
  if (parts.length === 0) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </span>
  );
}
