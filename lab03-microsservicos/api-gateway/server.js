// api-gateway/server.js (modificações)
// Adicionar rotas para os novos serviços

// Importar os novos serviços
const ItemService = require('../services/item-service/server');
const ListService = require('../services/list-service/server');

// Adicionar rotas para item-service
app.use('/api/items', createProxyMiddleware({
    target: 'http://127.0.0.1:3003',
    changeOrigin: true,
    pathRewrite: {
        '^/api/items': '/'
    },
    onError: (err, req, res) => {
        console.error('Erro no proxy para Item Service:', err.message);
        res.status(503).json({
            success: false,
            message: 'Item Service indisponível'
        });
    }
}));

// Adicionar rotas para list-service
app.use('/api/lists', createProxyMiddleware({
    target: 'http://127.0.0.1:3004',
    changeOrigin: true,
    pathRewrite: {
        '^/api/lists': '/'
    },
    onError: (err, req, res) => {
        console.error('Erro no proxy para List Service:', err.message);
        res.status(503).json({
            success: false,
            message: 'List Service indisponível'
        });
    }
}));

// Atualizar o registro de serviços
serviceRegistry.register('item-service', {
    url: 'http://127.0.0.1:3003',
    version: '1.0.0',
    database: 'JSON-NoSQL',
    endpoints: ['/health', '/items', '/categories', '/search']
});

serviceRegistry.register('list-service', {
    url: 'http://127.0.0.1:3004',
    version: '1.0.0',
    database: 'JSON-NoSQL',
    endpoints: ['/health', '/lists']
});