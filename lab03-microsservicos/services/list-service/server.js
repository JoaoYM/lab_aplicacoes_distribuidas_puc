// services/list-service/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const axios = require('axios');
const amqp = require('amqplib');

const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

class ListService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3004;
        this.serviceName = 'list-service';
        this.serviceUrl = `http://127.0.0.1:${this.port}`;
        this.rabbitmqUrl = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
        this.connection = null;
        this.channel = null;

        this.setupDatabase();
        this.setupMiddleware();
        this.setupRabbitMQ();
        this.setupRoutes();
        this.setupErrorHandling();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.listsDb = new JsonDatabase(dbPath, 'lists');
        console.log('List Service: Banco NoSQL inicializado');
    }

    setupMiddleware() {
        this.app.use(helmet());
        this.app.use(cors());
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }

    setupRoutes() {
        // Health check
        this.app.get('/health', async (req, res) => {
            try {
                const listCount = await this.listsDb.count();

                res.json({
                    service: this.serviceName,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    database: {
                        type: 'JSON-NoSQL',
                        listCount: listCount
                    }
                });
            } catch (error) {
                res.status(503).json({
                    service: this.serviceName,
                    status: 'unhealthy',
                    error: error.message
                });
            }
        });

        // Service info
        this.app.get('/', (req, res) => {
            res.json({
                service: 'List Service',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de listas de compras',
                endpoints: [
                    'POST /lists',
                    'GET /lists',
                    'GET /lists/:id',
                    'PUT /lists/:id',
                    'DELETE /lists/:id',
                    'POST /lists/:id/items',
                    'PUT /lists/:id/items/:itemId',
                    'DELETE /lists/:id/items/:itemId',
                    'GET /lists/:id/summary',
                    'POST /lists/:id/checkout'
                ]
            });
        });

        this.app.post('/lists/:id/checkout', this.authMiddleware.bind(this), this.checkoutList.bind(this));

        // List routes (todos requerem autenticação)
        this.app.post('/lists', this.authMiddleware.bind(this), this.createList.bind(this));
        this.app.get('/lists', this.authMiddleware.bind(this), this.getLists.bind(this));
        this.app.get('/lists/:id', this.authMiddleware.bind(this), this.getList.bind(this));
        this.app.put('/lists/:id', this.authMiddleware.bind(this), this.updateList.bind(this));
        this.app.delete('/lists/:id', this.authMiddleware.bind(this), this.deleteList.bind(this));

        // List items routes
        this.app.post('/lists/:id/items', this.authMiddleware.bind(this), this.addItemToList.bind(this));
        this.app.put('/lists/:id/items/:itemId', this.authMiddleware.bind(this), this.updateItemInList.bind(this));
        this.app.delete('/lists/:id/items/:itemId', this.authMiddleware.bind(this), this.removeItemFromList.bind(this));

        // Summary route
        this.app.get('/lists/:id/summary', this.authMiddleware.bind(this), this.getListSummary.bind(this));
    }

    setupErrorHandling() {
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: this.serviceName
            });
        });

        this.app.use((error, req, res, next) => {
            console.error('List Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
    }

    async setupRabbitMQ() {
        try {
            console.log('🔗 Conectando ao RabbitMQ no Docker...');
            this.connection = await amqp.connect(this.rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Garantir que a exchange existe
            await this.channel.assertExchange('shopping_events', 'topic', {
                durable: true
            });

            console.log('✅ List Service conectado ao RabbitMQ no Docker');
        } catch (error) {
            console.error('❌ Erro ao conectar com RabbitMQ:', error.message);
            console.log('💡 Certifique-se de que o RabbitMQ está rodando: npm run docker:up');

            // Tentar reconectar após 5 segundos
            setTimeout(() => this.setupRabbitMQ(), 5000);
        }
    }

    // Auth middleware
    async authMiddleware(req, res, next) {
        const authHeader = req.header('Authorization');

        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                message: 'Token obrigatório'
            });
        }

        try {
            const userService = serviceRegistry.discover('user-service');
            const response = await axios.post(`${userService.url}/auth/validate`, {
                token: authHeader.replace('Bearer ', '')
            }, { timeout: 5000 });

            if (response.data.success) {
                req.user = response.data.data.user;
                next();
            } else {
                res.status(401).json({
                    success: false,
                    message: 'Token inválido'
                });
            }
        } catch (error) {
            console.error('Erro na validação do token:', error.message);
            res.status(503).json({
                success: false,
                message: 'Serviço de autenticação indisponível'
            });
        }
    }

    // Conectar ao RabbitMQ
    async connectRabbitMQ() {
        try {
            // Para LocalStack, use a URL do LocalStack
            const rabbitmqUrl = process.env.LOCALSTACK_RABBITMQ_URL || this.rabbitmqUrl;
            this.connection = await amqp.connect(rabbitmqUrl);
            this.channel = await this.connection.createChannel();

            // Declarar exchange
            await this.channel.assertExchange('shopping_events', 'topic', {
                durable: true
            });

            console.log('✅ Conectado ao RabbitMQ (LocalStack)');
        } catch (error) {
            console.error('❌ Erro ao conectar com RabbitMQ:', error.message);
        }
    }

    // Publicar evento de checkout
    async publishCheckoutEvent(listId, userId, items, totalAmount) {
        if (!this.channel) {
            console.warn('RabbitMQ não disponível - evento não publicado');
            return;
        }

        try {
            const event = {
                eventId: require('uuid').v4(),
                type: 'list.checkout.completed',
                listId,
                userId,
                items: items.map(item => ({
                    itemId: item.itemId,
                    itemName: item.itemName,
                    quantity: item.quantity,
                    unit: item.unit,
                    estimatedPrice: item.estimatedPrice
                })),
                totalAmount,
                timestamp: new Date().toISOString(),
                metadata: {
                    service: 'list-service',
                    version: '1.0.0'
                }
            };

            const published = await this.channel.publish(
                'shopping_events',
                'list.checkout.completed',
                Buffer.from(JSON.stringify(event)),
                { persistent: true }
            );

            if (published) {
                console.log(`📤 Evento publicado: ${event.type} para lista ${listId}`);
                console.log(`   📊 Total: R$ ${totalAmount.toFixed(2)}`);
                console.log(`   📦 Itens: ${items.length}`);
            } else {
                console.warn('⚠️ Evento não foi publicado (canal fechado)');
            }

        } catch (error) {
            console.error('❌ Erro ao publicar evento:', error);
        }
    }

    // Nova rota de checkout
    // async checkoutList(req, res) {
    //     try {
    //         const { id } = req.params;

    //         const list = await this.listsDb.findById(id);
    //         if (!list) {
    //             return res.status(404).json({
    //                 success: false,
    //                 message: 'Lista não encontrada'
    //             });
    //         }

    //         if (list.userId !== req.user.id) {
    //             return res.status(403).json({
    //                 success: false,
    //                 message: 'Acesso negado a esta lista'
    //             });
    //         }

    //         if (list.items.length === 0) {
    //             return res.status(400).json({
    //                 success: false,
    //                 message: 'Lista vazia - não é possível fazer checkout'
    //             });
    //         }

    //         // Publicar evento assíncrono
    //         await this.publishCheckoutEvent(
    //             list.id,
    //             list.userId,
    //             list.items,
    //             list.summary.estimatedTotal
    //         );

    //         // Atualizar status da lista
    //         await this.listsDb.update(id, {
    //             status: 'completed',
    //             completedAt: new Date().toISOString(),
    //             updatedAt: new Date().toISOString()
    //         });

    //         // Resposta imediata (202 Accepted)
    //         res.status(202).json({
    //             success: true,
    //             message: 'Checkout iniciado - processamento em background',
    //             data: {
    //                 listId: list.id,
    //                 status: 'processing',
    //                 totalItems: list.items.length,
    //                 totalAmount: list.summary.estimatedTotal,
    //                 message: 'Evento publicado para processamento assíncrono'
    //             }
    //         });

    //     } catch (error) {
    //         console.error('Erro no checkout:', error);
    //         res.status(500).json({
    //             success: false,
    //             message: 'Erro interno do servidor'
    //         });
    //     }
    // }
    async checkoutList(req, res) {
        try {
            const { id } = req.params;

            console.log(`🎯 Processando checkout para lista: ${id}`);

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            if (list.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Lista vazia - não é possível fazer checkout'
                });
            }

            console.log(`📊 Publicando evento para lista com ${list.items.length} itens`);

            // Publicar evento assíncrono
            await this.publishCheckoutEvent(
                list.id,
                list.userId,
                list.items,
                list.summary.estimatedTotal
            );

            // Atualizar status da lista
            await this.listsDb.update(id, {
                status: 'completed',
                completedAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            // Resposta imediata (202 Accepted)
            res.status(202).json({
                success: true,
                message: 'Checkout iniciado - processamento em background',
                data: {
                    listId: list.id,
                    status: 'processing',
                    totalItems: list.items.length,
                    totalAmount: list.summary.estimatedTotal,
                    message: 'Evento publicado para processamento assíncrono'
                }
            });

        } catch (error) {
            console.error('❌ Erro no checkout:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Create list
    async createList(req, res) {
        try {
            const { name, description } = req.body;

            if (!name) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome da lista é obrigatório'
                });
            }

            const newList = await this.listsDb.create({
                id: uuidv4(),
                userId: req.user.id,
                name,
                description: description || '',
                status: 'active',
                items: [],
                summary: {
                    totalItems: 0,
                    purchasedItems: 0,
                    estimatedTotal: 0
                },
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });

            res.status(201).json({
                success: true,
                message: 'Lista criada com sucesso',
                data: newList
            });
        } catch (error) {
            console.error('Erro ao criar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get user's lists
    async getLists(req, res) {
        try {
            const { status } = req.query;
            const filter = { userId: req.user.id };

            if (status) {
                filter.status = status;
            }

            const lists = await this.listsDb.find(filter, {
                sort: { updatedAt: -1 }
            });

            res.json({
                success: true,
                data: lists
            });
        } catch (error) {
            console.error('Erro ao buscar listas:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get specific list
    async getList(req, res) {
        try {
            const { id } = req.params;
            const list = await this.listsDb.findById(id);

            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            // Verificar se o usuário tem acesso à lista
            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            res.json({
                success: true,
                data: list
            });
        } catch (error) {
            console.error('Erro ao buscar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Update list
    async updateList(req, res) {
        try {
            const { id } = req.params;
            const { name, description, status } = req.body;

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (description !== undefined) updates.description = description;
            if (status !== undefined) updates.status = status;
            updates.updatedAt = new Date().toISOString();

            const updatedList = await this.listsDb.update(id, updates);

            res.json({
                success: true,
                message: 'Lista atualizada com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao atualizar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Delete list
    async deleteList(req, res) {
        try {
            const { id } = req.params;

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            await this.listsDb.delete(id);

            res.json({
                success: true,
                message: 'Lista deletada com sucesso'
            });
        } catch (error) {
            console.error('Erro ao deletar lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Add item to list
    async addItemToList(req, res) {
        try {
            const { id } = req.params;
            const { itemId, quantity, notes } = req.body;

            if (!itemId || !quantity) {
                return res.status(400).json({
                    success: false,
                    message: 'ID do item e quantidade são obrigatórios'
                });
            }

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            // Buscar informações do item no Item Service
            let itemInfo;
            try {
                const itemService = serviceRegistry.discover('item-service');
                const response = await axios.get(`${itemService.url}/items/${itemId}`, { timeout: 5000 });
                itemInfo = response.data.data;
            } catch (error) {
                console.error('Erro ao buscar item:', error.message);
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado no catálogo'
                });
            }

            // Verificar se item já existe na lista
            const existingItemIndex = list.items.findIndex(item => item.itemId === itemId);

            if (existingItemIndex >= 0) {
                // Atualizar quantidade se item já existe
                list.items[existingItemIndex].quantity += parseFloat(quantity);
                list.items[existingItemIndex].updatedAt = new Date().toISOString();
            } else {
                // Adicionar novo item à lista
                list.items.push({
                    itemId,
                    itemName: itemInfo.name,
                    quantity: parseFloat(quantity),
                    unit: itemInfo.unit,
                    estimatedPrice: itemInfo.averagePrice,
                    purchased: false,
                    notes: notes || '',
                    addedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });
            }

            // Atualizar resumo da lista
            this.updateListSummary(list);

            list.updatedAt = new Date().toISOString();
            const updatedList = await this.listsDb.update(id, list);

            res.json({
                success: true,
                message: 'Item adicionado à lista com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao adicionar item à lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Update item in list
    async updateItemInList(req, res) {
        try {
            const { id, itemId } = req.params;
            const { quantity, purchased, notes } = req.body;

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            const itemIndex = list.items.findIndex(item => item.itemId === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado na lista'
                });
            }

            if (quantity !== undefined) list.items[itemIndex].quantity = parseFloat(quantity);
            if (purchased !== undefined) list.items[itemIndex].purchased = purchased;
            if (notes !== undefined) list.items[itemIndex].notes = notes;
            list.items[itemIndex].updatedAt = new Date().toISOString();

            // Atualizar resumo da lista
            this.updateListSummary(list);

            list.updatedAt = new Date().toISOString();
            const updatedList = await this.listsDb.update(id, list);

            res.json({
                success: true,
                message: 'Item atualizado com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao atualizar item na lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Remove item from list
    async removeItemFromList(req, res) {
        try {
            const { id, itemId } = req.params;

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            const itemIndex = list.items.findIndex(item => item.itemId === itemId);
            if (itemIndex === -1) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado na lista'
                });
            }

            list.items.splice(itemIndex, 1);

            // Atualizar resumo da lista
            this.updateListSummary(list);

            list.updatedAt = new Date().toISOString();
            const updatedList = await this.listsDb.update(id, list);

            res.json({
                success: true,
                message: 'Item removido da lista com sucesso',
                data: updatedList
            });
        } catch (error) {
            console.error('Erro ao remover item da lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get list summary
    async getListSummary(req, res) {
        try {
            const { id } = req.params;

            const list = await this.listsDb.findById(id);
            if (!list) {
                return res.status(404).json({
                    success: false,
                    message: 'Lista não encontrada'
                });
            }

            if (list.userId !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Acesso negado a esta lista'
                });
            }

            res.json({
                success: true,
                data: list.summary
            });
        } catch (error) {
            console.error('Erro ao buscar resumo da lista:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Helper method to update list summary
    updateListSummary(list) {
        let totalItems = 0;
        let purchasedItems = 0;
        let estimatedTotal = 0;

        list.items.forEach(item => {
            totalItems += item.quantity;
            if (item.purchased) {
                purchasedItems += item.quantity;
            }
            estimatedTotal += item.quantity * (item.estimatedPrice || 0);
        });

        list.summary = {
            totalItems,
            purchasedItems,
            estimatedTotal: parseFloat(estimatedTotal.toFixed(2)),
            completionPercentage: totalItems > 0 ? Math.round((purchasedItems / totalItems) * 100) : 0
        };
    }

    // Register with service registry
    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            database: 'JSON-NoSQL',
            endpoints: ['/health', '/lists']
        });
    }

    // Start health check reporting
    startHealthReporting() {
        setInterval(() => {
            serviceRegistry.updateHealth(this.serviceName, true);
        }, 30000);
    }

    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            database: 'JSON-NoSQL',
            endpoints: ['/health', '/lists']
        });
    }

    start() {
        this.app.listen(this.port, async () => {
            console.log('=====================================');
            console.log(`List Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log('=====================================');

            // Conectar ao RabbitMQ
            await this.connectRabbitMQ();

            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }

    // Graceful shutdown
    async close() {
        if (this.channel) {
            await this.channel.close();
        }
        if (this.connection) {
            await this.connection.close();
        }
    }
}

// Start service
if (require.main === module) {
    const listService = new ListService();
    listService.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        serviceRegistry.unregister('list-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('list-service');
        process.exit(0);
    });
}

module.exports = ListService;