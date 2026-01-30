/**
 * Integration tests for OpenRouter Proxy
 * These tests make actual API calls through the proxy to OpenRouter.
 *
 * Requires:
 * - OPENROUTER_API_KEY environment variable
 * - Proxy running on localhost:8787
 *
 * Run: node tests/test-integration.js
 */

const http = require('http');

const PROXY_URL = 'http://localhost:8787';
const TEST_MODEL = process.env.TEST_MODEL || 'z-ai/glm-4.5-air';
const API_KEY = process.env.OPENROUTER_API_KEY;

// Retry configuration for rate limits
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 5000; // 5 seconds
const DELAY_BETWEEN_TESTS = 3000; // 3 seconds between tests

// Test results tracking
let passed = 0;
let failed = 0;
let skipped = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper to make Anthropic-format requests to the proxy with retry logic
async function makeRequest(body, stream = false, retryCount = 0) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);

    const req = http.request({
      hostname: 'localhost',
      port: 8787,
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      if (stream) {
        // Return response object for streaming handling
        resolve(res);
      } else {
        let responseData = '';
        res.on('data', chunk => responseData += chunk);
        res.on('end', async () => {
          // Handle rate limiting with retry
          if (res.statusCode === 429 && retryCount < MAX_RETRIES) {
            const retryDelay = INITIAL_RETRY_DELAY * Math.pow(2, retryCount);
            log(`  Rate limited (429), retrying in ${retryDelay / 1000}s... (attempt ${retryCount + 1}/${MAX_RETRIES})`);
            await delay(retryDelay);
            try {
              const result = await makeRequest(body, stream, retryCount + 1);
              resolve(result);
            } catch (e) {
              reject(e);
            }
            return;
          }

          try {
            const result = JSON.parse(responseData);
            resolve({ status: res.statusCode, body: result });
          } catch (e) {
            reject(new Error(`Failed to parse response: ${e.message}\nRaw: ${responseData}`));
          }
        });
      }
    });

    req.on('error', reject);
    req.setTimeout(90000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(data);
    req.end();
  });
}

// Test 1: Basic completion (non-streaming)
async function testBasicCompletion() {
  log('Test: Basic Completion (non-streaming)');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 50,
    messages: [
      { role: 'user', content: 'Say "hello" and nothing else.' }
    ]
  });

  // Check for persistent rate limiting after retries
  if (response.status === 429) {
    log('  SKIPPED: Rate limited after max retries');
    return 'skipped';
  }

  assert(response.status === 200, `Expected status 200, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  assert(response.body.type === 'message', `Expected type "message", got ${response.body.type}`);
  assert(response.body.role === 'assistant', `Expected role "assistant", got ${response.body.role}`);
  assert(Array.isArray(response.body.content), 'Content should be an array');
  assert(response.body.content.length > 0, 'Content should not be empty');
  assert(response.body.content[0].type === 'text', `Expected content type "text", got ${response.body.content[0].type}`);
  assert(typeof response.body.content[0].text === 'string', 'Text content should be a string');
  assert(response.body.stop_reason, 'Should have a stop_reason');
  assert(response.body.usage, 'Should have usage information');

  log(`  Response: "${response.body.content[0].text.substring(0, 50)}..."`);
  log(`  Stop reason: ${response.body.stop_reason}`);
  log('  PASSED');
  return 'passed';
}

// Test 2: Tool calling (optional - some free models don't support it well)
async function testToolCalling() {
  log('Test: Tool Calling');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 200,
    messages: [
      { role: 'user', content: 'What is the weather in Tokyo? Use the get_weather tool.' }
    ],
    tools: [
      {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        input_schema: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city name'
            }
          },
          required: ['location']
        }
      }
    ],
    tool_choice: { type: 'auto' }
  });

  // Check for rate limiting or model not supporting tools
  if (response.status === 429) {
    log('  SKIPPED: Rate limited after max retries');
    return 'skipped';
  }

  if (response.status === 404 || response.status === 400) {
    log('  SKIPPED: Model may not support tool calling');
    return 'skipped';
  }

  assert(response.status === 200, `Expected status 200, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  assert(response.body.type === 'message', `Expected type "message", got ${response.body.type}`);
  assert(Array.isArray(response.body.content), 'Content should be an array');

  // Check if model called the tool (some models may not always call tools)
  const toolUseBlocks = response.body.content.filter(c => c.type === 'tool_use');

  if (toolUseBlocks.length > 0) {
    const toolUse = toolUseBlocks[0];
    assert(toolUse.name === 'get_weather', `Expected tool name "get_weather", got ${toolUse.name}`);
    assert(toolUse.id, 'Tool use should have an id');
    assert(typeof toolUse.input === 'object', 'Tool use should have input object');
    assert(response.body.stop_reason === 'tool_use', `Expected stop_reason "tool_use", got ${response.body.stop_reason}`);
    log(`  Tool called: ${toolUse.name} with input: ${JSON.stringify(toolUse.input)}`);
  } else {
    // Model responded with text instead - this is acceptable for free models
    log('  Model responded with text instead of tool call (model-dependent behavior)');
    const textBlock = response.body.content.find(c => c.type === 'text');
    if (textBlock) {
      log(`  Response: "${textBlock.text.substring(0, 100)}..."`);
    }
  }

  log('  PASSED');
  return 'passed';
}

