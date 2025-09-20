#!/usr/bin/env node
/**
 * Verification script for RobustKit service
 * Tests draft/live/dry mode behavior and response normalization
 */

import { run } from '../services/robustkit';

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  reset: '\x1b[0m',
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function assert(condition, message) {
  if (condition) {
    log('green', `✓ ${message}`);
  } else {
    log('red', `✗ ${message}`);
    process.exit(1);
  }
}

async function testRobustKit() {
  log('yellow', '🔧 Testing RobustKit service...\n');

  // Test 1: Dry mode
  log('yellow', '1. Testing dry mode (no provider call, latency_ms=0)');
  const dryResult = await run({
    provider: 'deepseek',
    model: 'deepseek-chat',
    prompt: 'test prompt',
    mode: 'dry'
  });
  
  assert(dryResult.provider === 'deepseek', 'dry mode returns correct provider');
  assert(dryResult.model === 'deepseek-chat', 'dry mode returns correct model');
  assert(dryResult.status === 'ok', 'dry mode returns ok status');
  assert(dryResult.latency_ms === 0, 'dry mode has zero latency');
  assert(dryResult.text === 'DRY RUN', 'dry mode returns DRY RUN text');
  console.log();

  // Test 2: Draft mode (first call - cache miss)
  log('yellow', '2. Testing draft mode (cache miss, latency_ms=0)');
  const draftResult1 = await run({
    provider: 'kimi',
    model: 'moonshot-v1-8k',
    prompt: 'draft test prompt',
    mode: 'draft'
  });
  
  assert(draftResult1.provider === 'kimi', 'draft mode returns correct provider');
  assert(draftResult1.model === 'moonshot-v1-8k', 'draft mode returns correct model');
  assert(draftResult1.status === 'ok', 'draft mode returns ok status');
  assert(draftResult1.latency_ms === 0, 'draft mode has zero latency');
  assert(draftResult1.text && draftResult1.text.length > 0, 'draft mode returns text');
  assert(draftResult1.tokens && draftResult1.tokens > 0, 'draft mode returns tokens');
  console.log();

  // Test 3: Draft mode (second call - cache hit)
  log('yellow', '3. Testing draft mode (cache hit, same text)');
  const draftResult2 = await run({
    provider: 'kimi',
    model: 'moonshot-v1-8k',
    prompt: 'draft test prompt',
    mode: 'draft'
  });
  
  assert(draftResult2.latency_ms === 0, 'cached draft has zero latency');
  assert(draftResult2.text === draftResult1.text, 'cached draft returns same text');
  console.log();

  // Test 4: Live mode (measures actual latency)
  log('yellow', '4. Testing live mode (measures latency > 0)');
  const liveResult = await run({
    provider: 'perplexity',
    model: 'llama-3.1-sonar-small-128k-online',
    prompt: 'live test prompt',
    mode: 'live'
  });
  
  assert(liveResult.provider === 'perplexity', 'live mode returns correct provider');
  assert(liveResult.model === 'llama-3.1-sonar-small-128k-online', 'live mode returns correct model');
  assert(liveResult.status === 'ok', 'live mode returns ok status');
  assert(liveResult.latency_ms > 0, 'live mode measures latency > 0');
  assert(liveResult.text && liveResult.text.length > 0, 'live mode returns text');
  console.log();

  // Test 5: Error handling (unknown provider)
  log('yellow', '5. Testing error handling (unknown provider)');
  const errorResult = await run({
    provider: 'unknown_provider',
    model: 'test-model',
    prompt: 'error test prompt',
    mode: 'live'
  });
  
  assert(errorResult.status === 'error', 'unknown provider returns error status');
  assert(errorResult.error && errorResult.error.includes('not configured'), 'error contains helpful message');
  assert(errorResult.latency_ms === 0, 'error has zero latency');
  console.log();

  log('green', '🎉 All RobustKit tests passed!');
  log('yellow', '\nResponse format verification:');
  console.log('Sample normalized response:', JSON.stringify(draftResult1, null, 2));
}

// Run the tests
testRobustKit().catch(error => {
  log('red', `❌ Test failed: ${error.message}`);
  process.exit(1);
});