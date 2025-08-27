const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');
const config = require('./config/database');
const database = require('./database/database');
const logger = require('./config/logger');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

/**
* Servidor de Aplicação Tradicional
*
* Implementa arquitetura cliente-servidor conforme Coulouris et al. (2012):
* - Centralização do estado da aplicação
* - Comunicação Request-Reply via HTTP
* - Processamento síncrono das requisições
*/

const app = express();

// Middleware de segurança
app.use(helmet());
app.use(cors());

// Parsing de dados
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMessage = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - IP: ${req.ip}`;

        logger.http(logMessage, {
            method: req.method,
            url: req.originalUrl,
            status: res.statusCode,
            responseTimeMs: duration,
            ip: req.ip,
        });
    });
    next();
});

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'API de Gerenciamento de Tarefas',
            version: '1.0.0',
            description: 'Documentação interativa da API. Use o botão "Authorize" para testar os endpoints protegidos.',
        },
        servers: [
            {
                url: `http://localhost:${config.port}`,
                description: 'Servidor de Desenvolvimento',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
            schemas: {
                UserInput: {
                    type: 'object',
                    required: ['email', 'username', 'password', 'firstName', 'lastName'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        username: { type: 'string', example: 'newuser' },
                        password: { type: 'string', format: 'password', example: 'password123' },
                        firstName: { type: 'string', example: 'João' },
                        lastName: { type: 'string', example: 'Silva' },
                    },
                },
                LoginInput: {
                    type: 'object',
                    required: ['identifier', 'password'],
                    properties: {
                        identifier: { type: 'string', description: 'Email ou username', example: 'user@example.com' },
                        password: { type: 'string', format: 'password', example: 'password123' },
                    },
                },
                Task: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        completed: { type: 'boolean' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
                        category: { type: 'string' },
                        tags: { type: 'array', items: { type: 'string' } },
                        userId: { type: 'string', format: 'uuid' },
                        createdAt: { type: 'string', format: 'date-time' },
                    },
                },
                TaskInput: {
                    type: 'object',
                    required: ['title'],
                    properties: {
                        title: { type: 'string', example: 'Finalizar documentação' },
                        description: { type: 'string', example: 'Usar Swagger para documentar a API.' },
                        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], example: 'high' },
                        category: { type: 'string', example: 'Desenvolvimento' },
                        tags: { type: 'array', items: { type: 'string' }, example: ['swagger', 'docs'] },
                    },
                },
                Error: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string' },
                    },
                },
            },
        },
    },
    apis: ['./routes/tasks.js']
    //   apis: ['./routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

const authLimiter = rateLimit({
    ...config.rateLimit.auth
});

// API Routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/tasks', taskRoutes);

// Rotas principais
app.get('/', (req, res) => {
    res.json({
        service: 'Task Management API',
        version: '1.0.0',
        architecture: 'Traditional Client-Server',
        endpoints: {
            auth: ['POST /api/auth/register', 'POST /api/auth/login'],
            tasks: ['GET /api/tasks', 'POST /api/tasks', 'PUT /api/tasks/:id', 'DELETE /api/tasks/:id']
        }
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// 404 handler
app.use('/{*any}', (req, res) => {
    logger.warn(`Rota não encontrada: ${req.method} ${req.originalUrl}`);
    res.status(404).json({
        success: false,
        message: 'Endpoint não encontrado'
    });
});

// Error handler global
app.use((error, req, res, next) => {
    logger.error(error.message, {
        stack: error.stack,
        url: req.originalUrl,
        method: req.method,
    });
    res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
    });
});

// Inicialização
async function startServer() {
    try {
        await database.init();
        app.listen(config.port, () => {
            // 💡 5. Usar o logger para as mensagens de inicialização
            logger.info('🚀 =================================');
            logger.info(`🚀 Servidor iniciado na porta ${config.port}`);
            logger.info(`🚀 URL: http://localhost:${config.port}`);
            logger.info(`🚀 Health: http://localhost:${config.port}/health`);
            logger.info('🚀 =================================');
        });
    } catch (error) {
        // 💡 6. Usar o logger para erros fatais na inicialização
        logger.error('❌ Falha na inicialização:', { error: error.message, stack: error.stack });
        process.exit(1);
    }
}

if (require.main === module) {
    startServer();
}

module.exports = app;