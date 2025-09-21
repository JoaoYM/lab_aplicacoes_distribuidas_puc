const grpc = require('@grpc/grpc-js');
const ProtoLoader = require('./utils/protoLoader');
const AuthService = require('./services/AuthService');
const TaskService = require('./services/TaskService');
const GrpcAuthInterceptor = require('./middleware/grpcInterceptor');
const ChatService = require('./services/ChatService');
const database = require('./database/database');

/**
 * Servidor gRPC
 */
class GrpcServer {
    constructor() {
        this.server = new grpc.Server();
        this.protoLoader = new ProtoLoader();
        this.authService = new AuthService();
        this.taskService = new TaskService();
        this.authInterceptor = new GrpcAuthInterceptor();
        this.chatService = new ChatService();
    }

    async initialize() {
        try {
            // Inicializar banco de dados
            await database.init();

            // Carregar definições dos protobuf
            const authProto = this.protoLoader.loadProto('auth_service.proto', 'auth');
            const taskProto = this.protoLoader.loadProto('task_service.proto', 'tasks');
            const chatProto = this.protoLoader.loadProto('chat_service.proto', 'chat');

            // Criar interceptor de autenticação
            const authInterceptor = this.authInterceptor.createServerInterceptor();

            // Registrar serviços de autenticação (SEM interceptor)
            this.server.addService(authProto.AuthService.service, {
                Register: this.authService.register.bind(this.authService),
                Login: this.authService.login.bind(this.authService),
                ValidateToken: this.authService.validateToken.bind(this.authService)
            });

            // Registrar serviços de tarefas (COM interceptor)
            this.server.addService(taskProto.TaskService.service, {
                CreateTask: this.taskService.createTask.bind(this.taskService),
                GetTasks: this.taskService.getTasks.bind(this.taskService),
                GetTask: this.taskService.getTask.bind(this.taskService),
                UpdateTask: this.taskService.updateTask.bind(this.taskService),
                DeleteTask: this.taskService.deleteTask.bind(this.taskService),
                GetTaskStats: this.taskService.getTaskStats.bind(this.taskService),
                StreamTasks: this.taskService.streamTasks.bind(this.taskService),
                StreamNotifications: this.taskService.streamNotifications.bind(this.taskService)
            }, { interceptors: [authInterceptor] });

            // Registrar serviço de chat (COM interceptor)
            this.server.addService(chatProto.ChatService.service, {
                ChatStream: this.chatService.chatStream.bind(this.chatService)
            }, { interceptors: [authInterceptor] });
            
            console.log('✅ Serviços gRPC registrados com sucesso');
        } catch (error) {
            console.error('❌ Erro na inicialização:', error);
            throw error;
        }
    }

    async start(port = 50052) {
        try {
            await this.initialize();

            const serverCredentials = grpc.ServerCredentials.createInsecure();
            
            this.server.bindAsync(`0.0.0.0:${port}`, serverCredentials, (error, boundPort) => {
                if (error) {
                    console.error('❌ Falha ao iniciar servidor:', error);
                    return;
                }

                this.server.start();
                console.log('🚀 =================================');
                console.log(`🚀 Servidor gRPC iniciado na porta ${boundPort}`);
                console.log(`🚀 Protocolo: gRPC/HTTP2`);
                console.log(`🚀 Serialização: Protocol Buffers`);
                console.log('🚀 Serviços disponíveis:');
                console.log('🚀   - AuthService (Register, Login, ValidateToken)');
                console.log('🚀   - TaskService (CRUD + Streaming)');
                console.log('🚀   - ChatService (Chat em tempo real)');
                console.log('🚀 =================================');
            });

            // Graceful shutdown
            process.on('SIGINT', () => {
                console.log('\n⏳ Encerrando servidor...');
                this.server.tryShutdown((error) => {
                    if (error) {
                        console.error('❌ Erro ao encerrar servidor:', error);
                        process.exit(1);
                    } else {
                        console.log('✅ Servidor encerrado com sucesso');
                        process.exit(0);
                    }
                });
            });

        } catch (error) {
            console.error('❌ Falha na inicialização do servidor:', error);
            process.exit(1);
        }
    }
}

// Inicialização
if (require.main === module) {
    const server = new GrpcServer();
    const port = process.env.GRPC_PORT || 50052;
    server.start(port);
}

module.exports = GrpcServer;