// middleware/cache.js
const NodeCache = require('node-cache');

// Cria uma instância de cache.
// stdTTL (Time To Live padrão) de 2 minutos (120 segundos).
// checkperiod: verifica e remove caches expirados a cada 5 minutos.
const cache = new NodeCache({ stdTTL: 120, checkperiod: 300 });

/**
 * Middleware para gerenciar o cache de respostas.
 */
const cacheMiddleware = (req, res, next) => {
    try {
        const cacheKey = `cache-${req.user.id}-${req.originalUrl}`;
        const cachedData = cache.get(cacheKey);
        
        if (cachedData) {
            console.log(`CACHE HIT: ${cacheKey}`);
            return res.status(200).json(cachedData);
        }

        console.log(`CACHE MISS: ${cacheKey}`);

        const originalJson = res.json;
        res.json = (body) => {
            // Cache com TTL de 5 minutos (300 segundos)
            cache.set(cacheKey, body, 300);
            console.log(`CACHE SET: ${cacheKey} (TTL: 300s)`);
            originalJson.call(res, body);
        };
        
        next();
    } catch (error) {
        console.error("Erro no middleware de cache:", error);
        next();
    }
};

/**
 * Função para invalidar o cache de um usuário.
 * Usada após operações de escrita (POST, PUT, DELETE).
 */
const invalidateUserCache = (userId) => {
    // Busca todas as chaves de cache que pertencem ao usuário
    const userKeys = cache.keys().filter(key => key.startsWith(`cache-${userId}-`));
    
    if (userKeys.length > 0) {
        console.log(`CACHE INVALIDATE: Removendo chaves para o usuário ${userId}:`, userKeys);
        cache.del(userKeys);
    }
};

module.exports = {
    cacheMiddleware,
    invalidateUserCache
};