class Task {

    constructor(data) {

        this.id = data.id;

        this.title = data.title;

        this.description = data.description || '';

        this.completed = data.completed || false;

        this.priority = data.priority || 'medium';

        this.category = data.category || null; 

        this.tags = typeof data.tags === 'string'
            ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
            : data.tags || [];

        this.userId = data.userId;

        this.createdAt = data.createdAt;

    }



    validate() {

        const errors = [];

        if (!this.title?.trim()) errors.push('Título é obrigatório');

        if (!this.userId) errors.push('Usuário é obrigatório');

        return { isValid: errors.length === 0, errors };

    }



    toJSON() {

        return { ...this };

    }

}



module.exports = Task;