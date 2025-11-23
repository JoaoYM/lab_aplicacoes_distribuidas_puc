// services/notification-service/consumer.js
const amqp = require('amqplib');
const axios = require('axios');

class NotificationConsumer {
    constructor() {
        this.rabbitmqUrl = process.env.LOCALSTACK_RABBITMQ_URL || 'amqp://localhost:5672';
        this.serviceRegistry = require('../../shared/serviceRegistry');
        this.connection = null;
        this.channel = null;
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            
            // Declarar exchange
            await this.channel.assertExchange('shopping_events', 'topic', {
                durable: true
            });
            
            // Declarar fila para notificações
            const queue = await this.channel.assertQueue('notification_queue', {
                durable: true
            });
            
            // Vincular fila ao exchange com pattern
            await this.channel.bindQueue(queue.queue, 'shopping_events', 'list.checkout.#');
            
            console.log('✅ Notification Consumer conectado ao RabbitMQ');
            console.log('📋 Aguardando eventos de checkout...');
            
            // Consumir mensagens
            await this.channel.consume(queue.queue, this.handleMessage.bind(this), {
                noAck: false
            });
            
        } catch (error) {
            console.error('❌ Erro ao conectar Notification Consumer:', error.message);
            setTimeout(() => this.connect(), 5000);
        }
    }

    async handleMessage(msg) {
        try {
            const event = JSON.parse(msg.content.toString());
            
            console.log('📨 Notification Consumer - Mensagem recebida:', event.type);
            
            if (event.type === 'list.checkout.completed') {
                await this.processCheckoutNotification(event);
            }
            
            // Ack da mensagem
            this.channel.ack(msg);
            
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
            // Rejeitar mensagem para retry
            this.channel.nack(msg);
        }
    }

    async processCheckoutNotification(event) {
        try {
            // Buscar informações do usuário no User Service
            const userService = this.serviceRegistry.discover('user-service');
            const userResponse = await axios.get(
                `${userService.url}/users/${event.userId}`,
                { timeout: 5000 }
            );

            const user = userResponse.data.data;
            
            // Simular envio de email/comprovante
            console.log(`📧 ENVIANDO COMPROVANTE:`);
            console.log(`   Lista: ${event.listId}`);
            console.log(`   Usuário: ${user.email}`);
            console.log(`   Total: R$ ${event.totalAmount.toFixed(2)}`);
            console.log(`   Itens: ${event.items.length}`);
            console.log(`   Timestamp: ${event.timestamp}`);
            console.log('---');
            
            // Simular delay de envio de email
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            console.log(`✅ Comprovante enviado para ${user.email}`);
            
        } catch (error) {
            console.error('❌ Erro ao processar notificação:', error.message);
        }
    }

    async start() {
        await this.connect();
        
        // Graceful shutdown
        process.on('SIGTERM', () => this.close());
        process.on('SIGINT', () => this.close());
    }

    async close() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
        console.log('📪 Notification Consumer finalizado');
    }
}

// Iniciar consumer
if (require.main === module) {
    const consumer = new NotificationConsumer();
    consumer.start();
}

module.exports = NotificationConsumer;