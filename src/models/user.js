const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String/*, required: true*/ },
  role: { type: String, default: 'user' },//o admin boh
  phone: {type: String },
  rating: { type: Number, default: 5 },
  isDriver: { type: Boolean, default: true }, //true solo per provare, default false
  vehicle: { type: String }
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
