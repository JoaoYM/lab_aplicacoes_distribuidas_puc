#!/bin/bash
# start-with-messaging.sh

echo "🚀 Iniciando Sistema com Mensageria RabbitMQ + LocalStack"

# Iniciar LocalStack
echo "🐳 Iniciando LocalStack..."
docker-compose -f docker-compose.localstack.yml up -d

# Aguardar LocalStack inicializar
echo "⏳ Aguardando LocalStack..."
sleep 10

# Iniciar microsserviços
echo "🔧 Iniciando microsserviços..."
cd services/user-service && npm start &
cd services/item-service && npm start &
cd services/list-service && npm start &

# Aguardar serviços principais
echo "⏳ Aguardando serviços principais..."
sleep 5

# Iniciar consumers
echo "📨 Iniciando consumers..."
cd services/notification-service && node consumer.js &
cd services/analytics-service && node consumer.js &

echo "✅ Sistema iniciado com mensageria!"
echo "📊 RabbitMQ Management: http://localhost:15672"
echo "🎯 API Gateway: http://localhost:3000"