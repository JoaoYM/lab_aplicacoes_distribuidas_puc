// services/item-service/server.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const JsonDatabase = require('../../shared/JsonDatabase');
const serviceRegistry = require('../../shared/serviceRegistry');

class ItemService {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3003;
        this.serviceName = 'item-service';
        this.serviceUrl = `http://127.0.0.1:${this.port}`;
        
        this.setupDatabase();
        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        this.seedInitialData();
    }

    setupDatabase() {
        const dbPath = path.join(__dirname, 'database');
        this.itemsDb = new JsonDatabase(dbPath, 'items');
        console.log('Item Service: Banco NoSQL inicializado');
    }

    async seedInitialData() {
        setTimeout(async () => {
            try {
                const existingItems = await this.itemsDb.find();
                
                if (existingItems.length === 0) {
                    const sampleItems = [
                        // Alimentos
                        { id: uuidv4(), name: 'Arroz', category: 'Alimentos', brand: 'Tio João', unit: 'kg', averagePrice: 5.99, barcode: '7891000053500', description: 'Arroz branco tipo 1', active: true },
                        { id: uuidv4(), name: 'Feijão', category: 'Alimentos', brand: 'Camil', unit: 'kg', averagePrice: 8.49, barcode: '7891000053517', description: 'Feijão carioca', active: true },
                        { id: uuidv4(), name: 'Açúcar', category: 'Alimentos', brand: 'União', unit: 'kg', averagePrice: 4.29, barcode: '7891000053524', description: 'Açúcar refinado', active: true },
                        { id: uuidv4(), name: 'Macarrão', category: 'Alimentos', brand: 'Renata', unit: 'un', averagePrice: 3.99, barcode: '7891000053531', description: 'Macarrão espaguete', active: true },
                        { id: uuidv4(), name: 'Óleo de Soja', category: 'Alimentos', brand: 'Liza', unit: 'litro', averagePrice: 7.89, barcode: '7891000053548', description: 'Óleo de soja refinado', active: true },
                        
                        // Limpeza
                        { id: uuidv4(), name: 'Detergente', category: 'Limpeza', brand: 'Ypê', unit: 'un', averagePrice: 2.49, barcode: '7891000053555', description: 'Detergente líquido', active: true },
                        { id: uuidv4(), name: 'Sabão em Pó', category: 'Limpeza', brand: 'Omo', unit: 'kg', averagePrice: 12.99, barcode: '7891000053562', description: 'Sabão em pó multiuso', active: true },
                        { id: uuidv4(), name: 'Água Sanitária', category: 'Limpeza', brand: 'Qboa', unit: 'litro', averagePrice: 6.79, barcode: '7891000053579', description: 'Água sanitária', active: true },
                        { id: uuidv4(), name: 'Desinfetante', category: 'Limpeza', brand: 'Pinho Sol', unit: 'litro', averagePrice: 8.99, barcode: '7891000053586', description: 'Desinfetante pinho', active: true },
                        
                        // Higiene
                        { id: uuidv4(), name: 'Sabonete', category: 'Higiene', brand: 'Dove', unit: 'un', averagePrice: 2.99, barcode: '7891000053593', description: 'Sabonete hidratante', active: true },
                        { id: uuidv4(), name: 'Shampoo', category: 'Higiene', brand: 'Head & Shoulders', unit: 'un', averagePrice: 15.99, barcode: '7891000053609', description: 'Shampoo anticaspa', active: true },
                        { id: uuidv4(), name: 'Creme Dental', category: 'Higiene', brand: 'Colgate', unit: 'un', averagePrice: 4.79, barcode: '7891000053616', description: 'Creme dental total 12', active: true },
                        { id: uuidv4(), name: 'Papel Higiênico', category: 'Higiene', brand: 'Neve', unit: 'un', averagePrice: 9.99, barcode: '7891000053623', description: 'Papel higiênico 30m', active: true },
                        
                        // Bebidas
                        { id: uuidv4(), name: 'Refrigerante', category: 'Bebidas', brand: 'Coca-Cola', unit: 'litro', averagePrice: 7.99, barcode: '7891000053630', description: 'Refrigerante cola', active: true },
                        { id: uuidv4(), name: 'Suco', category: 'Bebidas', brand: 'Del Valle', unit: 'litro', averagePrice: 6.49, barcode: '7891000053647', description: 'Suco de laranja', active: true },
                        { id: uuidv4(), name: 'Café', category: 'Bebidas', brand: 'Melitta', unit: 'kg', averagePrice: 14.99, barcode: '7891000053654', description: 'Café torrado e moído', active: true },
                        { id: uuidv4(), name: 'Leite', category: 'Bebidas', brand: 'Itambé', unit: 'litro', averagePrice: 4.29, barcode: '7891000053661', description: 'Leite integral', active: true },
                        
                        // Padaria
                        { id: uuidv4(), name: 'Pão Francês', category: 'Padaria', brand: '', unit: 'un', averagePrice: 0.50, barcode: '', description: 'Pão francês', active: true },
                        { id: uuidv4(), name: 'Bolo', category: 'Padaria', brand: '', unit: 'kg', averagePrice: 24.99, barcode: '', description: 'Bolo simples', active: true },
                        { id: uuidv4(), name: 'Biscoito', category: 'Padaria', brand: 'Marilan', unit: 'un', averagePrice: 3.49, barcode: '7891000053678', description: 'Biscoito água e sal', active: true }
                    ];

                    for (const item of sampleItems) {
                        await this.itemsDb.create(item);
                    }

                    console.log('Itens de exemplo criados no Item Service');
                }
            } catch (error) {
                console.error('Erro ao criar dados iniciais:', error);
            }
        }, 1000);
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
                const itemCount = await this.itemsDb.count();
                const activeItems = await this.itemsDb.count({ active: true });
                
                res.json({
                    service: this.serviceName,
                    status: 'healthy',
                    timestamp: new Date().toISOString(),
                    uptime: process.uptime(),
                    database: {
                        type: 'JSON-NoSQL',
                        itemCount: itemCount,
                        activeItems: activeItems
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
                service: 'Item Service',
                version: '1.0.0',
                description: 'Microsserviço para gerenciamento de itens com NoSQL',
                endpoints: [
                    'GET /items',
                    'GET /items/:id',
                    'POST /items',
                    'PUT /items/:id',
                    'GET /categories',
                    'GET /search?q=termo'
                ]
            });
        });

        // Item routes
        this.app.get('/items', this.getItems.bind(this));
        this.app.get('/items/:id', this.getItem.bind(this));
        this.app.post('/items', this.authMiddleware.bind(this), this.createItem.bind(this));
        this.app.put('/items/:id', this.authMiddleware.bind(this), this.updateItem.bind(this));
        
        // Category routes
        this.app.get('/categories', this.getCategories.bind(this));
        
        // Search route
        this.app.get('/search', this.searchItems.bind(this));
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
            console.error('Item Service Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do serviço',
                service: this.serviceName
            });
        });
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

    // Get items
    async getItems(req, res) {
        try {
            const { page = 1, limit = 10, category, search, active = true } = req.query;
            const skip = (page - 1) * parseInt(limit);
            
            const filter = { active: active === 'true' };
            if (category) filter.category = category;

            let items;
            
            if (search) {
                items = await this.itemsDb.search(search, ['name', 'description', 'brand', 'category']);
                items = items.filter(item => {
                    for (const [key, value] of Object.entries(filter)) {
                        if (item[key] !== value) return false;
                    }
                    return true;
                });
                items = items.slice(skip, skip + parseInt(limit));
            } else {
                items = await this.itemsDb.find(filter, {
                    skip: skip,
                    limit: parseInt(limit),
                    sort: { name: 1 }
                });
            }

            const total = await this.itemsDb.count(filter);

            res.json({
                success: true,
                data: items,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: total,
                    pages: Math.ceil(total / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Erro ao buscar itens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get item by ID
    async getItem(req, res) {
        try {
            const { id } = req.params;
            const item = await this.itemsDb.findById(id);

            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            res.json({
                success: true,
                data: item
            });
        } catch (error) {
            console.error('Erro ao buscar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Create item
    async createItem(req, res) {
        try {
            const { name, category, brand, unit, averagePrice, barcode, description } = req.body;

            if (!name || !category) {
                return res.status(400).json({
                    success: false,
                    message: 'Nome e categoria são obrigatórios'
                });
            }

            const newItem = await this.itemsDb.create({
                id: uuidv4(),
                name,
                category,
                brand: brand || '',
                unit: unit || 'un',
                averagePrice: parseFloat(averagePrice) || 0,
                barcode: barcode || '',
                description: description || '',
                active: true
            });

            res.status(201).json({
                success: true,
                message: 'Item criado com sucesso',
                data: newItem
            });
        } catch (error) {
            console.error('Erro ao criar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Update item
    async updateItem(req, res) {
        try {
            const { id } = req.params;
            const { name, category, brand, unit, averagePrice, barcode, description, active } = req.body;

            const item = await this.itemsDb.findById(id);
            if (!item) {
                return res.status(404).json({
                    success: false,
                    message: 'Item não encontrado'
                });
            }

            const updates = {};
            if (name !== undefined) updates.name = name;
            if (category !== undefined) updates.category = category;
            if (brand !== undefined) updates.brand = brand;
            if (unit !== undefined) updates.unit = unit;
            if (averagePrice !== undefined) updates.averagePrice = parseFloat(averagePrice);
            if (barcode !== undefined) updates.barcode = barcode;
            if (description !== undefined) updates.description = description;
            if (active !== undefined) updates.active = active;

            const updatedItem = await this.itemsDb.update(id, updates);

            res.json({
                success: true,
                message: 'Item atualizado com sucesso',
                data: updatedItem
            });
        } catch (error) {
            console.error('Erro ao atualizar item:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Get categories
    async getCategories(req, res) {
        try {
            const items = await this.itemsDb.find({ active: true });
            
            const categoriesMap = new Map();
            items.forEach(item => {
                if (item.category) {
                    if (!categoriesMap.has(item.category)) {
                        categoriesMap.set(item.category, {
                            name: item.category,
                            itemCount: 0
                        });
                    }
                    categoriesMap.get(item.category).itemCount++;
                }
            });

            const categories = Array.from(categoriesMap.values())
                .sort((a, b) => a.name.localeCompare(b.name));
            
            res.json({
                success: true,
                data: categories
            });
        } catch (error) {
            console.error('Erro ao buscar categorias:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Search items
    async searchItems(req, res) {
        try {
            const { q, limit = 20, category } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            let items = await this.itemsDb.search(q, ['name', 'description', 'brand', 'category']);
            items = items.filter(item => item.active);

            if (category) {
                items = items.filter(item => item.category === category);
            }

            items = items.slice(0, parseInt(limit));

            res.json({
                success: true,
                data: {
                    query: q,
                    category: category || null,
                    results: items,
                    total: items.length
                }
            });
        } catch (error) {
            console.error('Erro na busca de itens:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do servidor'
            });
        }
    }

    // Register with service registry
    registerWithRegistry() {
        serviceRegistry.register(this.serviceName, {
            url: this.serviceUrl,
            version: '1.0.0',
            database: 'JSON-NoSQL',
            endpoints: ['/health', '/items', '/categories', '/search']
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
            endpoints: ['/health', '/items', '/categories', '/search']
        });
    }
    
    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`Item Service iniciado na porta ${this.port}`);
            console.log(`URL: ${this.serviceUrl}`);
            console.log(`Health: ${this.serviceUrl}/health`);
            console.log('=====================================');
            
            this.registerWithRegistry();
            this.startHealthReporting();
        });
    }
}

// Start service
if (require.main === module) {
    const itemService = new ItemService();
    itemService.start();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
    process.on('SIGINT', () => {
        serviceRegistry.unregister('item-service');
        process.exit(0);
    });
}

module.exports = ItemService;