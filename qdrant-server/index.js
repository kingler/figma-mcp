const { QdrantClient } = require("@qdrant/js-client-rest"); const openai = require("openai"); require("dotenv").config(); process.stdin.setEncoding("utf8"); let buffer = ""; process.stdin.on("data", (chunk) => { buffer += chunk; const messages = buffer.split("
"); buffer = messages.pop(); for (const msg of messages) { try { const req = JSON.parse(msg); if (req.type === "initialize") { process.stdout.write(JSON.stringify({type: "initialize_response", server: {name: "n8n-workflows-qdrant", version: "1.0.0"}}) + "
"); } } catch (e) { console.error(e); } } });
