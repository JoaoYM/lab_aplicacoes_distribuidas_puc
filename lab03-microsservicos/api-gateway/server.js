const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const axios = require('axios');
const RouteMapper = require('../routes/routingMapper'); // Ajuste o path conforme necessário

// Importar service registry
const serviceRegistry = require('../shared/serviceRegistry');

class APIGateway {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.routeMapper = new RouteMapper(); // Instância única do RouteMapper

        // Circuit breaker simples
        this.circuitBreakers = new Map();

        this.setupMiddleware();
        this.setupRoutes();
        this.setupErrorHandling();
        setTimeout(() => {
            this.startHealthChecks();
        }, 3000);
    }

    setupMiddleware() {
        this.app.use((req, res, next) => {
            console.log('🎯 REQUISIÇÃO CHEGOU NO GATEWAY:', req.method, req.originalUrl);
            next();
        });

        this.app.use(helmet());
        this.app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));
        this.app.use(morgan('combined'));
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));

        // Gateway headers
        this.app.use((req, res, next) => {
            res.setHeader('X-Gateway', 'api-gateway');
            res.setHeader('X-Gateway-Version', '1.0.0');
            res.setHeader('X-Architecture', 'Microservices-NoSQL');
            next();
        });

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${req.method} ${req.originalUrl} - ${req.ip}`);
            next();
        });
    }

    setupRoutes() {
        // Rota única para todos os serviços usando RouteMapper
        this.app.use('/api', (req, res, next) => {
            this.proxyRequest(req, res, next);
        });

        // Gateway health check
        this.app.get('/health', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                service: 'api-gateway',
                status: 'healthy',
                timestamp: new Date().toISOString(),
                architecture: 'Microservices with NoSQL',
                services: services,
                serviceCount: Object.keys(services).length
            });
        });

        // Gateway info
        this.app.get('/', (req, res) => {
            res.json({
                service: 'API Gateway',
                version: '1.0.0',
                description: 'Gateway para microsserviços com NoSQL',
                architecture: 'Microservices with NoSQL databases',
                database_approach: 'Database per Service (JSON-NoSQL)',
                endpoints: {
                    auth: '/api/auth/*',
                    users: '/api/users/*',
                    items: '/api/items/*',
                    lists: '/api/lists/*',
                    categories: '/api/categories',
                    search: '/api/search',
                    health: '/health',
                    registry: '/registry',
                    dashboard: '/api/dashboard'
                },
                services: serviceRegistry.listServices()
            });
        });

        // Service registry endpoint
        this.app.get('/registry', (req, res) => {
            const services = serviceRegistry.listServices();
            res.json({
                success: true,
                services: services,
                count: Object.keys(services).length,
                timestamp: new Date().toISOString()
            });
        });

        // Debug endpoint para troubleshooting
        this.app.get('/debug/services', (req, res) => {
            serviceRegistry.debugListServices();
            res.json({
                success: true,
                services: serviceRegistry.listServices(),
                stats: serviceRegistry.getStats()
            });
        });

        // Endpoints agregados
        this.app.get('/api/dashboard', this.getDashboard.bind(this));
        this.app.get('/api/search', this.globalSearch.bind(this));
    }

    setupErrorHandling() {
        // 404 handler
        this.app.use('*', (req, res) => {
            res.status(404).json({
                success: false,
                message: 'Endpoint não encontrado',
                service: 'api-gateway',
                availableEndpoints: {
                    auth: '/api/auth/*',
                    users: '/api/users/*',
                    items: '/api/items/*',
                    lists: '/api/lists/*',
                    dashboard: '/api/dashboard',
                    search: '/api/search'
                }
            });
        });

        // Error handler
        this.app.use((error, req, res, next) => {
            console.error('Gateway Error:', error);
            res.status(500).json({
                success: false,
                message: 'Erro interno do gateway',
                service: 'api-gateway'
            });
        });
    }

    // Método auxiliar para extrair o nome do serviço da URL
    extractServiceName(originalPath) {
        if (originalPath.startsWith('/api/auth')) {
            return 'user-service';
        } else if (originalPath.startsWith('/api/users')) {
            return 'user-service';
        } else if (originalPath.startsWith('/api/items')) {
            return 'item-service';
        } else if (originalPath.startsWith('/api/lists')) {
            return 'list-service';
        } else if (originalPath.startsWith('/api/categories')) {
            return 'item-service';
        } else if (originalPath.startsWith('/api/search')) {
            return 'item-service';
        }
        
        return null;
    }

    // Proxy request refatorado usando RouteMapper
    async proxyRequest(req, res, next) {
        try {
            const originalPath = req.originalUrl;
            const serviceName = this.extractServiceName(originalPath);

            console.log(`🔄 Proxy request: ${req.method} ${originalPath} -> ${serviceName}`);

            console.log('=== 🎯 DEBUG ROTEAMENTO ===');
            console.log('Original Path:', originalPath);
            console.log('Service Name:', serviceName);

            if (!serviceName) {
                return res.status(404).json({
                    success: false,
                    message: 'Serviço não encontrado para a rota solicitada',
                    path: originalPath
                });
            }

            // Verificar circuit breaker
            if (this.isCircuitOpen(serviceName)) {
                console.log(`⚡ Circuit breaker open for ${serviceName}`);
                return res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} temporariamente indisponível`,
                    service: serviceName
                });
            }

            // Descobrir serviço
            let service;
            try {
                service = serviceRegistry.discover(serviceName);
            } catch (error) {
                console.error(`❌ Erro na descoberta do serviço ${serviceName}:`, error.message);
                return res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} não encontrado`,
                    service: serviceName,
                    availableServices: Object.keys(serviceRegistry.listServices())
                });
            }

            // Usar RouteMapper para obter o path correto
            const targetPath = this.routeMapper.map(serviceName, originalPath);

            const targetUrl = `${service.url}${targetPath}`;

            console.log(`🎯 Target URL: ${targetUrl}`);

            // Configurar requisição
            const config = {
                method: req.method,
                url: targetUrl,
                headers: { ...req.headers },
                timeout: 10000,
                family: 4,
                validateStatus: function (status) {
                    return status < 500;
                }
            };

            // Adicionar body para requisições POST/PUT/PATCH
            if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
                config.data = req.body;
            }

            // Adicionar query parameters
            if (Object.keys(req.query).length > 0) {
                config.params = req.query;
            }

            // Remover headers problemáticos
            delete config.headers.host;
            delete config.headers['content-length'];

            console.log(`📤 Enviando ${req.method} para ${targetUrl}`);

            // Fazer requisição
            const response = await axios(config);

            // Resetar circuit breaker em caso de sucesso
            this.resetCircuitBreaker(serviceName);

            console.log(`📥 Resposta recebida: ${response.status}`);

            // Retornar resposta
            res.status(response.status).json(response.data);

        } catch (error) {
            const serviceName = this.extractServiceName(req.originalUrl);
            
            // Registrar falha
            if (serviceName) {
                this.recordFailure(serviceName);
            }

            console.error(`❌ Proxy error:`, {
                message: error.message,
                code: error.code,
                url: error.config?.url,
                status: error.response?.status
            });

            if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
                res.status(503).json({
                    success: false,
                    message: `Serviço ${serviceName} indisponível`,
                    service: serviceName,
                    error: error.code
                });
            } else if (error.response) {
                // Encaminhar resposta de erro do serviço
                console.log(`🔄 Encaminhando erro ${error.response.status} do serviço`);
                res.status(error.response.status).json(error.response.data);
            } else {
                res.status(500).json({
                    success: false,
                    message: 'Erro interno do gateway',
                    service: 'api-gateway',
                    error: error.message
                });
            }
        }
    }

    // Circuit Breaker (mantido igual)
    isCircuitOpen(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (!breaker) return false;

        const now = Date.now();

        if (breaker.isOpen && (now - breaker.lastFailure) > 30000) {
            breaker.isOpen = false;
            breaker.isHalfOpen = true;
            console.log(`Circuit breaker half-open for ${serviceName}`);
            return false;
        }

        return breaker.isOpen;
    }

    recordFailure(serviceName) {
        let breaker = this.circuitBreakers.get(serviceName) || {
            failures: 0,
            isOpen: false,
            isHalfOpen: false,
            lastFailure: null
        };

        breaker.failures++;
        breaker.lastFailure = Date.now();

        if (breaker.failures >= 3) {
            breaker.isOpen = true;
            breaker.isHalfOpen = false;
            console.log(`Circuit breaker opened for ${serviceName}`);
        }

        this.circuitBreakers.set(serviceName, breaker);
    }

    resetCircuitBreaker(serviceName) {
        const breaker = this.circuitBreakers.get(serviceName);
        if (breaker) {
            breaker.failures = 0;
            breaker.isOpen = false;
            breaker.isHalfOpen = false;
            console.log(`Circuit breaker reset for ${serviceName}`);
        }
    }

    // Dashboard agregado (ajustado para novos serviços)
    async getDashboard(req, res) {
        try {
            const authHeader = req.header('Authorization');

            if (!authHeader) {
                return res.status(401).json({
                    success: false,
                    message: 'Token de autenticação obrigatório'
                });
            }

            // Buscar dados de múltiplos serviços
            const [userResponse, itemsResponse, categoriesResponse, listsResponse] = await Promise.allSettled([
                this.callService('user-service', '/users', 'GET', authHeader, { limit: 5 }),
                this.callService('item-service', '/items', 'GET', null, { limit: 5 }),
                this.callService('item-service', '/categories', 'GET', null, {}),
                this.callService('list-service', '/lists', 'GET', authHeader, { limit: 5 })
            ]);

            const dashboard = {
                timestamp: new Date().toISOString(),
                architecture: 'Microservices with NoSQL',
                database_approach: 'Database per Service',
                services_status: serviceRegistry.listServices(),
                data: {
                    users: {
                        available: userResponse.status === 'fulfilled',
                        data: userResponse.status === 'fulfilled' ? userResponse.value.data : null,
                        error: userResponse.status === 'rejected' ? userResponse.reason.message : null
                    },
                    items: {
                        available: itemsResponse.status === 'fulfilled',
                        data: itemsResponse.status === 'fulfilled' ? itemsResponse.value.data : null,
                        error: itemsResponse.status === 'rejected' ? itemsResponse.reason.message : null
                    },
                    categories: {
                        available: categoriesResponse.status === 'fulfilled',
                        data: categoriesResponse.status === 'fulfilled' ? categoriesResponse.value.data : null,
                        error: categoriesResponse.status === 'rejected' ? categoriesResponse.reason.message : null
                    },
                    lists: {
                        available: listsResponse.status === 'fulfilled',
                        data: listsResponse.status === 'fulfilled' ? listsResponse.value.data : null,
                        error: listsResponse.status === 'rejected' ? listsResponse.reason.message : null
                    }
                }
            };

            res.json({
                success: true,
                data: dashboard
            });

        } catch (error) {
            console.error('Erro no dashboard:', error);
            res.status(500).json({
                success: false,
                message: 'Erro ao agregar dados do dashboard'
            });
        }
    }

    // Busca global entre serviços (ajustado)
    async globalSearch(req, res) {
        try {
            const { q } = req.query;

            if (!q) {
                return res.status(400).json({
                    success: false,
                    message: 'Parâmetro de busca "q" é obrigatório'
                });
            }

            const authHeader = req.header('Authorization');
            const searches = [
                this.callService('item-service', '/search', 'GET', null, { q })
            ];

            // Adicionar busca de usuários se autenticado
            if (authHeader) {
                searches.push(
                    this.callService('user-service', '/search', 'GET', authHeader, { q, limit: 5 })
                );
            }

            const [itemResults, userResults] = await Promise.allSettled(searches);

            const results = {
                query: q,
                items: {
                    available: itemResults.status === 'fulfilled',
                    results: itemResults.status === 'fulfilled' ? itemResults.value.data.results : [],
                    error: itemResults.status === 'rejected' ? itemResults.reason.message : null
                }
            };

            if (userResults) {
                results.users = {
                    available: userResults.status === 'fulfilled',
                    results: userResults.status === 'fulfilled' ? userResults.value.data.results : [],
                    error: userResults.status === 'rejected' ? userResults.reason.message : null
                };
            }

            res.json({
                success: true,
                data: results
            });

        } catch (error) {
            console.error('Erro na busca global:', error);
            res.status(500).json({
                success: false,
                message: 'Erro na busca'
            });
        }
    }

    // Helper para chamar serviços (mantido igual)
    async callService(serviceName, path, method = 'GET', authHeader = null, params = {}) {
        const service = serviceRegistry.discover(serviceName);

        const config = {
            method,
            url: `${service.url}${path}`,
            timeout: 5000
        };

        if (authHeader) {
            config.headers = { Authorization: authHeader };
        }

        if (method === 'GET' && Object.keys(params).length > 0) {
            config.params = params;
        }

        const response = await axios(config);
        return response.data;
    }

    // Health checks para serviços registrados (mantido igual)
    startHealthChecks() {
        setInterval(async () => {
            await serviceRegistry.performHealthChecks();
        }, 30000);

        setTimeout(async () => {
            await serviceRegistry.performHealthChecks();
        }, 5000);
    }

    start() {
        this.app.listen(this.port, () => {
            console.log('=====================================');
            console.log(`API Gateway iniciado na porta ${this.port}`);
            console.log(`URL: http://localhost:${this.port}`);
            console.log(`Health: http://localhost:${this.port}/health`);
            console.log(`Registry: http://localhost:${this.port}/registry`);
            console.log(`Dashboard: http://localhost:${this.port}/api/dashboard`);
            console.log(`Architecture: Microservices with NoSQL`);
            console.log('=====================================');
            console.log('Rotas disponíveis:');
            console.log('   POST /api/auth/register');
            console.log('   POST /api/auth/login');
            console.log('   GET  /api/users');
            console.log('   GET  /api/items');
            console.log('   GET  /api/lists');
            console.log('   GET  /api/categories');
            console.log('   GET  /api/search?q=termo');
            console.log('   GET  /api/dashboard');
            console.log('=====================================');
        });
    }
}

// Start gateway
if (require.main === module) {
    const gateway = new APIGateway();
    gateway.start();

    // Graceful shutdown
    process.on('SIGTERM', () => process.exit(0));
    process.on('SIGINT', () => process.exit(0));
}

module.exports = APIGateway;