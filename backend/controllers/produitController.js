const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const prisma = new PrismaClient();

// Schémas de validation
const produitSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  description: Joi.string().min(10).max(500).required(),
  prix: Joi.number().positive().precision(2).required(),
  categorie: Joi.string().valid('shampoing', 'savon', 'crème', 'huile', 'masque', 'gommage').required(),
  ingredientIds: Joi.string().default('[]'),
  bienfaits: Joi.string().default('[]'),
  quantiteIds: Joi.string().default('[]'),
  yukaScore: Joi.number().integer().min(0).max(100).optional(),
  provenance: Joi.string().max(50).optional(),
  stock: Joi.number().integer().min(0).required(),
  blogIds: Joi.string().default('[]'),
  imageUrl: Joi.string().uri().optional(),
  actif: Joi.boolean().default(true)
});

const updateProduitSchema = Joi.object({
  nom: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  prix: Joi.number().positive().precision(2).optional(),
  categorie: Joi.string().valid('shampoing', 'savon', 'crème', 'huile', 'masque', 'gommage').optional(),
  ingredientIds: Joi.string().optional(),
  bienfaits: Joi.string().optional(),
  quantiteIds: Joi.string().optional(),
  yukaScore: Joi.number().integer().min(0).max(100).optional(),
  provenance: Joi.string().max(50).optional(),
  stock: Joi.number().integer().min(0).optional(),
  blogIds: Joi.string().optional(),
  imageUrl: Joi.string().uri().optional(),
  actif: Joi.boolean().optional()
});

// Contrôleurs
const produitController = {
  // Récupérer tous les produits
  async getAllProduits(req, res) {
    try {
      const { page = 1, limit = 10, categorie, yukaMin, prixMax } = req.query;
      
      const where = { actif: true };
      if (categorie) where.categorie = categorie;
      if (yukaMin) where.yukaScore = { gte: parseInt(yukaMin) };
      if (prixMax) where.prix = { lte: parseFloat(prixMax) };

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [produits, total] = await Promise.all([
        prisma.produit.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.produit.count({ where })
      ]);

      res.json({
        produits,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getAllProduits:', error);
      res.status(500).json({ 
        error: 'Erreur serveur', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer un produit par ID
  async getProduitById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du produit requis' });
      }

      const produit = await prisma.produit.findUnique({ 
        where: { id },
        include: {
          // Ici on pourrait inclure les ingrédients et quantités liés
        }
      });

      if (!produit) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      res.json(produit);
    } catch (error) {
      console.error('Erreur getProduitById:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Créer un nouveau produit
  async createProduit(req, res) {
    try {
      // Validation des données d'entrée
      const { error, value } = produitSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      const produit = await prisma.produit.create({ data: value });
      
      res.status(201).json({
        message: 'Produit créé avec succès',
        produit
      });
    } catch (error) {
      console.error('Erreur createProduit:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Un produit avec ce nom existe déjà' });
      }
      
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Mettre à jour un produit
  async updateProduit(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du produit requis' });
      }

      // Validation des données d'entrée
      const { error, value } = updateProduitSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier que le produit existe
      const existingProduit = await prisma.produit.findUnique({ where: { id } });
      if (!existingProduit) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      const produit = await prisma.produit.update({ 
        where: { id }, 
        data: value 
      });

      res.json({
        message: 'Produit mis à jour avec succès',
        produit
      });
    } catch (error) {
      console.error('Erreur updateProduit:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Supprimer un produit
  async deleteProduit(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du produit requis' });
      }

      // Vérifier que le produit existe
      const existingProduit = await prisma.produit.findUnique({ where: { id } });
      if (!existingProduit) {
        return res.status(404).json({ error: 'Produit non trouvé' });
      }

      await prisma.produit.delete({ where: { id } });

      res.json({ message: 'Produit supprimé avec succès' });
    } catch (error) {
      console.error('Erreur deleteProduit:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Rechercher des produits
  async searchProduits(req, res) {
    try {
      const { q, categorie, yukaMin, prixMax, prixMin } = req.query;
      
      const where = { actif: true };
      
      if (q) {
        where.OR = [
          { nom: { contains: q } },
          { description: { contains: q } }
        ];
      }
      
      if (categorie) where.categorie = categorie;
      if (yukaMin) where.yukaScore = { gte: parseInt(yukaMin) };
      if (prixMax) where.prix = { lte: parseFloat(prixMax) };
      if (prixMin) where.prix = { ...where.prix, gte: parseFloat(prixMin) };

      const produits = await prisma.produit.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ produits, count: produits.length });
    } catch (error) {
      console.error('Erreur searchProduits:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
};

module.exports = produitController; 