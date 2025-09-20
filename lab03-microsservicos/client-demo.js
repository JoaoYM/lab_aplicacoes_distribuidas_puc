// client-demo.js
const axios = require('axios');
const readline = require('readline');

const API_BASE = 'http://127.0.0.1:3000/api';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

let authToken = null;
let currentUser = null;

// Funções auxiliares
function prompt(question) {
    return new Promise(resolve => rl.question(question, resolve));
}

function displayMenu() {
    console.log('\n=== SISTEMA DE LISTA DE COMPRAS ===');
    console.log('1. Registrar usuário');
    console.log('2. Login');
    console.log('3. Buscar itens');
    console.log('4. Ver categorias');
    console.log('5. Criar lista');
    console.log('6. Ver minhas listas');
    console.log('7. Adicionar item à lista');
    console.log('8. Ver detalhes da lista');
    console.log('9. Atualizar item na lista');
    console.log('10. Finalizar compra');
    console.log('0. Sair');
}

// Funções de API
async function registerUser() {
    try {
        const name = await prompt('Nome: ');
        const email = await prompt('Email: ');
        const password = await prompt('Senha: ');

        const response = await axios.post(`${API_BASE}/users/register`, {
            name,
            email,
            password
        });

        console.log('Usuário registrado com sucesso!');
        console.log('ID:', response.data.data.user.id);
    } catch (error) {
        console.error('Erro no registro:', error.response?.data?.message || error.message);
    }
}

async function login() {
    try {
        const email = await prompt('Email: ');
        const password = await prompt('Senha: ');

        const response = await axios.post(`${API_BASE}/users/login`, {
            email,
            password
        });

        authToken = response.data.data.token;
        currentUser = response.data.data.user;
        
        console.log('Login realizado com sucesso!');
        console.log('Bem-vindo,', currentUser.name);
    } catch (error) {
        console.error('Erro no login:', error.response?.data?.message || error.message);
    }
}

async function searchItems() {
    try {
        const query = await prompt('Termo de busca: ');
        const category = await prompt('Categoria (opcional): ');

        let url = `${API_BASE}/items/search?q=${encodeURIComponent(query)}`;
        if (category) {
            url += `&category=${encodeURIComponent(category)}`;
        }

        const response = await axios.get(url);
        
        console.log('\nResultados da busca:');
        response.data.data.results.forEach(item => {
            console.log(`- ${item.name} (${item.category}): R$ ${item.averagePrice.toFixed(2)}/${item.unit}`);
        });
    } catch (error) {
        console.error('Erro na busca:', error.response?.data?.message || error.message);
    }
}

async function getCategories() {
    try {
        const response = await axios.get(`${API_BASE}/items/categories`);
        
        console.log('\nCategorias disponíveis:');
        response.data.data.forEach(category => {
            console.log(`- ${category.name} (${category.itemCount} itens)`);
        });
    } catch (error) {
        console.error('Erro ao buscar categorias:', error.response?.data?.message || error.message);
    }
}

