const express = require('express');

const { v4: uuidv4 } = require('uuid');

const User = require('../models/User');

const database = require('../database/database');

const { validate } = require('../middleware/validation');



const router = express.Router();

/**
 * @swagger
 * tags:
 * name: Auth
 * description: Endpoints de Autenticação e Registro
 */



/**
 * @swagger
 * /api/auth/register:
 * post:
 * summary: Registra um novo usuário
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/UserInput'
 * responses:
 * '201':
 * description: Usuário criado com sucesso. Retorna o usuário e o token.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * message:
 * type: string
 * data:
 * type: object
 * properties:
 * user:
 * $ref: '#/components/schemas/User'
 * token:
 * type: string
 * '409':
 * description: Email ou username já existe.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 */
router.post('/register', validate('register'), async (req, res) => {

    try {

        const { email, username, password, firstName, lastName } = req.body;



        // Verificar se usuário já existe

        const existingUser = await database.get(

            'SELECT * FROM users WHERE email = ? OR username = ?',

            [email, username]

        );



        if (existingUser) {

            return res.status(409).json({

                success: false,

                message: 'Email ou username já existe'

            });

        }



        // Criar usuário

        const userData = { id: uuidv4(), email, username, password, firstName, lastName };

        const user = new User(userData);

        await user.hashPassword();



        await database.run(

            'INSERT INTO users (id, email, username, password, firstName, lastName) VALUES (?, ?, ?, ?, ?, ?)',

            [user.id, user.email, user.username, user.password, user.firstName, user.lastName]

        );



        const token = user.generateToken();



        res.status(201).json({

            success: true,

            message: 'Usuário criado com sucesso',

            data: { user: user.toJSON(), token }

        });

    } catch (error) {

        res.status(500).json({ success: false, message: 'Erro interno do servidor' });

    }

});

/**
 * @swagger
 * /api/auth/login:
 * post:
 * summary: Autentica um usuário e retorna um token JWT
 * tags: [Auth]
 * requestBody:
 * required: true
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/LoginInput'
 * responses:
 * '200':
 * description: Login bem-sucedido. Retorna o usuário e o token.
 * content:
 * application/json:
 * schema:
 * type: object
 * properties:
 * success:
 * type: boolean
 * message:
 * type: string
 * data:
 * type: object
 * properties:
 * user:
 * $ref: '#/components/schemas/User'
 * token:
 * type: string
 * '401':
 * description: Credenciais inválidas.
 * content:
 * application/json:
 * schema:
 * $ref: '#/components/schemas/Error'
 */
router.post('/login', validate('login'), async (req, res) => {

    try {

        const { identifier, password } = req.body;



        const userData = await database.get(

            'SELECT * FROM users WHERE email = ? OR username = ?',

            [identifier, identifier]

        );



        if (!userData) {

            return res.status(401).json({

                success: false,

                message: 'Credenciais inválidas'

            });

        }



        const user = new User(userData);

        const isValidPassword = await user.comparePassword(password);



        if (!isValidPassword) {

            return res.status(401).json({

                success: false,

                message: 'Credenciais inválidas'

            });

        }



        const token = user.generateToken();



        res.json({

            success: true,

            message: 'Login realizado com sucesso',

            data: { user: user.toJSON(), token }

        });

    } catch (error) {

        res.status(500).json({ success: false, message: 'Erro interno do servidor' });

    }

});



module.exports = router;
