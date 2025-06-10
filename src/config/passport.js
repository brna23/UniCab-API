const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const jwt = require('jsonwebtoken');

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: 'https://unicab-api.onrender.com/api/auth/google/callback'
},
  async (accessToken, refreshToken, profile, done) => {
    try {
      const email = profile.emails[0].value;
      let user = await User.findOne({ email });

      if (!user) {
        user = new User({
          username: profile.displayName,
          email,
          googleId: profile.id,
          isDriver: false
        });
        await user.save();
      }

      done(null, user);
    } catch (err) {
      done(err, null);
    }
  }
));

module.exports = passport;
