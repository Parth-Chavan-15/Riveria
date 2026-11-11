const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true, trim: true, lowercase: true, maxlength: 254, index: true },
    password: { type: String, required: true, minlength: 12, select: false },
    role: { type: String, enum: ['user', 'admin'], default: 'user', immutable: true }
}, { timestamps: true, strict: 'throw', versionKey: false });

// Hash password before saving to MongoDB (Removed 'next' for modern async Mongoose)
userSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compare entered password with hashed password
userSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.set('toJSON', {
    transform: (_, returned) => {
        delete returned.password;
        return returned;
    }
});

module.exports = mongoose.model('User', userSchema);
