import { extractCommunityLeadSignal } from './extractor-agent';
import type { CommunityLeadSignal, CommunityObservationMessage, CommunityRawPost } from './types';

function findPost(posts: CommunityRawPost[], postId: string) {
  return posts.find((item) => item.id === postId);
}

export function runRagRole(args: {
  posts: CommunityRawPost[];
  messages: CommunityObservationMessage[];
}) {
  const cleaned: CommunityLeadSignal[] = [];

  args.messages.forEach((message) => {
    const post = findPost(args.posts, message.postId);
    if (!post) return;
    const signal = extractCommunityLeadSignal(post);
    cleaned.push({
      ...signal,
      warnings: [...new Set([...signal.warnings, ...message.warnings])],
    });
  });

  return cleaned;
}
