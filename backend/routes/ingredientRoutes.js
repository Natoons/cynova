const express = require('express');
const rateLimit = require('express-rate-limit');
const ingredientController = require('../controllers/ingredientController');

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

// Routes pour les ingrédients
router.get('/', ingredientController.getAllIngredients);
router.get('/search', ingredientController.searchIngredients);
router.get('/origine/:origine', ingredientController.getIngredientsByOrigin);
router.get('/bio', ingredientController.getBioIngredients);
router.get('/:id', ingredientController.getIngredientById);
router.post('/', ingredientController.createIngredient);
router.put('/:id', ingredientController.updateIngredient);
router.delete('/:id', ingredientController.deleteIngredient);

module.exports = router; 