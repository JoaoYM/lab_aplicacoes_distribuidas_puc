class RouteMapper {
    constructor() {
        this.routes = this.initializeRoutes();
    }

    initializeRoutes() {
        return {
            'user-service': this.createUserServiceRoutes(),
            'list-service': this.createListServiceRoutes(),
            'item-service': this.createItemServiceRoutes()
        };
    }

    createUserServiceRoutes() {
        return [
            this.createRouteConfig('/api/auth', '/auth'),
            this.createRouteConfig('/api/users', '/users', { ensurePath: true })
        ];
    }

    createListServiceRoutes() {
        return [
            this.createRouteConfig('/api/lists', '/lists', { ensurePath: true })
        ];
    }

    createItemServiceRoutes() {
        return [
            this.createRouteConfig('/api/items', '/items', { ensurePath: true }),
            this.createRouteConfig('/api/categories', '/categories'),
            this.createRouteConfig('/api/search', '/search')
        ];
    }

    createRouteConfig(prefix, target, options = {}) {
        return { prefix, target, ...options };
    }

    map(serviceName, originalPath) {
        const serviceRoutes = this.routes[serviceName];
        
        if (!serviceRoutes) {
            return this.handleUnknownService(serviceName, originalPath);
        }

        const routeConfig = serviceRoutes.find(route => 
            originalPath.startsWith(route.prefix)
        );

        if (!routeConfig) {
            return originalPath;
        }

        return this.transformPath(originalPath, routeConfig);
    }

    transformPath(originalPath, routeConfig) {
        let targetPath = originalPath.replace(routeConfig.prefix, routeConfig.target);
        
        if (routeConfig.ensurePath && this.isEmptyPath(targetPath)) {
            targetPath = routeConfig.target;
        }

        return targetPath;
    }

    isEmptyPath(path) {
        return path === '/' || path === '';
    }

    handleUnknownService(serviceName, originalPath) {
        console.warn(`Unknown service: ${serviceName}`);
        return originalPath;
    }
}

module.exports = RouteMapper;