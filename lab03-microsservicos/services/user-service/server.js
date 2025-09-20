// services/user-service/server.js (modificações)
// No método register, adicionar:
const newUser = await this.usersDb.create({
    // ... campos existentes
    preferences: {
        defaultStore: '',
        currency: 'BRL'
    },
    // ... resto do código
});

// No método updateUser, adicionar:
if (req.body.preferences) {
    if (req.body.preferences.defaultStore !== undefined) {
        updates['preferences.defaultStore'] = req.body.preferences.defaultStore;
    }
    if (req.body.preferences.currency !== undefined) {
        updates['preferences.currency'] = req.body.preferences.currency;
    }
}