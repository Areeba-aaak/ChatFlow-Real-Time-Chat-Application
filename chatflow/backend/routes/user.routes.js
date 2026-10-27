const express = require('express');

const router = express.Router();

const auth = require('../middleware/auth');

const userController = require('../controllers/user.controller');


// Get all users
router.get('/', auth, userController.getUsers);


// Get online users
router.get('/online', auth, userController.getOnlineUsers);


// Search users
router.get('/search', auth, userController.searchUsers);


// Get user by id
router.get('/:id', auth, userController.getUser);


module.exports = router;