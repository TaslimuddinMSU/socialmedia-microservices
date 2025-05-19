const express = require('express');
const { createPosts, getAllPosts, getPostById, deletePost } = require('../controllers/post');
const { authenticateRequest } = require('../middleware/authMiddleware');


const router = express.Router();

router.use(authenticateRequest);
router.post('/create-post', createPosts);
router.get('/all-posts', getAllPosts);
router.get('/post/:id', getPostById);
router.delete('/delete-post/:id', deletePost);

module.exports = router;