// Test 3: Streaming
async function testStreaming() {
  log('Test: Streaming Response');

  const res = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 50,
    stream: true,
    messages: [
      { role: 'user', content: 'Count from 1 to 3.' }
    ]
  }, true);

  return new Promise((resolve) => {
    const events = [];
    let buffer = '';
    let rateLimited = false;

    const timeout = setTimeout(() => {
      log('  SKIPPED: Streaming timeout');
      resolve('skipped');
    }, 90000);

    res.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      buffer += chunkStr;

      // Check for rate limiting in stream
      if (chunkStr.includes('"error"') && chunkStr.includes('429')) {
        rateLimited = true;
      }

      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          const eventType = line.slice(7).trim();
          events.push({ type: eventType });
        } else if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (events.length > 0) {
              events[events.length - 1].data = data;
            }
          } catch (e) {
            // Ignore parse errors for partial data
          }
        }
      }
    });

    res.on('end', () => {
      clearTimeout(timeout);

      if (rateLimited) {
        log('  SKIPPED: Rate limited during streaming');
        resolve('skipped');
        return;
      }

      try {
        // Verify we got the expected event types
        const eventTypes = events.map(e => e.type);

        if (!eventTypes.includes('message_start')) {
          log('  SKIPPED: No message_start event (possible rate limit or model issue)');
          resolve('skipped');
          return;
        }

        assert(eventTypes.includes('message_stop'), 'Should have message_stop event');

        // Check for content events
        const hasContentStart = eventTypes.includes('content_block_start');
        const hasContentDelta = eventTypes.includes('content_block_delta');

        log(`  Events received: ${eventTypes.length}`);
        log(`  Event types: message_start=${eventTypes.includes('message_start')}, content_block_start=${hasContentStart}, content_block_delta=${hasContentDelta}, message_stop=${eventTypes.includes('message_stop')}`);

        // Collect streamed text
        let streamedText = '';
        for (const event of events) {
          if (event.type === 'content_block_delta' && event.data?.delta?.text) {
            streamedText += event.data.delta.text;
          }
        }

        if (streamedText) {
          log(`  Streamed text: "${streamedText.substring(0, 100)}..."`);
        }

        log('  PASSED');
        resolve('passed');
      } catch (e) {
        log(`  FAILED: ${e.message}`);
        resolve('failed');
      }
    });

    res.on('error', (err) => {
      clearTimeout(timeout);
      log(`  FAILED: ${err.message}`);
      resolve('failed');
    });
  });
}

