const mongoose = require('mongoose');
const argon2 = require('argon2');


const userSchema = new mongoose.Schema({
    username: { 
        type: String, 
        required: true,   
        unique: true, 
        trim: true 
    },
    email: { 
        type: String, 
        required: true,    
        unique: true, 
        trim: true,
        lowercase: true 
    },
    password: { 
        type: String, 
        required: true   
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
}, { timestamps: true }); 

// Hash password before saving
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
        try {
            this.password = await argon2.hash(this.password);
        } catch (error) {
            return next(error);
        }
    }
    next(); 
});

// Compare password instance method
userSchema.methods.comparePassword = async function (userPassword) { 
    try {
        return await argon2.verify(this.password, userPassword);
    } catch (error) {
        throw error;
    }
};

// Add text index on username for search
userSchema.index({ username: 'text' });

const User = mongoose.model('User', userSchema);

module.exports = User;
