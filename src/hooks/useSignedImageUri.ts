import { useEffect, useState } from 'react';
import { getSignedDownloadUrl, isR2Key } from '../services/uploadService';

// Resolves a stored image value into something <Image source={{uri}}> can
// actually load. Values already in R2 are stored as bucket keys (private
// bucket — no permanent public URL), so they need a freshly-signed GET URL;
// anything else (a local file:// URI, or a legacy http(s) URL from before
// R2 existed) is already directly usable.
export function useSignedImageUri(rawValue?: string | null): string | undefined {
  const [resolvedUrl, setResolvedUrl] = useState<string | undefined>(
    isR2Key(rawValue) ? undefined : rawValue ?? undefined
  );

  useEffect(() => {
    if (!isR2Key(rawValue)) {
      setResolvedUrl(rawValue ?? undefined);
      return;
    }
    let cancelled = false;
    getSignedDownloadUrl(rawValue)
      .then((url) => { if (!cancelled) setResolvedUrl(url); })
      .catch(() => { if (!cancelled) setResolvedUrl(undefined); });
    return () => { cancelled = true; };
  }, [rawValue]);

  return resolvedUrl;
}
