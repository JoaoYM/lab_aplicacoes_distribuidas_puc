// stress-test.js
import http from 'k6/http'; // 💡 K6 usa seu próprio módulo http
import { check, sleep } from 'k6';

// Configurações do teste
export const options = {
  stages: [
    { duration: '30s', target: 1000 }, // Sobe para 100 usuários virtuais em 30s
    { duration: '1m', target: 1000 },  // Mantém 100 usuários por 1 minuto
    { duration: '15s', target: 0 },   // Desce para 0 usuários
  ],
  thresholds: {
    'http_req_failed': ['rate<0.01'], // O teste falha se mais de 1% das requisições derem erro
    'http_req_duration': ['p(95)<800'], // 95% das requisições devem ser abaixo de 800ms
  },
};

const BASE_URL = 'http://localhost:3000/api';
const USER_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImQ1NzI3MjU0LWIwNGUtNDg2ZS1hMzQwLWE2ZjU3NWVjNWY0YSIsImVtYWlsIjoidXNlcjJAdGVzdC5jb20iLCJ1c2VybmFtZSI6InRlc3R1c2VyMiIsImlhdCI6MTc1NjA3OTA4OSwiZXhwIjoxNzU2MTY1NDg5fQ.TPeTVK4JLFK9bP3e1RFORThN2TBzYQToaqtXLri0v4E';

// A função default é o que cada usuário virtual vai executar em loop
export default function () {
  const authHeaders = {
    headers: {
      'Authorization': `Bearer ${USER_TOKEN}`,
    },
  };

  // 💡 A forma de fazer a requisição no k6 é mais simples
  const res = http.get(`${BASE_URL}/tasks?limit=20`, authHeaders);

  // 'check' é como o k6 verifica se a requisição foi bem-sucedida
  check(res, {
    'status was 200': (r) => r.status == 200,
  });

  // Pausa por 1 segundo para simular um usuário real
  sleep(1);
}