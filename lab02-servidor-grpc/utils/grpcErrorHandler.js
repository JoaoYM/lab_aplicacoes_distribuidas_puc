// utils/grpcErrorHandler.js
const grpc = require('@grpc/grpc-js');

class GrpcErrorHandler {
    static createError(message, code, details = {}) {
        const error = new Error(message);
        error.code = code;
        error.details = details;
        return error;
    }

    static handleError(error, callback) {
        console.error('Erro gRPC:', error);
        
        if (error.code) {
            // Já é um erro gRPC
            return callback(error);
        }

        // Mapear erros comuns para códigos gRPC
        let grpcError;
        
        switch (error.name) {
            case 'ValidationError':
                grpcError = this.createError(
                    error.message, 
                    grpc.status.INVALID_ARGUMENT,
                    { errors: error.errors }
                );
                break;
                
            case 'AuthenticationError':
                grpcError = this.createError(
                    error.message,
                    grpc.status.UNAUTHENTICATED
                );
                break;
                
            case 'AuthorizationError':
                grpcError = this.createError(
                    error.message,
                    grpc.status.PERMISSION_DENIED
                );
                break;
                
            case 'NotFoundError':
                grpcError = this.createError(
                    error.message,
                    grpc.status.NOT_FOUND
                );
                break;
                
            default:
                grpcError = this.createError(
                    'Erro interno do servidor',
                    grpc.status.INTERNAL,
                    { originalError: error.message }
                );
        }
        
        callback(grpcError);
    }

    // Métodos utilitários para criar erros específicos
    static validationError(errors) {
        const error = new Error('Dados de entrada inválidos');
        error.name = 'ValidationError';
        error.errors = errors;
        return error;
    }

    static authenticationError(message = 'Falha na autenticação') {
        const error = new Error(message);
        error.name = 'AuthenticationError';
        return error;
    }

    static notFoundError(resource = 'Recurso') {
        const error = new Error(`${resource} não encontrado`);
        error.name = 'NotFoundError';
        return error;
    }
}

module.exports = GrpcErrorHandler;