const mongoose = require('mongoose');

const refreshTokenSchema = new mongoose.Schema({
    token: { 
        type: String, 
        required: true, 
        unique: true 
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true 
    },
    expireAt: { 
        type: Date, 
        required: true 
    }
}, { timestamps: true });

// ✅ Fixed: field name should match schema field ("expireAt")
refreshTokenSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const RefreshToken = mongoose.model('RefreshToken', refreshTokenSchema);

module.exports = RefreshToken;
