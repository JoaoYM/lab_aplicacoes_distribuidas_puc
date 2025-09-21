// middleware/grpcInterceptor.js
const grpc = require('@grpc/grpc-js');
const jwt = require('jsonwebtoken');

class GrpcAuthInterceptor {
    constructor(jwtSecret) {
        this.jwtSecret = jwtSecret || process.env.JWT_SECRET || 'seu-secret-aqui';
    }

    authenticationInterceptor() {
        return (call, callback, next) => {
            const token = this.extractTokenFromMetadata(call.metadata);
            
            if (!token) {
                const error = new Error('Token de autenticação obrigatório');
                error.code = grpc.status.UNAUTHENTICATED;
                return callback(error);
            }

            try {
                const decoded = jwt.verify(token, this.jwtSecret);
                call.user = decoded;
                next(call, callback);
            } catch (error) {
                const grpcError = new Error('Token inválido ou expirado');
                grpcError.code = grpc.status.UNAUTHENTICATED;
                callback(grpcError);
            }
        };
    }

    extractTokenFromMetadata(metadata) {
        const authHeader = metadata.get('authorization');
        if (!authHeader || authHeader.length === 0) return null;
        
        const headerValue = authHeader[0];
        if (typeof headerValue === 'string' && headerValue.startsWith('Bearer ')) {
            return headerValue.substring(7);
        }
        
        return null;
    }

    createServerInterceptor() {
        return {
            interceptServer: (methodDescriptor, call, callback, next) => {
                // Aplicar autenticação apenas para métodos que não são de autenticação
                if (!methodDescriptor.originalName.toLowerCase().includes('login') && 
                    !methodDescriptor.originalName.toLowerCase().includes('register')) {
                    return this.authenticationInterceptor()(call, callback, next);
                }
                return next(call, callback);
            }
        };
    }

    createClientInterceptor(token) {
        return (options, nextCall) => {
            return new grpc.InterceptingCall(nextCall(options), {
                start: (metadata, listener, next) => {
                    if (token) {
                        metadata.add('authorization', `Bearer ${token}`);
                    }
                    next(metadata, listener);
                }
            });
        };
    }
}

module.exports = GrpcAuthInterceptor;