module.exports = function (req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: admin only' });
  }
  next();
};

module.exports.isUserAdmin = function (user) {
  return user && user.role === 'admin';
};
