// simple-stress-test.js
const http = require('http');

// --- CONFIGURAÇÕES ---
const TARGET_URL = 'http://localhost:3000/api/tasks?limit=50';
const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ1NzI3MjU0LWIwNGUtNDg2ZS1hMzQwLWE2ZjU3NWVjNWY0YSIsImVtYWlsIjoidXNlcjJAdGVzdC5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyMiIsImlhdCI6MTc1NjA3OTA4OSwiZXhwIjoxNzU2MTY1NDg5fQ.TPeTVK4JLFK9bP3e1RFORThN2TBzYQToaqtXLri0v4E'; // Coloque um token JWT válido
const CONCURRENT_REQUESTS = 200; // Número de requisições simultâneas
// --------------------

const options = {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${TOKEN}`,
  },
};

console.log(`Iniciando teste de estresse com ${CONCURRENT_REQUESTS} requisições concorrentes...`);

// Função que faz uma única requisição e retorna uma Promise
function makeRequest(reqNumber) {
  return new Promise((resolve, reject) => {
    const req = http.request(TARGET_URL, options, (res) => {
      // Se o status for 2xx ou 3xx, consideramos sucesso
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve({ reqNumber, status: res.statusCode, success: true });
      } else {
        resolve({ reqNumber, status: res.statusCode, success: false });
      }
    });

    req.on('error', (e) => {
      // Erros de conexão (servidor caiu, etc.)
      reject({ reqNumber, error: e.message });
    });

    req.end();
  });
}

async function runTest() {
  const startTime = Date.now();
  const requestPromises = [];

  // Cria um array de Promises, uma para cada requisição
  for (let i = 0; i < CONCURRENT_REQUESTS; i++) {
    requestPromises.push(makeRequest(i + 1));
  }

  // Promise.allSettled dispara todas as promises e espera todas terminarem (sucesso ou falha)
  const results = await Promise.allSettled(requestPromises);

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  let successful = 0;
  let failed = 0;

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      successful++;
    } else {
      failed++;
    }
  });

  console.log('--- RESULTADOS ---');
  console.log(`Teste finalizado em ${duration.toFixed(2)} segundos.`);
  console.log(`Requisições bem-sucedidas: ${successful}`);
  console.log(`Requisições com falha: ${failed}`);
  console.log(`Taxa de requisições por segundo (RPS): ${(CONCURRENT_REQUESTS / duration).toFixed(2)}`);
}

runTest();