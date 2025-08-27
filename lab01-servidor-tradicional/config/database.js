module.exports = {
    // Configurações do servidor
    port: process.env.PORT || 3000,
    
    // JWT
    jwtSecret: process.env.JWT_SECRET || 'seu-secret-aqui',
    jwtExpiration: '24h',
    
    // 💡 Rate limiting atualizado com duas políticas
    rateLimit: {
        // Política para rotas autenticadas da API (mais flexível)
        api: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 100000, // Máximo de 1000 requisições por usuário
            message: { success: false, message: 'Muitas requisições, por favor, aguarde.' }
        },
        // Política para rotas de autenticação (mais restrita, baseada em IP)
        auth: {
            windowMs: 15 * 60 * 1000, // 15 minutos
            max: 10, // Máximo de 10 tentativas de login/registro por IP
            message: { success: false, message: 'Muitas tentativas de autenticação, por favor, aguarde.' }
        }
    }
};