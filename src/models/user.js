const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', },//o admin boh
});

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compareSync(password, this.password);
};
  
  // Hash della password prima di salvare
userSchema.pre('save', async function (next) {
    if (this.isModified('password')) {
      this.password = bcrypt.hashSync(this.password, 10);
    }
    next();
});
  
const User = mongoose.model('User', userSchema);

module.exports = mongoose.model('User', userSchema);
