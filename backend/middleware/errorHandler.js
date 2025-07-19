const errorHandler = (err, req, res, next) => {
  console.error('Erreur API:', err);

  // Erreurs de validation Joi
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.details.map(d => d.message)
    });
  }

  // Erreurs Prisma
  if (err.code) {
    switch (err.code) {
      case 'P2002':
        return res.status(400).json({
          error: 'Conflit de données',
          message: 'Une ressource avec ces données existe déjà'
        });
      case 'P2025':
        return res.status(404).json({
          error: 'Ressource non trouvée',
          message: 'La ressource demandée n\'existe pas'
        });
      case 'P2003':
        return res.status(400).json({
          error: 'Violation de contrainte',
          message: 'Impossible de supprimer cette ressource car elle est référencée ailleurs'
        });
      default:
        return res.status(500).json({
          error: 'Erreur base de données',
          message: 'Une erreur est survenue lors de l\'accès aux données'
        });
    }
  }

  // Erreurs de validation personnalisées
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Erreur de validation',
      message: err.message
    });
  }

  // Erreurs d'authentification
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      error: 'Non autorisé',
      message: 'Token d\'authentification invalide ou manquant'
    });
  }

  // Erreurs de rate limiting
  if (err.status === 429) {
    return res.status(429).json({
      error: 'Trop de requêtes',
      message: 'Vous avez dépassé la limite de requêtes autorisées'
    });
  }

  // Erreur par défaut
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Erreur serveur interne';

  res.status(statusCode).json({
    error: 'Erreur serveur',
    message: process.env.NODE_ENV === 'production' ? 'Une erreur est survenue' : message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

module.exports = errorHandler; 