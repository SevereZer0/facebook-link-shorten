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

function buildPassthroughResult(url) {
  const suffix = `${url.pathname}${url.search}${url.hash}`;
  return {
    ownerId: null,
    postId: null,
    facebookUrl: `https://www.facebook.com${suffix}`,
    facebedUrl: `${FACEBED_ORIGIN}${suffix}`,
  };
}

function normalizeInput(input) {
  const value = String(input ?? '').trim();

  if (!value) {
    throw new Error('Enter a valid Facebook URL.');
  }

  // Accept a plain URL, a URL without https://, or text copied/shared by an app
  // that contains a Facebook URL.
  const match = value.match(
    /(?:https?:\/\/|\/\/)?(?:[a-z0-9-]+\.)*facebook\.com\/[^\s<>"']+/i
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

  const postMatch = url.pathname.match(/^\/([^/]+)\/posts\/(\d+)\/?$/i);
  if (postMatch && NUMERIC_ID.test(postMatch[1])) {
    return buildResult(postMatch[1], postMatch[2]);
  }

  if (/\/(?:story|permalink)\.php$/i.test(url.pathname)) {
    const ownerId = url.searchParams.get('id')?.trim() ?? '';
    const postId = url.searchParams.get('story_fbid')?.trim() ?? '';
    if (NUMERIC_ID.test(ownerId) && NUMERIC_ID.test(postId)) {
      return buildResult(ownerId, postId);
    }
  }

  return buildPassthroughResult(url);
}
