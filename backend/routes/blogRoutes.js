const express = require('express');
const rateLimit = require('express-rate-limit');
const blogController = require('../controllers/blogController');

const router = express.Router();

// Rate limiting pour protéger l'API
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limite chaque IP à 100 requêtes par fenêtre
  message: {
    error: 'Trop de requêtes, veuillez réessayer plus tard'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Appliquer le rate limiting à toutes les routes
router.use(limiter);

// Routes pour les blogs
router.get('/', blogController.getAllBlogs);
router.get('/search', blogController.searchBlogs);
router.get('/categorie/:categorie', blogController.getBlogsByCategory);
router.get('/:id', blogController.getBlogById);
router.post('/', blogController.createBlog);
router.put('/:id', blogController.updateBlog);
router.delete('/:id', blogController.deleteBlog);

module.exports = router; 