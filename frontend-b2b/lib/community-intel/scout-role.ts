import type { CommunityObservationMessage, CommunityRawPost, CommunityScoutResult } from './types';

function rawTextFor(post: CommunityRawPost) {
  return [post.title || '', post.body || '', ...(post.comments || []).slice(0, 5)].join(' ').trim();
}

export function runScoutRole(posts: CommunityRawPost[]): CommunityScoutResult {
  const messages: CommunityObservationMessage[] = [];
  const dropped: CommunityScoutResult['dropped'] = [];

  posts.forEach((post) => {
    const rawText = rawTextFor(post);
    if (!rawText) {
      dropped.push({ postId: post.id, reason: 'empty_text' });
      return;
    }

    if (rawText.length < 12) {
      dropped.push({ postId: post.id, reason: 'too_short' });
      return;
    }

    const warnings: string[] = [];
    if ((post.comments || []).length > 10) {
      warnings.push('comment_heavy');
    }

    const captureWeight =
      Math.min(rawText.length, 800) / 800 * 0.4 +
      Math.min(post.metrics?.replies || 0, 20) / 20 * 0.3 +
      Math.min(post.metrics?.likes || 0, 100) / 100 * 0.3;

    messages.push({
      postId: post.id,
      source: post.source,
      rawText,
      captureWeight: Number(captureWeight.toFixed(4)),
      warnings,
    });
  });

  return { messages, dropped };
}
