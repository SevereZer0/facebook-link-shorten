const NUMERIC_ID = /^\d+$/;

function buildResult(ownerId, postId) {
  const path = `/${ownerId}/posts/${postId}`;
  return {
    ownerId,
    postId,
    facebookUrl: `https://www.facebook.com${path}`,
    facebedUrl: `https://facebed.seria.moe${path}`,
  };
}

export function convertFacebookUrl(input) {
  let url;
  try {
    url = new URL(String(input).trim());
  } catch {
    throw new Error('Enter a valid Facebook URL.');
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, '');
  const isFacebook = host === 'facebook.com' || host === 'm.facebook.com';
  const isFacebed = host === 'facebed.com' || host === 'facebed.seria.moe';

  if (!isFacebook && !isFacebed) {
    throw new Error('Enter a valid Facebook URL.');
  }

  if (/^\/share(?:\/|$)/i.test(url.pathname)) {
    const suffix = `${url.pathname}${url.search}${url.hash}`;
    return {
      ownerId: null,
      postId: null,
      facebookUrl: `https://www.facebook.com${suffix}`,
      facebedUrl: `https://facebed.seria.moe${suffix}`,
    };
  }

  const reelMatch = url.pathname.match(/^\/reel\/(\d+)\/?$/i);
  if (reelMatch) {
    const suffix = `${url.pathname}${url.search}${url.hash}`;
    return {
      ownerId: null,
      postId: reelMatch[1],
      facebookUrl: `https://www.facebook.com${suffix}`,
      facebedUrl: `https://facebed.seria.moe${suffix}`,
    };
  }

  const groupMatch = url.pathname.match(/^\/groups\/(\d+)\/posts\/(\d+)\/?$/i);
  if (groupMatch) {
    const suffix = `${url.pathname}${url.search}${url.hash}`;
    return {
      ownerId: groupMatch[1],
      postId: groupMatch[2],
      facebookUrl: `https://www.facebook.com${suffix}`,
      facebedUrl: `https://facebed.seria.moe${suffix}`,
    };
  }

  const postMatch = url.pathname.match(/^\/([^/]+)\/posts\/([^/?#]+)\/?$/i);
  if (postMatch) {
    const ownerId = postMatch[1];
    const postId = postMatch[2];

    if (/^pfbid/i.test(postId)) {
      throw new Error('This pfbid link does not expose the numeric post ID needed for the short legacy URL.');
    }
    if (!NUMERIC_ID.test(ownerId) || !NUMERIC_ID.test(postId)) {
      throw new Error('This post URL does not contain both numeric owner and post IDs.');
    }

    return buildResult(ownerId, postId);
  }

  if (/\/(?:story|permalink)\.php$/i.test(url.pathname)) {
    const ownerId = url.searchParams.get('id')?.trim() ?? '';
    const postId = url.searchParams.get('story_fbid')?.trim() ?? '';

    if (/^pfbid/i.test(postId)) {
      throw new Error('This pfbid link does not expose the numeric post ID needed for the short legacy URL.');
    }
    if (!NUMERIC_ID.test(ownerId) || !NUMERIC_ID.test(postId)) {
      throw new Error('This URL needs numeric id and story_fbid values.');
    }

    return buildResult(ownerId, postId);
  }

  throw new Error('This Facebook URL format is not supported yet.');
}
