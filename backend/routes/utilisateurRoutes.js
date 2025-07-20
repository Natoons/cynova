const express = require('express');
const rateLimit = require('express-rate-limit');
const utilisateurController = require('../controllers/utilisateurController');

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

// Routes pour les utilisateurs
router.get('/', utilisateurController.getAllUtilisateurs);
router.get('/search', utilisateurController.searchUtilisateurs);
router.get('/:id', utilisateurController.getUtilisateurById);
router.post('/', utilisateurController.createUtilisateur);
router.post('/login', utilisateurController.login);
router.put('/:id', utilisateurController.updateUtilisateur);
router.delete('/:id', utilisateurController.deleteUtilisateur);

module.exports = router; 