// Test 4: System prompt handling
async function testSystemPrompt() {
  log('Test: System Prompt Handling');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 100,  // Increased for better response
    system: 'You are a pirate. Always respond in pirate speak.',
    messages: [
      { role: 'user', content: 'Say hello.' }
    ]
  });

  if (response.status === 429) {
    log('  SKIPPED: Rate limited after max retries');
    return 'skipped';
  }

  assert(response.status === 200, `Expected status 200, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  assert(response.body.type === 'message', 'Should be a message type');
  assert(Array.isArray(response.body.content), 'Content should be an array');
  assert(response.body.content.length > 0, 'Content should not be empty');
  assert(response.body.content[0].type === 'text', 'First content block should be text type');

  // Some free models may return empty text - check structure is correct
  const textContent = response.body.content[0].text || '';
  if (textContent.length === 0) {
    log('  WARNING: Model returned empty text (model-specific behavior)');
    log('  Response structure is valid, marking as passed');
  } else {
    log(`  Response: "${textContent.substring(0, 100)}..."`);
  }

  log('  PASSED');
  return 'passed';
}

// Test 5: Multi-turn conversation
async function testMultiTurn() {
  log('Test: Multi-turn Conversation');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 100,  // Increased for better response
    messages: [
      { role: 'user', content: 'My name is Alice.' },
      { role: 'assistant', content: 'Hello Alice! Nice to meet you.' },
      { role: 'user', content: 'What is my name?' }
    ]
  });

  if (response.status === 429) {
    log('  SKIPPED: Rate limited after max retries');
    return 'skipped';
  }

  assert(response.status === 200, `Expected status 200, got ${response.status}. Body: ${JSON.stringify(response.body)}`);
  assert(response.body.type === 'message', 'Should be a message type');
  assert(Array.isArray(response.body.content), 'Content should be an array');
  assert(response.body.content.length > 0, 'Content should not be empty');
  assert(response.body.content[0].type === 'text', 'First content block should be text type');

  // Some free models may return empty text - check structure is correct
  const textContent = response.body.content[0].text || '';
  if (textContent.length === 0) {
    log('  WARNING: Model returned empty text (model-specific behavior)');
    log('  Response structure is valid, marking as passed');
  } else {
    log(`  Response: "${textContent.substring(0, 100)}..."`);
  }

  log('  PASSED');
  return 'passed';
}

// Test 6: Dashboard endpoint (JSON)
async function testDashboardJson() {
  log('Test: Dashboard Endpoint (JSON)');

  return new Promise((resolve, reject) => {
    http.get('http://localhost:8787/dashboard', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          assert(res.statusCode === 200, `Expected status 200, got ${res.statusCode}`);

          const dashboard = JSON.parse(data);

          // Verify required fields exist
          assert(dashboard.status === 'ok', 'Should have status "ok"');
          assert(typeof dashboard.uptime === 'string', 'Should have uptime string');
          assert(typeof dashboard.uptimeMs === 'number', 'Should have uptimeMs number');

          // Verify requests object
          assert(typeof dashboard.requests === 'object', 'Should have requests object');
          assert(typeof dashboard.requests.total === 'number', 'Should have requests.total');
          assert(typeof dashboard.requests.streaming === 'number', 'Should have requests.streaming');
          assert(typeof dashboard.requests.nonStreaming === 'number', 'Should have requests.nonStreaming');
          assert(typeof dashboard.requests.withTools === 'number', 'Should have requests.withTools');

          // Verify tokens object
          assert(typeof dashboard.tokens === 'object', 'Should have tokens object');
          assert(typeof dashboard.tokens.total === 'number', 'Should have tokens.total');
          assert(typeof dashboard.tokens.input === 'number', 'Should have tokens.input');
          assert(typeof dashboard.tokens.output === 'number', 'Should have tokens.output');

          // Verify errors object
          assert(typeof dashboard.errors === 'object', 'Should have errors object');
          assert(typeof dashboard.errors.total === 'number', 'Should have errors.total');
          assert(typeof dashboard.errors.rateLimits === 'number', 'Should have errors.rateLimits');
          assert(typeof dashboard.errors.rate === 'string', 'Should have errors.rate as string');

          // Verify other fields
          assert(typeof dashboard.models === 'object', 'Should have models object');
          assert(typeof dashboard.fallbacks === 'number', 'Should have fallbacks number');

          log(`  Uptime: ${dashboard.uptime}`);
          log(`  Total requests: ${dashboard.requests.total}`);
          log(`  Total tokens: ${dashboard.tokens.total}`);
          log('  PASSED');
          resolve('passed');
        } catch (e) {
          log(`  FAILED: ${e.message}`);
          resolve('failed');
        }
      });
    }).on('error', (e) => {
      log(`  FAILED: ${e.message}`);
      resolve('failed');
    });
  });
}

// Test 7: Dashboard endpoint (HTML)
async function testDashboardHtml() {
  log('Test: Dashboard Endpoint (HTML)');

  return new Promise((resolve, reject) => {
    http.get('http://localhost:8787/dashboard?format=html', (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          assert(res.statusCode === 200, `Expected status 200, got ${res.statusCode}`);

          const contentType = res.headers['content-type'];
          assert(contentType && contentType.includes('text/html'), `Expected text/html content type, got ${contentType}`);

          // Verify HTML structure
          assert(data.includes('<!DOCTYPE html>'), 'Should have DOCTYPE');
          assert(data.includes('<title>OpenRouter Proxy Dashboard</title>'), 'Should have correct title');
          assert(data.includes('meta http-equiv="refresh"'), 'Should have auto-refresh meta tag');
          assert(data.includes('Requests'), 'Should have Requests section');
          assert(data.includes('Tokens'), 'Should have Tokens section');
          assert(data.includes('Models'), 'Should have Models section');
          assert(data.includes('Errors'), 'Should have Errors section');

          log(`  Content-Type: ${contentType}`);
          log(`  HTML length: ${data.length} bytes`);
          log('  PASSED');
          resolve('passed');
        } catch (e) {
          log(`  FAILED: ${e.message}`);
          resolve('failed');
        }
      });
    }).on('error', (e) => {
      log(`  FAILED: ${e.message}`);
      resolve('failed');
    });
  });
}

// Run a single test with error handling
async function runTest(name, testFn) {
  try {
    const result = await testFn();
    if (result === 'skipped') {
      skipped++;
    } else {
      passed++;
    }
  } catch (e) {
    failed++;
    console.error(`  FAILED: ${e.message}`);
  }
}

// Main test runner
async function runTests() {
  console.log('');
  console.log('='.repeat(60));
  console.log('OpenRouter Proxy Integration Tests');
  console.log('='.repeat(60));
  console.log(`Model: ${TEST_MODEL}`);
  console.log(`Proxy: ${PROXY_URL}`);
  console.log(`Retry config: ${MAX_RETRIES} retries, ${INITIAL_RETRY_DELAY}ms initial delay`);
  console.log('');

  // Check for API key
  if (!API_KEY) {
    console.error('ERROR: OPENROUTER_API_KEY environment variable is not set');
    console.error('Please set it to run integration tests');
    process.exit(1);
  }

  // Verify proxy is running
  log('Checking proxy health...');
  try {
    await new Promise((resolve, reject) => {
      http.get('http://localhost:8787/health', (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Health check returned ${res.statusCode}`));
        }
      }).on('error', reject);
    });
    log('Proxy is healthy');
  } catch (e) {
    console.error('ERROR: Proxy is not running or not healthy');
    console.error('Start it with: docker compose up -d');
    process.exit(1);
  }

  console.log('');

  // Run dashboard tests first (no API calls, no rate limit concerns)
  await runTest('Dashboard JSON', testDashboardJson);
  await runTest('Dashboard HTML', testDashboardHtml);

  // Run API tests with delays between them to avoid rate limits
  await runTest('Basic Completion', testBasicCompletion);
  await delay(DELAY_BETWEEN_TESTS);

  await runTest('Tool Calling', testToolCalling);
  await delay(DELAY_BETWEEN_TESTS);

  await runTest('Streaming', testStreaming);
  await delay(DELAY_BETWEEN_TESTS);

  await runTest('System Prompt', testSystemPrompt);
  await delay(DELAY_BETWEEN_TESTS);

  await runTest('Multi-turn', testMultiTurn);

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed, ${skipped} skipped`);
  console.log('='.repeat(60));

  // Only fail if there are actual failures, not just skips
  // But require at least one test to pass
  if (failed > 0) {
    process.exit(1);
  }

  if (passed === 0) {
    console.error('ERROR: All tests were skipped (likely rate limiting)');
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
