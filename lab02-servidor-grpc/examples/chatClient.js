// examples/chatClient.js
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const readline = require('readline');

class ChatClient {
    constructor(serverAddress = 'localhost:50051', token) {
        this.serverAddress = serverAddress;
        this.token = token;
        this.client = null;
        this.stream = null;
        this.userId = null;
        this.username = null;
    }

    async initialize() {
        const PROTO_PATH = __dirname + '/../protos/chat_service.proto';
        
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true
        });

        const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
        this.client = new protoDescriptor.chat.ChatService(
            this.serverAddress,
            grpc.credentials.createInsecure()
        );
    }

    startChat() {
        this.stream = this.client.ChatStream();
        
        // Enviar mensagem de join primeiro
        this.stream.write({
            token: this.token,
            content: '__JOIN__',
            type: 3 // SYSTEM
        });

        // Receber mensagens
        this.stream.on('data', (message) => {
            const timestamp = new Date(message.timestamp * 1000).toLocaleTimeString();
            console.log(`[${timestamp}] ${message.username}: ${message.content}`);
        });

        this.stream.on('end', () => {
            console.log('Conexão com o chat encerrada');
        });

        this.stream.on('error', (error) => {
            console.error('Erro no chat:', error);
        });

        // Interface para enviar mensagens
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log('Digite suas mensagens (Ctrl+C para sair):');

        rl.on('line', (input) => {
            if (input.trim().toLowerCase() === '/quit') {
                this.stream.end();
                rl.close();
                return;
            }

            this.stream.write({
                content: input,
                type: 0 // TEXT
            });
        });

        rl.on('close', () => {
            console.log('Saindo do chat...');
            process.exit(0);
        });
    }
}

// Uso do cliente de chat
if (require.main === module) {
    const token = process.argv[2]; // Token JWT como argumento
    if (!token) {
        console.log('Uso: node chatClient.js <JWT_TOKEN>');
        process.exit(1);
    }

    const chatClient = new ChatClient('localhost:50051', token);
    chatClient.initialize().then(() => {
        chatClient.startChat();
    }).catch(console.error);
}

module.exports = ChatClient;