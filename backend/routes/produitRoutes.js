const express = require('express');
const rateLimit = require('express-rate-limit');
const produitController = require('../controllers/produitController');

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

// Routes pour les produits
router.get('/', produitController.getAllProduits);
router.get('/search', produitController.searchProduits);
router.get('/:id', produitController.getProduitById);
router.post('/', produitController.createProduit);
router.put('/:id', produitController.updateProduit);
router.delete('/:id', produitController.deleteProduit);

module.exports = router; 