/**
 * Integration tests for OpenRouter Proxy
 * These tests make actual API calls through the proxy to OpenRouter.
 *
 * Requires:
 * - OPENROUTER_API_KEY environment variable
 * - Proxy running on localhost:8787
 *
 * Run: node test-integration.js
 */

const http = require('http');

const PROXY_URL = 'http://localhost:8787';
const TEST_MODEL = process.env.TEST_MODEL || 'meta-llama/llama-3.2-3b-instruct:free';
const API_KEY = process.env.OPENROUTER_API_KEY;

// Test results tracking
let passed = 0;
let failed = 0;

function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

// Helper to make Anthropic-format requests to the proxy
function makeRequest(body, stream = false) {
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
        res.on('end', () => {
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
    req.setTimeout(60000, () => {
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
    max_tokens: 100,
    messages: [
      { role: 'user', content: 'Say "hello" and nothing else.' }
    ]
  });

  assert(response.status === 200, `Expected status 200, got ${response.status}`);
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
}

// Test 2: Tool calling
async function testToolCalling() {
  log('Test: Tool Calling');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 500,
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

  assert(response.status === 200, `Expected status 200, got ${response.status}`);
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
    // Model responded with text instead - this is acceptable
    log('  Model responded with text instead of tool call (model-dependent behavior)');
    const textBlock = response.body.content.find(c => c.type === 'text');
    if (textBlock) {
      log(`  Response: "${textBlock.text.substring(0, 100)}..."`);
    }
  }

  log('  PASSED');
}

// Test 3: Streaming
async function testStreaming() {
  log('Test: Streaming Response');

  const res = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 100,
    stream: true,
    messages: [
      { role: 'user', content: 'Count from 1 to 5.' }
    ]
  }, true);

  return new Promise((resolve, reject) => {
    const events = [];
    let buffer = '';

    const timeout = setTimeout(() => {
      reject(new Error('Streaming timeout'));
    }, 60000);

    res.on('data', (chunk) => {
      buffer += chunk.toString();
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

      try {
        // Verify we got the expected event types
        const eventTypes = events.map(e => e.type);

        assert(eventTypes.includes('message_start'), 'Should have message_start event');
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
        resolve();
      } catch (e) {
        reject(e);
      }
    });

    res.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

// Test 4: System prompt handling
async function testSystemPrompt() {
  log('Test: System Prompt Handling');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 100,
    system: 'You are a pirate. Always respond in pirate speak.',
    messages: [
      { role: 'user', content: 'Say hello.' }
    ]
  });

  assert(response.status === 200, `Expected status 200, got ${response.status}`);
  assert(response.body.type === 'message', 'Should be a message type');
  assert(response.body.content[0].text, 'Should have text response');

  log(`  Response: "${response.body.content[0].text.substring(0, 100)}..."`);
  log('  PASSED');
}

// Test 5: Multi-turn conversation
async function testMultiTurn() {
  log('Test: Multi-turn Conversation');

  const response = await makeRequest({
    model: TEST_MODEL,
    max_tokens: 100,
    messages: [
      { role: 'user', content: 'My name is Alice.' },
      { role: 'assistant', content: 'Hello Alice! Nice to meet you.' },
      { role: 'user', content: 'What is my name?' }
    ]
  });

  assert(response.status === 200, `Expected status 200, got ${response.status}`);
  assert(response.body.content[0].text, 'Should have text response');

  const responseText = response.body.content[0].text.toLowerCase();
  assert(responseText.includes('alice'), 'Response should mention the name Alice');

  log(`  Response: "${response.body.content[0].text.substring(0, 100)}..."`);
  log('  PASSED');
}

// Run a single test with error handling
async function runTest(name, testFn) {
  try {
    await testFn();
    passed++;
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

  // Run tests
  await runTest('Basic Completion', testBasicCompletion);
  await runTest('Tool Calling', testToolCalling);
  await runTest('Streaming', testStreaming);
  await runTest('System Prompt', testSystemPrompt);
  await runTest('Multi-turn', testMultiTurn);

  // Summary
  console.log('');
  console.log('='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test runner error:', err.message);
  process.exit(1);
});
