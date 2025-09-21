// services/ChatService.js
const { v4: uuidv4 } = require('uuid');
const GrpcErrorHandler = require('../utils/grpcErrorHandler');

class ChatService {
    constructor() {
        this.activeStreams = new Map(); // user_id -> call
        this.chatRooms = new Map(); // room_id -> Set(user_ids)
    }

    async chatStream(call) {
        let userId = null;
        let username = null;
        let roomId = 'default'; // Poderia ser parametrizado

        try {
            // Configurar handlers para mensagens recebidas
            call.on('data', async (message) => {
                try {
                    // Primeira mensagem pode conter informações de autenticação/join
                    if (message.type === 3 && message.content === '__JOIN__' && message.token) {
                        // Validar token e extrair informações do usuário
                        const jwt = require('jsonwebtoken');
                        const decoded = jwt.verify(message.token, process.env.JWT_SECRET || 'seu-secret-aqui');
                        
                        userId = decoded.id;
                        username = decoded.username;
                        
                        // Registrar usuário na sala
                        if (!this.chatRooms.has(roomId)) {
                            this.chatRooms.set(roomId, new Set());
                        }
                        this.chatRooms.get(roomId).add(userId);
                        
                        // Armazenar stream
                        this.activeStreams.set(userId, call);
                        
                        // Notificar entrada na sala
                        this.broadcastToRoom(roomId, {
                            id: uuidv4(),
                            user_id: 'system',
                            username: 'System',
                            content: `${username} entrou na sala`,
                            room_id: roomId,
                            timestamp: Math.floor(Date.now() / 1000),
                            type: 3 // SYSTEM
                        }, userId);
                        
                        return;
                    }

                    if (!userId) {
                        call.write({
                            id: uuidv4(),
                            user_id: 'system',
                            username: 'System',
                            content: 'Erro: Autenticação necessária',
                            room_id: roomId,
                            timestamp: Math.floor(Date.now() / 1000),
                            type: 3 // SYSTEM
                        });
                        return;
                    }

                    // Processar mensagem normal
                    const chatMessage = {
                        id: uuidv4(),
                        user_id: userId,
                        username: username,
                        content: message.content,
                        room_id: roomId,
                        timestamp: Math.floor(Date.now() / 1000),
                        type: message.type || 0 // TEXT por padrão
                    };

                    // Broadcast para a sala
                    this.broadcastToRoom(roomId, chatMessage, userId);

                } catch (error) {
                    console.error('Erro ao processar mensagem:', error);
                }
            });

            call.on('end', () => {
                if (userId) {
                    this.activeStreams.delete(userId);
                    if (this.chatRooms.has(roomId)) {
                        this.chatRooms.get(roomId).delete(userId);
                        
                        // Notificar saída da sala
                        this.broadcastToRoom(roomId, {
                            id: uuidv4(),
                            user_id: 'system',
                            username: 'System',
                            content: `${username} saiu da sala`,
                            room_id: roomId,
                            timestamp: Math.floor(Date.now() / 1000),
                            type: 3 // SYSTEM
                        }, userId);
                    }
                }
                console.log(`Cliente ${userId} desconectado do chat`);
            });

            call.on('error', (error) => {
                console.error('Erro no stream de chat:', error);
                if (userId) {
                    this.activeStreams.delete(userId);
                }
            });

        } catch (error) {
            console.error('Erro no chatStream:', error);
            call.destroy(error);
        }
    }

    broadcastToRoom(roomId, message, excludeUserId = null) {
        if (!this.chatRooms.has(roomId)) return;
        
        const usersInRoom = this.chatRooms.get(roomId);
        usersInRoom.forEach(userId => {
            if (userId !== excludeUserId && this.activeStreams.has(userId)) {
                try {
                    this.activeStreams.get(userId).write(message);
                } catch (error) {
                    console.error(`Erro ao enviar mensagem para usuário ${userId}:`, error);
                    // Remover stream problemático
                    this.activeStreams.delete(userId);
                    usersInRoom.delete(userId);
                }
            }
        });
    }

    // Método para listar usuários online
    getOnlineUsers(roomId = 'default') {
        if (!this.chatRooms.has(roomId)) return [];
        
        return Array.from(this.chatRooms.get(roomId)).map(userId => {
            return { id: userId, online: true };
        });
    }
}

module.exports = ChatService;