// services/analytics-service/consumer.js
const amqp = require('amqplib');
const JsonDatabase = require('../../shared/JsonDatabase');
const path = require('path');

class AnalyticsConsumer {
    constructor() {
        this.rabbitmqUrl = process.env.LOCALSTACK_RABBITMQ_URL || 'amqp://localhost:5672';
        this.connection = null;
        this.channel = null;
        
        // Setup database para analytics
        const dbPath = path.join(__dirname, 'database');
        this.analyticsDb = new JsonDatabase(dbPath, 'shopping_analytics');
    }

    async connect() {
        try {
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();
            
            // Declarar exchange
            await this.channel.assertExchange('shopping_events', 'topic', {
                durable: true
            });
            
            // Declarar fila para analytics
            const queue = await this.channel.assertQueue('analytics_queue', {
                durable: true
            });
            
            // Vincular fila ao exchange com pattern
            await this.channel.bindQueue(queue.queue, 'shopping_events', 'list.checkout.#');
            
            console.log('✅ Analytics Consumer conectado ao RabbitMQ');
            console.log('📊 Aguardando eventos para análise...');
            
            // Consumir mensagens
            await this.channel.consume(queue.queue, this.handleMessage.bind(this), {
                noAck: false
            });
            
        } catch (error) {
            console.error('❌ Erro ao conectar Analytics Consumer:', error.message);
            setTimeout(() => this.connect(), 5000);
        }
    }

    async handleMessage(msg) {
        try {
            const event = JSON.parse(msg.content.toString());
            
            console.log('📨 Analytics Consumer - Mensagem recebida:', event.type);
            
            if (event.type === 'list.checkout.completed') {
                await this.processCheckoutAnalytics(event);
            }
            
            // Ack da mensagem
            this.channel.ack(msg);
            
        } catch (error) {
            console.error('❌ Erro ao processar mensagem:', error);
            this.channel.nack(msg);
        }
    }

    async processCheckoutAnalytics(event) {
        try {
            // Calcular estatísticas
            const analytics = {
                id: require('uuid').v4(),
                listId: event.listId,
                userId: event.userId,
                totalAmount: event.totalAmount,
                itemCount: event.items.length,
                categoryBreakdown: this.calculateCategoryBreakdown(event.items),
                timestamp: event.timestamp,
                processedAt: new Date().toISOString()
            };
            
            // Salvar no banco de analytics
            await this.analyticsDb.create(analytics);
            
            // Atualizar dashboard em tempo real (simulação)
            await this.updateRealTimeDashboard(analytics);
            
            console.log(`📊 ANALYTICS PROCESSADOS:`);
            console.log(`   Lista: ${event.listId}`);
            console.log(`   Total: R$ ${event.totalAmount.toFixed(2)}`);
            console.log(`   Itens: ${event.items.length}`);
            console.log(`   Categorias: ${Object.keys(analytics.categoryBreakdown).length}`);
            console.log('---');
            
        } catch (error) {
            console.error('❌ Erro ao processar analytics:', error.message);
        }
    }

    calculateCategoryBreakdown(items) {
        const breakdown = {};
        
        items.forEach(item => {
            // Em um cenário real, buscaríamos a categoria do item no Item Service
            const category = item.category || 'Outros';
            const amount = (item.quantity || 1) * (item.estimatedPrice || 0);
            
            if (!breakdown[category]) {
                breakdown[category] = {
                    count: 0,
                    totalAmount: 0
                };
            }
            
            breakdown[category].count += item.quantity || 1;
            breakdown[category].totalAmount += amount;
        });
        
        return breakdown;
    }

    async updateRealTimeDashboard(analytics) {
        // Simular atualização de dashboard em tempo real
        const dashboardData = {
            totalSales: analytics.totalAmount,
            averageTicket: analytics.totalAmount,
            popularCategories: analytics.categoryBreakdown,
            lastUpdate: analytics.processedAt
        };
        
        console.log('📈 Dashboard atualizado:', {
            totalSales: `R$ ${dashboardData.totalSales.toFixed(2)}`,
            categories: Object.keys(dashboardData.popularCategories).length
        });
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
        console.log('📪 Analytics Consumer finalizado');
    }
}

// Iniciar consumer
if (require.main === module) {
    const consumer = new AnalyticsConsumer();
    consumer.start();
}

module.exports = AnalyticsConsumer;