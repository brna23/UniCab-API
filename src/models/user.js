const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true }, //obbligatoria
  password: { type: String }, //opzionale per google login
  googleId: { type: String }, //se login con google
  name: { type: String },
  phone: { type: String },
  role: { type: String, default: 'user' },
  rating: { type: Number, default: 5 },
  isDriver: { type: Boolean, default: false },
  vehicle: { type: String },
  driverLicense: { type: String } //solo se isDriver === true
});

userSchema.methods.comparePassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

//hash della password solo se presente e modificata
userSchema.pre('save', async function (next) {
  if (this.password && this.isModified('password')) {
    this.password = bcrypt.hashSync(this.password, 10);
  }
  next();
});

const User = mongoose.model('User', userSchema);
module.exports = User;
