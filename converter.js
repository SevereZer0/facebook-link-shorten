const NUMERIC_ID = /^\d+$/;
const FACEBED_ORIGIN = 'https://facebed.seria.moe';

function buildResult(ownerId, postId) {
  const path = `/${ownerId}/posts/${postId}`;
  return {
    ownerId,
    postId,
    facebookUrl: `https://www.facebook.com${path}`,
    facebedUrl: `${FACEBED_ORIGIN}${path}`,
  };
}

function buildFromSuffix(suffix) {
  return {
    ownerId: null,
    postId: null,
    facebookUrl: `https://www.facebook.com${suffix}`,
    facebedUrl: `${FACEBED_ORIGIN}${suffix}`,
  };
}

function cleanPath(pathname) {
  if (!pathname) return '/';
  const trimmed = pathname.replace(/\/{2,}/g, '/');
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, '') : trimmed;
}

function firstParam(url, names) {
  for (const name of names) {
    const value = url.searchParams.get(name)?.trim();
    if (value) return value;
  }
  return '';
}

function shortestSuffix(url) {
  const path = cleanPath(url.pathname);

  // Reels are fully identified by the path.
  const reel = path.match(/^\/reel\/([^/]+)$/i);
  if (reel) return `/reel/${reel[1]}`;

  // Facebook short/share links are fully identified by their token.
  const share = path.match(/^\/share\/(p|r|v)\/([^/]+)$/i);
  if (share) return `/share/${share[1].toLowerCase()}/${share[2]}`;

  // Username/page videos.
  const videoPath = path.match(/^\/([^/]+)\/videos\/([^/]+)$/i);
  if (videoPath) return `/${videoPath[1]}/videos/${videoPath[2]}`;

  // Group posts/permalinks.
  const groupPost = path.match(/^\/groups\/([^/]+)\/(posts|permalink)\/([^/]+)$/i);
  if (groupPost) {
    return `/groups/${groupPost[1]}/${groupPost[2].toLowerCase()}/${groupPost[3]}`;
  }

  // Username/page post links.
  const post = path.match(/^\/([^/]+)\/posts\/([^/]+)$/i);
  if (post) return `/${post[1]}/posts/${post[2]}`;

  // Watch URLs need only the video ID.
  if (/^\/watch$/i.test(path)) {
    const videoId = firstParam(url, ['v']);
    if (videoId) return `/watch/?v=${encodeURIComponent(videoId)}`;
  }

  // Photo URLs need only fbid.
  if (/^\/(?:photo|photo\.php)$/i.test(path)) {
    const photoId = firstParam(url, ['fbid']);
    if (photoId) return `/photo/?fbid=${encodeURIComponent(photoId)}`;
  }

  // Older video.php URLs need only v.
  if (/^\/video\.php$/i.test(path)) {
    const videoId = firstParam(url, ['v']);
    if (videoId) return `/video.php?v=${encodeURIComponent(videoId)}`;
  }

  // Story/permalink query URLs: normalize numeric IDs to the shortest legacy post path.
  if (/^\/(?:story|permalink)\.php$/i.test(path)) {
    const ownerId = firstParam(url, ['id']);
    const postId = firstParam(url, ['story_fbid']);
    if (NUMERIC_ID.test(ownerId) && NUMERIC_ID.test(postId)) {
      return `/${ownerId}/posts/${postId}`;
    }

    const params = new URLSearchParams();
    if (postId) params.set('story_fbid', postId);
    if (ownerId) params.set('id', ownerId);
    const query = params.toString();
    if (query) return `${path}?${query}`;
  }

  // Unknown routes: keep parameters that may be functional, but drop common
  // tracking/deep-link noise and fragments.
  const params = new URLSearchParams(url.search);
  const trackingKeys = new Set([
    'referral_source',
    'original_uri',
    'fbclid',
    'mibextid',
    'ref',
    'refsrc',
    '__tn__',
    '__cft__',
    'acontext',
    'paipv',
    'eav',
  ]);

  for (const key of [...params.keys()]) {
    if (
      trackingKeys.has(key.toLowerCase()) ||
      key.toLowerCase().startsWith('utm_')
    ) {
      params.delete(key);
    }
  }

  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

function normalizeInput(input) {
  const value = String(input ?? '').trim();

  if (!value) {
    throw new Error('Enter a valid Facebook URL.');
  }

  // Accept Facebook or Facebed links, with or without a protocol, including
  // links embedded inside text copied/shared by another app.
  const match = value.match(
    /(?:https?:\/\/|\/\/)?(?:(?:[a-z0-9-]+\.)*facebook\.com|facebed\.seria\.moe|facebed\.com)\/[^\s<>"']+/i
  );

  if (!match) {
    throw new Error('Enter a valid Facebook URL.');
  }

  let candidate = match[0].replace(/[),.;!?]+$/, '');

  if (candidate.startsWith('//')) {
    candidate = `https:${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  return candidate;
}

export function convertFacebookUrl(input) {
  let url;
  try {
    url = new URL(normalizeInput(input));
  } catch {
    throw new Error('Enter a valid Facebook URL.');
  }

  const host = url.hostname.toLowerCase();
  const isFacebook = host === 'facebook.com' || host.endsWith('.facebook.com');
  const isFacebed = host === 'facebed.com' || host === 'facebed.seria.moe';

  if (!isFacebook && !isFacebed) {
    throw new Error('Enter a valid Facebook URL.');
  }

  const postMatch = cleanPath(url.pathname).match(/^\/([^/]+)\/posts\/(\d+)$/i);
  if (postMatch && NUMERIC_ID.test(postMatch[1])) {
    return buildResult(postMatch[1], postMatch[2]);
  }

  const suffix = shortestSuffix(url);
  return buildFromSuffix(suffix);
}