async function createList() {
    if (!authToken) {
        console.log('Faça login primeiro!');
        return;
    }

    try {
        const name = await prompt('Nome da lista: ');
        const description = await prompt('Descrição (opcional): ');

        const response = await axios.post(`${API_BASE}/lists/lists`, {
            name,
            description
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('Lista criada com sucesso!');
        console.log('ID:', response.data.data.id);
    } catch (error) {
        console.error('Erro ao criar lista:', error.response?.data?.message || error.message);
    }
}

async function getMyLists() {
    if (!authToken) {
        console.log('Faça login primeiro!');
        return;
    }

    try {
        const response = await axios.get(`${API_BASE}/lists/lists`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('\nSuas listas:');
        response.data.data.forEach(list => {
            console.log(`- ${list.name} (${list.status}): ${list.summary.totalItems} itens, R$ ${list.summary.estimatedTotal.toFixed(2)}`);
        });
    } catch (error) {
        console.error('Erro ao buscar listas:', error.response?.data?.message || error.message);
    }
}

async function addItemToList() {
    if (!authToken) {
        console.log('Faça login primeiro!');
        return;
    }

    try {
        // Primeiro buscar itens para facilitar a seleção
        const searchTerm = await prompt('Buscar item para adicionar: ');
        const searchResponse = await axios.get(`${API_BASE}/items/search?q=${encodeURIComponent(searchTerm)}&limit=10`);
        
        if (searchResponse.data.data.results.length === 0) {
            console.log('Nenhum item encontrado.');
            return;
        }

        console.log('\nItens encontrados:');
        searchResponse.data.data.results.forEach((item, index) => {
            console.log(`${index + 1}. ${item.name} (${item.category}): R$ ${item.averagePrice.toFixed(2)}/${item.unit}`);
        });

        const itemIndex = parseInt(await prompt('Selecione o número do item: ')) - 1;
        if (itemIndex < 0 || itemIndex >= searchResponse.data.data.results.length) {
            console.log('Seleção inválida.');
            return;
        }

        const selectedItem = searchResponse.data.data.results[itemIndex];
        const quantity = parseFloat(await prompt(`Quantidade (${selectedItem.unit}): `));
        const notes = await prompt('Observações (opcional): ');

        // Buscar listas do usuário
        const listsResponse = await axios.get(`${API_BASE}/lists/lists`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (listsResponse.data.data.length === 0) {
            console.log('Você não tem listas. Crie uma lista primeiro.');
            return;
        }

        console.log('\nSuas listas:');
        listsResponse.data.data.forEach((list, index) => {
            console.log(`${index + 1}. ${list.name} (${list.status})`);
        });

        const listIndex = parseInt(await prompt('Selecione o número da lista: ')) - 1;
        if (listIndex < 0 || listIndex >= listsResponse.data.data.length) {
            console.log('Seleção inválida.');
            return;
        }

        const selectedList = listsResponse.data.data[listIndex];

        // Adicionar item à lista
        await axios.post(`${API_BASE}/lists/lists/${selectedList.id}/items`, {
            itemId: selectedItem.id,
            quantity,
            notes
        }, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        console.log('Item adicionado à lista com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar item:', error.response?.data?.message || error.message);
    }
}

async function viewListDetails() {
    if (!authToken) {
        console.log('Faça login primeiro!');
        return;
    }

    try {
        // Buscar listas do usuário
        const listsResponse = await axios.get(`${API_BASE}/lists/lists`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        if (listsResponse.data.data.length === 0) {
            console.log('Você não tem listas.');
            return;
        }

        console.log('\nSuas listas:');
        listsResponse.data.data.forEach((list, index) => {
            console.log(`${index + 1}. ${list.name} (${list.status})`);
        });

        const listIndex = parseInt(await prompt('Selecione o número da lista: ')) - 1;
        if (listIndex < 0 || listIndex >= listsResponse.data.data.length) {
            console.log('Seleção inválida.');
            return;
        }

        const selectedList = listsResponse.data.data[listIndex];

        // Buscar detalhes da lista
        const listResponse = await axios.get(`${API_BASE}/lists/lists/${selectedList.id}`, {
            headers: { Authorization: `Bearer ${authToken}` }
        });

        const list = listResponse.data.data;

        console.log(`\n=== ${list.name} ===`);
        console.log(list.description || 'Sem descrição');
        console.log(`Status: ${list.status}`);
        console.log(`Criada em: ${new Date(list.createdAt).toLocaleString()}`);
        console.log(`Última atualização: ${new Date(list.updatedAt).toLocaleString()}`);
        console.log('\nItens:');
        
        if (list.items.length === 0) {
            console.log('Nenhum item na lista.');
        } else {
            list.items.forEach((item, index) => {
                const status = item.purchased ? '[✓]' : '[ ]';
                console.log(`${status} ${index + 1}. ${item.itemName}: ${item.quantity} ${item.unit} - R$ ${(item.quantity * item.estimatedPrice).toFixed(2)}`);
                if (item.notes) {
                    console.log(`   Observações: ${item.notes}`);
                }
            });
        }

        console.log('\nResumo:');
        console.log(`Total de itens: ${list.summary.totalItems}`);
        console.log(`Itens comprados: ${list.summary.purchasedItems}`);
        console.log(`Valor estimado: R$ ${list.summary.estimatedTotal.toFixed(2)}`);
        console.log(`Progresso: ${list.summary.completionPercentage}%`);
    } catch (error) {
        console.error('Erro ao visualizar lista:', error.response?.data?.message || error.message);
    }
}

// Menu principal
async function main() {
    let running = true;

    while (running) {
        displayMenu();
        const choice = await prompt('\nEscolha uma opção: ');

        switch (choice) {
            case '1':
                await registerUser();
                break;
            case '2':
                await login();
                break;
            case '3':
                await searchItems();
                break;
            case '4':
                await getCategories();
                break;
            case '5':
                await createList();
                break;
            case '6':
                await getMyLists();
                break;
            case '7':
                await addItemToList();
                break;
            case '8':
                await viewListDetails();
                break;
            case '9':
                console.log('Funcionalidade em desenvolvimento...');
                break;
            case '10':
                console.log('Funcionalidade em desenvolvimento...');
                break;
            case '0':
                running = false;
                break;
            default:
                console.log('Opção inválida!');
        }
    }

    rl.close();
    console.log('Sistema encerrado.');
}

// Iniciar aplicação
if (require.main === module) {
    console.log('=== DEMONSTRAÇÃO DO SISTEMA DE LISTA DE COMPRAS ===');
    console.log('Conectando ao API Gateway em http://127.0.0.1:3000');
    main();
}

module.exports = { prompt, displayMenu };