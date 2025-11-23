// scripts/setup-rabbitmq.js
const amqp = require('amqplib');

class RabbitMQSetup {
    constructor() {
        // Usar RabbitMQ no Docker
        this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        this.maxRetries = 5;
        this.retryDelay = 3000;
    }

    async waitForRabbitMQ() {
        console.log('⏳ Aguardando RabbitMQ ficar disponível...');
        
        for (let i = 1; i <= this.maxRetries; i++) {
            try {
                const connection = await amqp.connect(this.rabbitmqUrl);
                await connection.close();
                console.log('✅ RabbitMQ está disponível!');
                return true;
            } catch (error) {
                console.log(`⏰ Tentativa ${i}/${this.maxRetries} - RabbitMQ não disponível: ${error.message}`);
                if (i < this.maxRetries) {
                    console.log(`🔄 Tentando novamente em ${this.retryDelay/1000} segundos...`);
                    await new Promise(resolve => setTimeout(resolve, this.retryDelay));
                }
            }
        }
        
        throw new Error('❌ RabbitMQ não ficou disponível após várias tentativas');
    }

    async setup() {
        try {
            await this.waitForRabbitMQ();
            
            console.log('🐇 Configurando RabbitMQ no Docker...');
            
            const connection = await amqp.connect(this.rabbitmqUrl);
            const channel = await connection.createChannel();
            
            // Criar exchange
            await channel.assertExchange('shopping_events', 'topic', {
                durable: true
            });
            console.log('✅ Exchange "shopping_events" criada');

            // Criar filas
            const queues = [
                { name: 'notification_queue', pattern: 'list.checkout.#' },
                { name: 'analytics_queue', pattern: 'list.checkout.#' }
            ];

            for (const queueConfig of queues) {
                const queue = await channel.assertQueue(queueConfig.name, {
                    durable: true
                });
                
                await channel.bindQueue(
                    queue.queue, 
                    'shopping_events', 
                    queueConfig.pattern
                );
                
                console.log(`✅ Fila "${queueConfig.name}" criada e vinculada ao pattern "${queueConfig.pattern}"`);
            }

            await channel.close();
            await connection.close();
            
            console.log('🎉 Configuração do RabbitMQ concluída!');
            console.log('📊 Exchange: shopping_events (topic)');
            console.log('📨 Filas: notification_queue, analytics_queue');
            console.log('🎯 Patterns: list.checkout.#');
            console.log('🌐 Management UI: http://localhost:15672 (guest/guest)');
            
        } catch (error) {
            console.error('❌ Erro na configuração do RabbitMQ:', error.message);
            console.log('\n💡 Solução de problemas:');
            console.log('1. Verifique se o Docker está rodando');
            console.log('2. Execute: npm run docker:up');
            console.log('3. Verifique os logs: npm run docker:logs');
            console.log('4. URL do RabbitMQ: amqp://guest:guest@localhost:5672');
        }
    }
}

// Executar setup
if (require.main === module) {
    const setup = new RabbitMQSetup();
    setup.setup().catch(console.error);
}

module.exports = RabbitMQSetup;