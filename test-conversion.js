const testRequest = {
  "model": "gpt-4-turbo",
  "max_tokens": 1024,
  "system": "You are a helpful assistant that can use tools to help the user.",
  "tools": [
    {
      "name": "get_weather",
      "description": "Get current weather for a location",
      "input_schema": {
        "type": "object",
        "properties": {
          "location": { "type": "string", "description": "City name" }
        },
        "required": ["location"]
      }
    },
    {
      "name": "search_web",
      "description": "Search the web for information",
      "input_schema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Search query" }
        },
        "required": ["query"]
      }
    }
  ],
  "messages": [
    {
      "role": "user",
      "content": "What's the weather in Paris and what's the latest news there?"
    }
  ]
};

console.log("Test Request:");
console.log("- Has system prompt:", !!testRequest.system);
console.log("- Number of tools:", testRequest.tools.length);
console.log("- Tool names:", testRequest.tools.map(t => t.name).join(", "));
console.log("- Messages count:", testRequest.messages.length);
console.log("\nThis request format tests agent/MCP support:");
console.log("✓ System prompt handling");
console.log("✓ Multiple tools");
console.log("✓ Tool definitions with input schemas");
console.log("✓ Agent loop capability");
