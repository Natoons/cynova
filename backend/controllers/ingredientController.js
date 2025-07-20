const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const prisma = new PrismaClient();

// Schémas de validation
const ingredientSchema = Joi.object({
  nom: Joi.string().min(2).max(100).required(),
  origine: Joi.string().max(50).optional(),
  description: Joi.string().max(500).optional(),
  bio: Joi.boolean().default(false),
  allergene: Joi.boolean().default(false),
  produitId: Joi.string().optional()
});

const updateIngredientSchema = Joi.object({
  nom: Joi.string().min(2).max(100).optional(),
  origine: Joi.string().max(50).optional(),
  description: Joi.string().max(500).optional(),
  bio: Joi.boolean().optional(),
  allergene: Joi.boolean().optional(),
  produitId: Joi.string().optional()
});

// Contrôleurs
const ingredientController = {
  // Récupérer tous les ingrédients
  async getAllIngredients(req, res) {
    try {
      const { page = 1, limit = 10, bio, allergene, origine } = req.query;
      
      const where = {};
      if (bio !== undefined) where.bio = bio === 'true';
      if (allergene !== undefined) where.allergene = allergene === 'true';
      if (origine) where.origine = origine;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { nom: 'asc' }
        }),
        prisma.ingredient.count({ where })
      ]);

      res.json({
        ingredients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getAllIngredients:', error);
      res.status(500).json({ 
        error: 'Erreur serveur', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer un ingrédient par ID
  async getIngredientById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'ingrédient requis' });
      }

      const ingredient = await prisma.ingredient.findUnique({ where: { id } });

      if (!ingredient) {
        return res.status(404).json({ error: 'Ingrédient non trouvé' });
      }

      res.json(ingredient);
    } catch (error) {
      console.error('Erreur getIngredientById:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Créer un nouvel ingrédient
  async createIngredient(req, res) {
    try {
      // Validation des données d'entrée
      const { error, value } = ingredientSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier si un ingrédient avec ce nom existe déjà
      const existingIngredient = await prisma.ingredient.findFirst({
        where: { nom: value.nom }
      });

      if (existingIngredient) {
        return res.status(400).json({ error: 'Un ingrédient avec ce nom existe déjà' });
      }

      const ingredient = await prisma.ingredient.create({ data: value });
      
      res.status(201).json({
        message: 'Ingrédient créé avec succès',
        ingredient
      });
    } catch (error) {
      console.error('Erreur createIngredient:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Un ingrédient avec ce nom existe déjà' });
      }
      
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Mettre à jour un ingrédient
  async updateIngredient(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'ingrédient requis' });
      }

      // Validation des données d'entrée
      const { error, value } = updateIngredientSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier que l'ingrédient existe
      const existingIngredient = await prisma.ingredient.findUnique({ where: { id } });
      if (!existingIngredient) {
        return res.status(404).json({ error: 'Ingrédient non trouvé' });
      }

      const ingredient = await prisma.ingredient.update({ 
        where: { id }, 
        data: value 
      });

      res.json({
        message: 'Ingrédient mis à jour avec succès',
        ingredient
      });
    } catch (error) {
      console.error('Erreur updateIngredient:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Supprimer un ingrédient
  async deleteIngredient(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'ingrédient requis' });
      }

      // Vérifier que l'ingrédient existe
      const existingIngredient = await prisma.ingredient.findUnique({ where: { id } });
      if (!existingIngredient) {
        return res.status(404).json({ error: 'Ingrédient non trouvé' });
      }

      await prisma.ingredient.delete({ where: { id } });

      res.json({ message: 'Ingrédient supprimé avec succès' });
    } catch (error) {
      console.error('Erreur deleteIngredient:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Rechercher des ingrédients
  async searchIngredients(req, res) {
    try {
      const { q, bio, allergene, origine } = req.query;
      
      const where = {};
      
      if (q) {
        where.OR = [
          { nom: { contains: q } },
          { description: { contains: q } }
        ];
      }
      
      if (bio !== undefined) where.bio = bio === 'true';
      if (allergene !== undefined) where.allergene = allergene === 'true';
      if (origine) where.origine = origine;

      const ingredients = await prisma.ingredient.findMany({
        where,
        orderBy: { nom: 'asc' }
      });

      res.json({ ingredients, count: ingredients.length });
    } catch (error) {
      console.error('Erreur searchIngredients:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer les ingrédients par origine
  async getIngredientsByOrigin(req, res) {
    try {
      const { origine } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where: { origine: origine },
          skip,
          take: parseInt(limit),
          orderBy: { nom: 'asc' }
        }),
        prisma.ingredient.count({ where: { origine: origine } })
      ]);

      res.json({
        ingredients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getIngredientsByOrigin:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer les ingrédients bio
  async getBioIngredients(req, res) {
    try {
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [ingredients, total] = await Promise.all([
        prisma.ingredient.findMany({
          where: { bio: true },
          skip,
          take: parseInt(limit),
          orderBy: { nom: 'asc' }
        }),
        prisma.ingredient.count({ where: { bio: true } })
      ]);

      res.json({
        ingredients,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getBioIngredients:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
};

module.exports = ingredientController; 