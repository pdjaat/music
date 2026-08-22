import { useState } from 'react';
import { Music2 } from 'lucide-react';

interface ArtworkProps {
  src?: string | null;
  alt: string;
  className?: string;
  rounded?: string;
}

/** Image with elegant fallback when artwork is missing (common on IA items). */
export function Artwork({ src, alt, className = '', rounded = 'rounded-xl' }: ArtworkProps) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) {
    return (
      <div className={`${rounded} ${className} flex items-center justify-center bg-brand-soft`}>
        <Music2 className="h-1/3 w-1/3 text-accent-400/80" aria-hidden />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      className={`${rounded} ${className} object-cover`}
      onError={() => setFailed(true)}
    />
  );
}
