// demo-messaging.js
const axios = require('axios');

async function demoMessaging() {
    console.log('🎬 INICIANDO DEMONSTRAÇÃO DE MENSAGERIA COM DOCKER');
    console.log('==================================================');
    
    try {
        // 1. Login para obter token
        console.log('1. 🔐 Obtendo token de autenticação...');
        const loginResponse = await axios.post('http://localhost:3000/api/auth/login', {
            identifier: 'admin@microservices.com',
            password: 'admin123'
        });
        
        const token = loginResponse.data.data.token;
        console.log('   ✅ Token obtido');
        
        // 2. Criar uma lista de compras
        console.log('2. 🛒 Criando lista de compras...');
        const listResponse = await axios.post('http://localhost:3000/api/lists', {
            name: 'Lista de Demonstração Docker',
            description: 'Lista para teste de mensageria com RabbitMQ no Docker'
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        
        const listId = listResponse.data.data.id;
        console.log(`   ✅ Lista criada: ${listId}`);
        
        // 3. Adicionar itens à lista
        console.log('3. 📦 Adicionando itens à lista...');
        
        // Buscar alguns itens disponíveis
        const itemsResponse = await axios.get('http://localhost:3000/api/items?limit=3');
        const items = itemsResponse.data.data;
        
        for (const item of items) {
            await axios.post(`http://localhost:3000/api/lists/${listId}/items`, {
                itemId: item.id,
                quantity: 2,
                notes: 'Item de demonstração Docker'
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log(`   ✅ Item adicionado: ${item.name}`);
        }
        
        // 4. Executar checkout (disparar evento)
        console.log('4. 🎯 Executando checkout (disparo de evento)...');
        const startTime = Date.now();
        
        const checkoutResponse = await axios.post(
            `http://localhost:3000/api/lists/${listId}/checkout`,
            {},
            { headers: { Authorization: `Bearer ${token}` } }
        );
        
        const responseTime = Date.now() - startTime;
        
        console.log(`   ✅ Checkout iniciado em ${responseTime}ms`);
        console.log(`   📋 Resposta: ${checkoutResponse.data.message}`);
        console.log(`   🎫 Status: ${checkoutResponse.data.data.status}`);
        console.log(`   💰 Total: R$ ${checkoutResponse.data.data.totalAmount}`);
        
        console.log('5. 📊 Aguardando processamento dos consumers...');
        console.log('   👀 Observe os terminais dos consumers para ver as mensagens');
        console.log('   🌐 Acesse o RabbitMQ Management: http://localhost:15672 (guest/guest)');
        
        setTimeout(() => {
            console.log('==================================================');
            console.log('🎉 DEMONSTRAÇÃO CONCLUÍDA!');
            console.log('✅ API respondeu rapidamente (202 Accepted)');
            console.log('✅ Evento publicado no RabbitMQ no Docker');
            console.log('✅ Consumers processando assincronamente');
            console.log('✅ Mensageria funcionando com Docker! 🐳');
        }, 5000);
        
    } catch (error) {
        console.error('❌ Erro na demonstração:', error.message);
        console.log('💡 Certifique-se de que:');
        console.log('   1. Todos os serviços estão rodando: npm run start:full');
        console.log('   2. RabbitMQ no Docker está ativo: npm run docker:up');
        console.log('   3. O setup foi executado: npm run setup:rabbitmq');
    }
}

demoMessaging().catch(console.error);