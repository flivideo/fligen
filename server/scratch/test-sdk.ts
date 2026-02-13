/**
 * Minimal test to verify Claude Agent SDK is working with Max subscription
 * Run with: npx tsx scratch/test-sdk.ts
 *
 * Prerequisites:
 *   1. Have Claude Code installed (v2.0.42+)
 *   2. Run: claude login (uses browser OAuth with Max subscription)
 */

import { query } from '@anthropic-ai/claude-agent-sdk';

async function testSDK() {
  console.log('🧪 Testing Claude Agent SDK...\n');
  console.log('📤 Sending query: "Say hello in exactly 5 words"\n');

  try {
    let responseText = '';
    let messageCount = 0;

    for await (const message of query({
      prompt: 'Say hello in exactly 5 words',
      options: {
        systemPrompt: 'You are helpful and concise.',
        maxTurns: 1,
      },
    })) {
      messageCount++;
      console.log(`\n📨 Message #${messageCount}:`, JSON.stringify(message, null, 2));

      // Handle wrapped message structure
      if (message && typeof message === 'object') {
        let content = null;

        if ('content' in message) {
          content = message.content;
        } else if (
          'message' in message &&
          typeof message.message === 'object' &&
          'content' in message.message
        ) {
          content = message.message.content;
        }

        if (Array.isArray(content)) {
          for (const block of content) {
            if (block && typeof block === 'object' && 'text' in block) {
              responseText += block.text;
            }
          }
        } else if (typeof content === 'string') {
          responseText += content;
        }
      }
    }

    console.log(`\n📊 Total messages received: ${messageCount}`);
    console.log('📥 Response received:');
    console.log('─'.repeat(50));
    console.log(responseText || '(no text response)');
    console.log('─'.repeat(50));

    if (!responseText) {
      console.log('\n⚠️  WARNING: No text response received!');
      console.log('Try running: claude login');
      process.exit(1);
    } else {
      console.log('\n✅ SDK is working! Got response from Claude via Max subscription!\n');
    }
  } catch (error: any) {
    console.error('❌ SDK Test Failed:');
    console.error('Error:', error.message);

    if (
      error.message?.includes('authentication') ||
      error.message?.includes('auth') ||
      error.message?.includes('login')
    ) {
      console.error('\n💡 Run: claude login (authenticate with your Max subscription)');
    }

    process.exit(1);
  }
}

testSDK();
