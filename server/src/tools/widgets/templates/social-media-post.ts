import type { WidgetTemplate } from '@fligen/shared';

/**
 * Format numbers for display (1000 → 1k)
 */
function formatNumber(num: number): string {
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  }
  return num.toString();
}

/**
 * Render social media post widget as HTML
 */
export function renderSocialMediaPost(params: Record<string, any>): string {
  const {
    author_name = 'Claude',
    handle = '@claudeai',
    timestamp = 'Today',
    verified = true,
    post_text = '',
    avatar_url = '',
    comments = 0,
    retweets = 0,
    likes = 0,
    views = 0,
    theme = 'dark',
  } = params;

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#0f172a';
  const accentColor = '#ffde59'; // AppyDave yellow
  const borderColor = isDark ? '#334155' : '#e2e8f0';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Widget: ${author_name} - ${post_text.substring(0, 50)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Oswald:wght@400;600&family=Roboto:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: 'Roboto', sans-serif;
      background: transparent;
      padding: 20px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    .widget {
      max-width: 600px;
      width: 100%;
      background: ${bgColor};
      color: ${textColor};
      border: 1px solid ${borderColor};
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }
    .header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: linear-gradient(135deg, #ff6b35, ${accentColor});
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }
    .avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 50%;
    }
    .author-info {
      flex: 1;
    }
    .author-name {
      font-family: 'Oswald', sans-serif;
      font-weight: 600;
      font-size: 18px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .verified {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 20px;
      height: 20px;
      background: #3b82f6;
      border-radius: 50%;
      color: white;
      font-size: 12px;
    }
    .meta {
      font-size: 14px;
      color: ${isDark ? '#94a3b8' : '#64748b'};
      font-family: 'Roboto', sans-serif;
    }
    .post-text {
      font-size: 16px;
      line-height: 1.5;
      margin-bottom: 16px;
      white-space: pre-wrap;
    }
    .engagement {
      display: flex;
      gap: 24px;
      padding-top: 16px;
      border-top: 1px solid ${borderColor};
      color: ${isDark ? '#94a3b8' : '#64748b'};
      font-size: 14px;
    }
    .engagement-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
  </style>
</head>
<body>
  <div class="widget">
    <div class="header">
      <div class="avatar">
        ${avatar_url ? `<img src="${avatar_url}" alt="${author_name}">` : '🟠'}
      </div>
      <div class="author-info">
        <div class="author-name">
          ${author_name}
          ${verified ? '<span class="verified">✓</span>' : ''}
        </div>
        <div class="meta">${handle}${timestamp ? ' · ' + timestamp : ''}</div>
      </div>
    </div>
    <div class="post-text">${post_text}</div>
    ${comments || retweets || likes || views ? `
    <div class="engagement">
      ${comments ? `<div class="engagement-item">💬 ${formatNumber(comments)}</div>` : ''}
      ${retweets ? `<div class="engagement-item">🔁 ${formatNumber(retweets)}</div>` : ''}
      ${likes ? `<div class="engagement-item">❤️ ${formatNumber(likes)}</div>` : ''}
      ${views ? `<div class="engagement-item">📊 ${formatNumber(views)}</div>` : ''}
    </div>
    ` : ''}
  </div>
</body>
</html>`;
}

/**
 * Social Media Post Template Definition
 */
export const socialMediaPostTemplate: WidgetTemplate = {
  id: 'social-media-post',
  name: 'Social Media Post',
  description: 'Twitter/X-style post widget',
  params: [
    {
      key: 'author_name',
      label: 'Author Name',
      type: 'text',
      default: 'Claude',
      required: true,
    },
    {
      key: 'handle',
      label: 'Handle',
      type: 'text',
      default: '@claudeai',
      required: true,
    },
    {
      key: 'timestamp',
      label: 'Timestamp',
      type: 'text',
      default: 'Today',
    },
    {
      key: 'verified',
      label: 'Verified Badge',
      type: 'checkbox',
      default: true,
    },
    {
      key: 'post_text',
      label: 'Post Text',
      type: 'textarea',
      default: 'Claude Opus 4.5 just got released',
      required: true,
    },
    {
      key: 'avatar_url',
      label: 'Avatar URL',
      type: 'url',
      default: '',
    },
    {
      key: 'comments',
      label: 'Comments',
      type: 'number',
      default: 1203,
    },
    {
      key: 'retweets',
      label: 'Retweets',
      type: 'number',
      default: 1204,
    },
    {
      key: 'likes',
      label: 'Likes',
      type: 'number',
      default: 135000,
    },
    {
      key: 'views',
      label: 'Views',
      type: 'number',
      default: 1000,
    },
    {
      key: 'theme',
      label: 'Theme',
      type: 'radio',
      default: 'dark',
      options: ['dark', 'light'],
    },
  ],
};
