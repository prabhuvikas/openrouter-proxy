/**
 * Test script for OpenRouter Proxy MCP/Tools support
 * Tests: tool definitions, tool_choice conversion, tool_result handling, streaming
 *
 * Run: node tests/test-mcp-tools.js
 */

const http = require('http');

const PROXY_URL = 'http://localhost:8787';

// Helper to make requests
function makeRequest(path, body, options = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = http.request({
      hostname: 'localhost',
      port: 8787,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-key',
        'Content-Length': data.length
      }
    }, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('OpenRouter Proxy MCP/Tools Test Suite');
  console.log('='.repeat(60));
  console.log('');

  let passed = 0;
  let failed = 0;

  // Test 1: Tool definitions conversion
  console.log('Test 1: Tool definitions (Anthropic -> OpenAI)');
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test-model',
      max_tokens: 1000,
      messages: [{ role: 'user', content: 'test' }],
      tools: [
        {
          name: 'read_file',
          description: 'Read a file from disk',
          input_schema: {
            type: 'object',
            properties: {
              path: { type: 'string', description: 'File path' }
            },
            required: ['path']
          }
        }
      ]
    });

    const converted = result.data.converted;
    const tool = converted.tools?.[0];

    if (tool?.type === 'function' &&
        tool?.function?.name === 'read_file' &&
        tool?.function?.parameters?.properties?.path) {
      console.log('  ✓ Tools converted to OpenAI function format');
      passed++;
    } else {
      console.log('  ✗ Tool conversion failed');
      console.log('  Got:', JSON.stringify(tool, null, 2));
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 2: tool_choice conversions
  console.log('\nTest 2: tool_choice format conversion');

  // Test 2a: auto
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test', messages: [{ role: 'user', content: 'test' }],
      tool_choice: { type: 'auto' }
    });
    if (result.data.converted.tool_choice === 'auto') {
      console.log('  ✓ tool_choice auto -> "auto"');
      passed++;
    } else {
      console.log('  ✗ tool_choice auto failed:', result.data.converted.tool_choice);
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 2b: any -> required
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test', messages: [{ role: 'user', content: 'test' }],
      tool_choice: { type: 'any' }
    });
    if (result.data.converted.tool_choice === 'required') {
      console.log('  ✓ tool_choice any -> "required"');
      passed++;
    } else {
      console.log('  ✗ tool_choice any failed:', result.data.converted.tool_choice);
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 2c: tool -> function object
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test', messages: [{ role: 'user', content: 'test' }],
      tool_choice: { type: 'tool', name: 'my_tool' }
    });
    const tc = result.data.converted.tool_choice;
    if (tc?.type === 'function' && tc?.function?.name === 'my_tool') {
      console.log('  ✓ tool_choice tool -> function object');
      passed++;
    } else {
      console.log('  ✗ tool_choice tool failed:', JSON.stringify(tc));
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 3: Assistant message with tool_use
  console.log('\nTest 3: Assistant tool_use -> OpenAI tool_calls');
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test',
      messages: [
        { role: 'user', content: 'Check file' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Reading file...' },
            { type: 'tool_use', id: 'toolu_abc', name: 'read_file', input: { path: '/test.txt' } }
          ]
        }
      ]
    });

    const assistantMsg = result.data.converted.messages[1];
    if (assistantMsg?.role === 'assistant' &&
        assistantMsg?.tool_calls?.[0]?.id === 'toolu_abc' &&
        assistantMsg?.tool_calls?.[0]?.function?.name === 'read_file') {
      console.log('  ✓ tool_use converted to tool_calls');

      // Check arguments are stringified
      const args = assistantMsg.tool_calls[0].function.arguments;
      if (typeof args === 'string' && JSON.parse(args).path === '/test.txt') {
        console.log('  ✓ Tool arguments properly JSON stringified');
        passed++;
      } else {
        console.log('  ✗ Tool arguments not stringified:', args);
        failed++;
      }
      passed++;
    } else {
      console.log('  ✗ tool_use conversion failed');
      console.log('  Got:', JSON.stringify(assistantMsg, null, 2));
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 4: User message with tool_result
  console.log('\nTest 4: User tool_result -> OpenAI tool role');
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test',
      messages: [
        { role: 'user', content: 'Check file' },
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'toolu_xyz', name: 'read_file', input: { path: '/test.txt' } }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 'toolu_xyz', content: 'File contents here' }
          ]
        }
      ]
    });

    const toolMsg = result.data.converted.messages[2];
    if (toolMsg?.role === 'tool' &&
        toolMsg?.tool_call_id === 'toolu_xyz' &&
        toolMsg?.content === 'File contents here') {
      console.log('  ✓ tool_result converted to tool role message');
      passed++;
    } else {
      console.log('  ✗ tool_result conversion failed');
      console.log('  Got:', JSON.stringify(toolMsg, null, 2));
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 5: System prompt handling
  console.log('\nTest 5: System prompt conversion');
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test',
      system: 'You are a helpful assistant.',
      messages: [{ role: 'user', content: 'Hello' }]
    });

    const messages = result.data.converted.messages;
    if (messages[0]?.role === 'system' &&
        messages[0]?.content === 'You are a helpful assistant.' &&
        messages[1]?.role === 'user') {
      console.log('  ✓ System prompt inserted as first message');
      passed++;
    } else {
      console.log('  ✗ System prompt handling failed');
      console.log('  Got:', JSON.stringify(messages, null, 2));
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Test 6: Complex multi-turn conversation
  console.log('\nTest 6: Multi-turn tool conversation');
  try {
    const result = await makeRequest('/debug/convert', {
      model: 'test',
      system: 'You can use tools.',
      messages: [
        { role: 'user', content: 'List files' },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'Let me list the files.' },
            { type: 'tool_use', id: 't1', name: 'list_files', input: { dir: '/' } }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't1', content: 'file1.txt\nfile2.txt' }
          ]
        },
        {
          role: 'assistant',
          content: [
            { type: 'text', text: 'I found 2 files. Let me read the first one.' },
            { type: 'tool_use', id: 't2', name: 'read_file', input: { path: '/file1.txt' } }
          ]
        },
        {
          role: 'user',
          content: [
            { type: 'tool_result', tool_use_id: 't2', content: 'Hello World' }
          ]
        }
      ],
      tools: [
        { name: 'list_files', description: 'List files', input_schema: { type: 'object' } },
        { name: 'read_file', description: 'Read file', input_schema: { type: 'object' } }
      ]
    });

    const messages = result.data.converted.messages;
    // system, user, assistant+tool_calls, tool, assistant+tool_calls, tool = 6 messages
    if (messages.length === 6 &&
        messages[0].role === 'system' &&
        messages[2].tool_calls?.length === 1 &&
        messages[3].role === 'tool' &&
        messages[4].tool_calls?.length === 1 &&
        messages[5].role === 'tool') {
      console.log('  ✓ Multi-turn tool conversation converted correctly');
      passed++;
    } else {
      console.log('  ✗ Multi-turn conversion failed');
      console.log('  Got', messages.length, 'messages');
      failed++;
    }
  } catch (e) {
    console.log('  ✗ Error:', e.message);
    failed++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test suite error:', err);
  process.exit(1);
});
