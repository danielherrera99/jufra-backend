const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UsuarioSchema = new mongoose.Schema({
    username: { type: String, required: true },
    password: { type: String, required: true, minlength: 6, select: false },
    email: { type: String, sparse: true, match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Email inválido'] }
});

UsuarioSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

const Usuario = mongoose.model('UsuarioTest2', UsuarioSchema);

async function test() {
    const doc = new Usuario({ username: 'testuser', password: 'oldpassword' });
    // Simulate what mongoose does when fetching from DB without password
    const loadedDoc = new Usuario({ username: 'testuser' });
    loadedDoc.isNew = false;
    
    // Simulate user setting new password
    loadedDoc.password = '123456';
    
    // Validate
    try {
        await loadedDoc.validate();
        console.log("Validation passed!");
        
        // Simulate pre-save manually
        const salt = await bcrypt.genSalt(10);
        loadedDoc.password = await bcrypt.hash(loadedDoc.password, salt);
        console.log("Pre-save passed! password:", loadedDoc.password);
    } catch (e) {
        console.log("Validation error:", e.message);
    }
}
test().catch(console.error);
