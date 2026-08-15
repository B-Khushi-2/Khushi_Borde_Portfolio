const http = require("http");

function sendChatRequest() {
  return new Promise((resolve) => {
    const postData = JSON.stringify({
      messages: [{ role: "user", content: "hi" }]
    });

    const options = {
      hostname: "localhost",
      port: 3000,
      path: "/api/chat",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => { data += chunk; });
      res.on("end", () => {
        resolve({ status: res.statusCode, data });
      });
    });

    req.on("error", (e) => {
      resolve({ status: 500, error: e.message });
    });

    req.write(postData);
    req.end();
  });
}

async function testRateLimiting() {
  console.log(`\n==================================================`);
  console.log(`TEST 5A: RATE LIMITING (/api/chat)`);
  console.log(`==================================================`);

  let rateLimitedHit = false;

  for (let i = 1; i <= 25; i++) {
    const res = await sendChatRequest();
    if (res.status === 429) {
      console.log(`Request #${i} -> STATUS 429 RATE_LIMITED:`, res.data);
      rateLimitedHit = true;
      break;
    } else {
      console.log(`Request #${i} -> STATUS ${res.status}`);
    }
  }

  if (!rateLimitedHit) {
    console.log(`No 429 hit in first 25 requests (rate limit ceiling active).`);
  }
}

testRateLimiting();
