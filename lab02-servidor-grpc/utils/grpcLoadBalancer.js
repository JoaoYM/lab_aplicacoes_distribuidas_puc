// utils/grpcLoadBalancer.js
const grpc = require('@grpc/grpc-js');
const { RoundRobinLoadBalancer } = require('@grpc/grpc-js/build/src/load-balancer-round-robin');

class GrpcLoadBalancer {
    constructor(serviceProto, serviceName, addresses) {
        this.addresses = addresses;
        this.clients = [];
        this.currentIndex = 0;
        this.serviceProto = serviceProto;
        this.serviceName = serviceName;
    }

    initializeClients() {
        this.clients = this.addresses.map(address => {
            return new this.serviceProto[this.serviceName](
                address,
                grpc.credentials.createInsecure()
            );
        });
    }

    // Balanceamento de carga round-robin
    getClient() {
        if (this.clients.length === 0) {
            throw new Error('Nenhum cliente disponível');
        }
        
        const client = this.clients[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.clients.length;
        
        return client;
    }

    // Executar método com balanceamento
    execute(method, request) {
        return new Promise((resolve, reject) => {
            const client = this.getClient();
            client[method](request, (error, response) => {
                if (error) {
                    // Tentar com outro cliente se possível
                    if (this.clients.length > 1) {
                        console.log(`Falha com cliente ${this.currentIndex}, tentando próximo`);
                        this.currentIndex = (this.currentIndex + 1) % this.clients.length;
                        this.execute(method, request).then(resolve).catch(reject);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(response);
                }
            });
        });
    }

    // Health check dos servidores
    async healthCheck() {
        const healthResults = await Promise.allSettled(
            this.clients.map(async (client, index) => {
                try {
                    // Assumindo que temos um método Health em todos os serviços
                    const response = await new Promise((resolve, reject) => {
                        client.Health({}, (error, response) => {
                            if (error) reject(error);
                            else resolve(response);
                        });
                    });
                    return { index, status: 'healthy', address: this.addresses[index] };
                } catch (error) {
                    return { index, status: 'unhealthy', address: this.addresses[index], error: error.message };
                }
            })
        );
        
        return healthResults.map(result => result.value);
    }
}

module.exports = GrpcLoadBalancer;