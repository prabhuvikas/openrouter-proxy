/**
 * Test script for OpenRouter Proxy format conversion
 * Run: node tests/test-conversion.js
 *
 * This tests that the proxy correctly converts between Anthropic and OpenAI formats.
 */

const http = require('http');

const PROXY_URL = 'http://localhost:8787';

// Helper to make requests to the debug endpoint
function testConversion(name, anthropicRequest) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(anthropicRequest);
    const req = http.request({
      hostname: 'localhost',
      port: 8787,
      path: '/debug/convert',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData);
          console.log(`\n${'='.repeat(60)}`);
          console.log(`TEST: ${name}`);
          console.log('='.repeat(60));
          console.log('\nAnthropic Input:');
          console.log(JSON.stringify(result.original, null, 2));
          console.log('\nOpenAI Output:');
          console.log(JSON.stringify(result.converted, null, 2));
          resolve(result);
        } catch (e) {
          console.error('Response data:', responseData);
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Add delay between requests
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTests() {
  console.log('OpenRouter Proxy Format Conversion Tests');
  console.log('========================================\n');

  // Test 1: Basic tool definition
  await testConversion('Tool Definition Conversion', {
    model: 'qwen/qwen-2.5-coder-32b-instruct',
    max_tokens: 1024,
    system: 'You are a helpful assistant.',
    messages: [
      { role: 'user', content: 'What is the weather in Tokyo?' }
    ],
    tools: [
      {
        name: 'get_weather',
        description: 'Get current weather for a location',
        input_schema: {
          type: 'object',
          properties: {
            location: { type: 'string', description: 'City name' }
          },
          required: ['location']
        }
      }
    ],
    tool_choice: { type: 'auto' }
  });

  await delay(100);

  // Test 2: Multi-turn with tool use
  await testConversion('Multi-turn Tool Conversation', {
    model: 'test-model',
    max_tokens: 1024,
    messages: [
      { role: 'user', content: 'Check the weather' },
      {
        role: 'assistant',
        content: [
          { type: 'text', text: 'I will check the weather for you.' },
          { type: 'tool_use', id: 'toolu_123', name: 'get_weather', input: { location: 'Tokyo' } }
        ]
      },
      {
        role: 'user',
        content: [
          { type: 'tool_result', tool_use_id: 'toolu_123', content: 'Sunny, 25C' }
        ]
      }
    ],
    tools: [
      { name: 'get_weather', description: 'Get weather', input_schema: { type: 'object' } }
    ]
  });

  await delay(100);

  // Test 3: Tool choice variations
  await testConversion('tool_choice: any -> required', {
    model: 'test',
    messages: [{ role: 'user', content: 'Test' }],
    tools: [{ name: 'test_tool', description: 'Test', input_schema: { type: 'object' } }],
    tool_choice: { type: 'any' }
  });

  await delay(100);

  await testConversion('tool_choice: specific tool', {
    model: 'test',
    messages: [{ role: 'user', content: 'Test' }],
    tools: [{ name: 'my_function', description: 'Test', input_schema: { type: 'object' } }],
    tool_choice: { type: 'tool', name: 'my_function' }
  });

  console.log('\n' + '='.repeat(60));
  console.log('All conversion tests completed!');
  console.log('='.repeat(60));
}

// Check if proxy is running first
http.get('http://localhost:8787/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    if (res.statusCode === 200) {
      runTests().catch(err => {
        console.error('Test error:', err.message);
        process.exit(1);
      });
    } else {
      console.error('Proxy returned non-200 status');
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('Proxy is not running. Start it with: docker compose up -d');
  console.error('Error:', err.message);
  process.exit(1);
});
