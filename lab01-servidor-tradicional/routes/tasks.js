const express = require('express');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const config = require('../config/database');
const Task = require('../models/Task');
const database = require('../database/database');
const { authMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { cacheMiddleware, invalidateUserCache } = require('../middleware/cache');

const router = express.Router();

const apiLimiter = rateLimit({
    ...config.rateLimit.api,
    keyGenerator: (req, res) => {
        return req.user ? req.user.id : req.ip;
    }
});

// Todas as rotas requerem autenticação
router.use(authMiddleware);

router.use(apiLimiter);

/**
 * @swagger
 * tags:
 * name: Tasks
 * description: API para gerenciamento de tarefas
*/

/**
 * @swagger
 * /api/tasks/stats/summary:
 * get:
 * summary: Retorna um resumo estatístico das tarefas do usuário
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * responses:
 * '200':
 * description: Estatísticas retornadas com sucesso.
 * '401':
 * description: Não autorizado.
 */
router.get('/stats/summary', cacheMiddleware, async (req, res) => {
    try {
        const stats = await database.get(`
            SELECT 
                COUNT(*) as total,
                SUM(CASE WHEN completed = 1 THEN 1 ELSE 0 END) as completed,
                SUM(CASE WHEN completed = 0 THEN 1 ELSE 0 END) as pending
            FROM tasks WHERE userId = ?
        `, [req.user.id]);

        res.json({
            success: true,
            data: {
                ...stats,
                completionRate: stats.total > 0 ? ((stats.completed / stats.total) * 100).toFixed(2) : 0
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});


/**
 * @swagger
 * /api/tasks/{id}:
 * get:
 * summary: Busca uma tarefa específica pelo ID
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * format: uuid
 * description: O ID da tarefa.
 * responses:
 * '200':
 * description: Tarefa encontrada.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Task'
 * '401':
 * description: Não autorizado.
 * '404':
 * description: Tarefa não encontrada.
 */
router.get('/:id', cacheMiddleware, async (req, res) => {
    try {
        const row = await database.get(
            'SELECT * FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (!row) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        const task = new Task({ ...row, completed: row.completed === 1 });
        res.json({
            success: true,
            data: task.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

/**
 * @swagger
 * /api/tasks:
 * get:
 * summary: Lista as tarefas do usuário com filtros e paginação
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: query
 * name: completed
 * schema:
 * type: boolean
 * - in: query
 * name: priority
 * schema:
 * type: string
 * - in: query
 * name: category
 * schema:
 * type: string
 * - in: query
 * name: tags
 * schema:
 * type: string
 * description: Tags separadas por vírgula.
 * - in: query
 * name: startDate
 * schema:
 * type: string
 * format: date
 * description: Formato YYYY-MM-DD.
 * - in: query
 * name: endDate
 * schema:
 * type: string
 * format: date
 * description: Formato YYYY-MM-DD.
 * - in: query
 * name: page
 * schema:
 * type: integer
 * default: 1
 * - in: query
 * name: limit
 * schema:
 * type: integer
 * default: 10
 * - in: query
 * name: sortBy
 * schema:
 * type: string
 * default: createdAt
 * - in: query
 * name: sortOrder
 * schema:
 * type: string
 * default: DESC
 * responses:
 * '200':
 * description: Lista de tarefas retornada com sucesso.
 * '401':
 * description: Não autorizado.
 */
router.get('/', cacheMiddleware, async (req, res) => {
    try {
        // Extrair e validar parâmetros
        const {
            completed,
            priority,
            category,
            tags,
            startDate,
            endDate,
            page = 1,
            limit = 10,
            sortBy = 'createdAt',
            sortOrder = 'DESC'
        } = req.query;

        // Configuração dos filtros permitidos
        const filterConfig = {
            completed: (value) => ['completed = ?', value === 'true' ? 1 : 0],
            priority: (value) => ['priority = ?', value],
            category: (value) => ['category = ?', value],
            startDate: (value) => ['createdAt >= ?', `${value}T00:00:00`],
            endDate: (value) => ['createdAt <= ?', `${value}T23:59:59`],
            tags: (value) => {
                const tagsToFilter = value.split(',').map(t => t.trim()).filter(Boolean);
                const conditions = tagsToFilter.map(() => 'tags LIKE ?').join(' AND ');
                const tagParams = tagsToFilter.map(tag => `%${tag}%`);
                return [conditions, tagParams];
            }
        };

        // Construir cláusulas WHERE dinamicamente
        const whereClauses = ['userId = ?'];
        const params = [req.user.id];

        Object.entries(req.query).forEach(([key, value]) => {
            if (value !== undefined && filterConfig[key]) {
                const [clause, clauseParams] = filterConfig[key](value);
                whereClauses.push(`(${clause})`); // Envolver em parênteses por segurança
                params.push(...(Array.isArray(clauseParams) ? clauseParams : [clauseParams]));
            }
        });

        // Validar parâmetros de paginação
        const pageInt = Math.max(parseInt(page), 1);
        const limitInt = Math.min(Math.max(parseInt(limit), 1), 100); // Limite máximo de 100
        const offset = (pageInt - 1) * limitInt;

        // Validar ordenação
        const validSortFields = ['createdAt', 'updatedAt', 'priority', 'title', 'completed'];
        const validSortOrders = ['ASC', 'DESC'];
        const safeSortBy = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const safeSortOrder = validSortOrders.includes(sortOrder.toUpperCase()) ? sortOrder.toUpperCase() : 'DESC';

        const whereStatement = `WHERE ${whereClauses.join(' AND ')}`;
        const baseSql = `FROM tasks ${whereStatement}`;
        
        const countRow = await database.get(`SELECT COUNT(*) as total ${baseSql}`, params);
        const total = countRow.total;

        const totalPages = Math.ceil(total / limitInt);
        const sql = `
            SELECT * FROM tasks ${whereStatement} 
            ORDER BY "${safeSortBy}" ${safeSortOrder} 
            LIMIT ? OFFSET ?
        `;

        console.log('--- DEBUG QUERY ---');
        console.log('SQL EXECUTADO:', sql);
        console.log('PARÂMETROS:', [...params, limitInt, offset]);
        console.log('-------------------');
        
        const rows = await database.all(sql, [...params, limitInt, offset]);

        console.log(`Foram encontradas ${rows.length} linhas no banco.`);

        const tasks = rows.map(row => new Task(row));

        // Response formatado (será cacheado automaticamente pelo middleware)
        const responseData = {
            success: true,
            pagination: {
                total,
                page: pageInt,
                limit: limitInt,
                totalPages,
                hasNext: pageInt < totalPages,
                hasPrev: pageInt > 1
            },
            filters: {
                completed: completed || null,
                priority: priority || null,
                category: category || null,
                tags: tags || null,
                startDate: startDate || null,
                endDate: endDate || null,
                sortBy: safeSortBy,
                sortOrder: safeSortOrder
            },
            data: tasks.map(task => task.toJSON())
        };

        res.json(responseData);

    } catch (error) {
        console.error('Erro ao listar tarefas:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Erro interno do servidor',
            ...(process.env.NODE_ENV === 'development' && { error: error.message })
        });
    }
});

/**
 * @swagger
 * /api/tasks:
 * post:
 * summary: Cria uma nova tarefa
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/TaskInput'
 * responses:
 * '201':
 * description: Tarefa criada com sucesso.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Task'
 * '400':
 * description: Dados inválidos.
 * '401':
 * description: Não autorizado.
 */
router.post('/', validate('task'), async (req, res) => {
    try {
        const taskData = {
            id: uuidv4(),
            ...req.body,
            userId: req.user.id
        };

        const task = new Task(taskData);
        const validation = task.validate();

        if (!validation.isValid) {
            return res.status(400).json({
                success: false,
                message: 'Dados inválidos',
                errors: validation.errors
            });
        }

        const tagsForDb = Array.isArray(task.tags) ? task.tags.join(',') : '';

        await database.run(
            'INSERT INTO tasks (id, title, description, priority, category, tags, userId) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [task.id, task.title, task.description, task.priority, task.category, tagsForDb, task.userId]
        );

        invalidateUserCache(req.user.id);

        // console.log(JSON.stringify(res));

        res.status(200).json({
            success: true,
            message: 'Tarefa criada com sucesso',
            data: task.toJSON()
        });
    } catch (error) {
        // res.status(500).json({ success: false, message: 'Erro interno do servidor' });
        res.status(500).json({ success: false, message: 'Erro interno do servidor: ' + error.message });
    }
});

/**
 * @swagger
 * /api/tasks/{id}:
 * put:
 * summary: Atualiza uma tarefa existente
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * format: uuid
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/TaskInput'
 * responses:
 * '200':
 * description: Tarefa atualizada com sucesso.
 * '401':
 * description: Não autorizado.
 * '404':
 * description: Tarefa não encontrada.
 */
router.put('/:id', async (req, res) => {
    try {
        const { title, description, completed, priority, category, tags } = req.body;

        const tagsForDb = Array.isArray(tags) ? tags.join(',') : undefined;

        const updates = {};
        const params = [];

        // Mapeamento dos campos permitidos para atualização
        const allowedFields = {
            title: value => value,
            description: value => value,
            completed: value => value ? 1 : 0,
            priority: value => value,
            category: value => value,
            tagsForDb: value => value
        };

        // Filtra apenas os campos que foram enviados e são permitidos
        Object.entries({ title, description, completed, priority, category, tagsForDb })
            .forEach(([key, value]) => {
                if (value !== undefined && allowedFields[key]) {
                    updates[key] = allowedFields[key](value);
                }
            });

        if (Object.keys(updates).length === 0) {
            return res.status(400).json({ success: false, message: 'Nenhum campo para atualizar fornecido.' });
        }

        const fields = Object.keys(updates).map(key => `${key} = ?`);
        params.push(...Object.values(updates), req.params.id, req.user.id);

        const result = await database.run(
            `UPDATE tasks SET ${fields.join(', ')} WHERE id = ? AND userId = ?`,
            params
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        invalidateUserCache(req.user.id);

        const updatedRow = await database.get(
            'SELECT * FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        const task = new Task({ ...updatedRow, completed: updatedRow.completed === 1 });

        res.json({
            success: true,
            message: 'Tarefa atualizada com sucesso',
            data: task.toJSON()
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

/**
 * @swagger
 * /api/tasks/{id}:
 * delete:
 * summary: Deleta uma tarefa
 * tags: [Tasks]
 * security:
 * - bearerAuth: []
 * parameters:
 * - in: path
 * name: id
 * required: true
 * schema:
 * type: string
 * format: uuid
 * responses:
 * '200':
 * description: Tarefa deletada com sucesso.
 * '401':
 * description: Não autorizado.
 * '404':
 * description: Tarefa não encontrada.
 */
router.delete('/:id', async (req, res) => {
    try {
        const result = await database.run(
            'DELETE FROM tasks WHERE id = ? AND userId = ?',
            [req.params.id, req.user.id]
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'Tarefa não encontrada'
            });
        }

        invalidateUserCache(req.user.id);

        res.json({
            success: true,
            message: 'Tarefa deletada com sucesso'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Erro interno do servidor' });
    }
});

module.exports = router;