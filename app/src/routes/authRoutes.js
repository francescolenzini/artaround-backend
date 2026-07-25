const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const env = require('../config/env');
const { requireApiKey } = require('../middleware/auth');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.post(
  '/login',
  requireApiKey,
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({
        error: {
          message: 'username and password are required',
          status: 400,
        },
      });
    }

    const user = await User.findOne({ username, status: 'active' });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid credentials', status: 401 } });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
      return res.status(401).json({ error: { message: 'Invalid credentials', status: 401 } });
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      {
        sub: user.id,
        role: user.role,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn }
    );

    return res.status(200).json({
      token,
      tokenType: 'Bearer',
      expiresIn: env.jwtExpiresIn,
      user: {
        id: user.id,
        // Il Navigator mostra nome e iniziali dell'utente nel menu account:
        // lo username da solo non basta.
        fullName: user.fullName,
        username: user.username,
        role: user.role,
        assignedMuseumIds: user.assignedMuseumIds,
      },
    });
  })
);

module.exports = router;
