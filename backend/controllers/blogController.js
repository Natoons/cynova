const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');

const prisma = new PrismaClient();

// Schémas de validation
const blogSchema = Joi.object({
  titre: Joi.string().min(5).max(200).required(),
  contenu: Joi.string().min(50).max(10000).required(),
  categorie: Joi.string().valid('ingrédients', 'conseils', 'DIY', 'santé', 'recettes').required(),
  auteur: Joi.string().max(100).default('Équipe Cynova'),
  imageUrl: Joi.string().uri().optional(),
  produitIds: Joi.string().default('[]'),
  tags: Joi.string().default('[]'),
  publie: Joi.boolean().default(true)
});

const updateBlogSchema = Joi.object({
  titre: Joi.string().min(5).max(200).optional(),
  contenu: Joi.string().min(50).max(10000).optional(),
  categorie: Joi.string().valid('ingrédients', 'conseils', 'DIY', 'santé', 'recettes').optional(),
  auteur: Joi.string().max(100).optional(),
  imageUrl: Joi.string().uri().optional(),
  produitIds: Joi.string().optional(),
  tags: Joi.string().optional(),
  publie: Joi.boolean().optional()
});

// Contrôleurs
const blogController = {
  // Récupérer tous les blogs
  async getAllBlogs(req, res) {
    try {
      const { page = 1, limit = 10, categorie, auteur, publie } = req.query;
      
      const where = {};
      if (categorie) where.categorie = categorie;
      if (auteur) where.auteur = auteur;
      if (publie !== undefined) where.publie = publie === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [blogs, total] = await Promise.all([
        prisma.blog.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.blog.count({ where })
      ]);

      res.json({
        blogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getAllBlogs:', error);
      res.status(500).json({ 
        error: 'Erreur serveur', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer un blog par ID
  async getBlogById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du blog requis' });
      }

      const blog = await prisma.blog.findUnique({ where: { id } });

      if (!blog) {
        return res.status(404).json({ error: 'Blog non trouvé' });
      }

      res.json(blog);
    } catch (error) {
      console.error('Erreur getBlogById:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Créer un nouveau blog
  async createBlog(req, res) {
    try {
      // Validation des données d'entrée
      const { error, value } = blogSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      const blog = await prisma.blog.create({ data: value });
      
      res.status(201).json({
        message: 'Blog créé avec succès',
        blog
      });
    } catch (error) {
      console.error('Erreur createBlog:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Un blog avec ce titre existe déjà' });
      }
      
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Mettre à jour un blog
  async updateBlog(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du blog requis' });
      }

      // Validation des données d'entrée
      const { error, value } = updateBlogSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier que le blog existe
      const existingBlog = await prisma.blog.findUnique({ where: { id } });
      if (!existingBlog) {
        return res.status(404).json({ error: 'Blog non trouvé' });
      }

      const blog = await prisma.blog.update({ 
        where: { id }, 
        data: value 
      });

      res.json({
        message: 'Blog mis à jour avec succès',
        blog
      });
    } catch (error) {
      console.error('Erreur updateBlog:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Supprimer un blog
  async deleteBlog(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID du blog requis' });
      }

      // Vérifier que le blog existe
      const existingBlog = await prisma.blog.findUnique({ where: { id } });
      if (!existingBlog) {
        return res.status(404).json({ error: 'Blog non trouvé' });
      }

      await prisma.blog.delete({ where: { id } });

      res.json({ message: 'Blog supprimé avec succès' });
    } catch (error) {
      console.error('Erreur deleteBlog:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Rechercher des blogs
  async searchBlogs(req, res) {
    try {
      const { q, categorie, auteur, tags } = req.query;
      
      const where = {};
      
      if (q) {
        where.OR = [
          { titre: { contains: q } },
          { contenu: { contains: q } }
        ];
      }
      
      if (categorie) where.categorie = categorie;
      if (auteur) where.auteur = auteur;
      if (tags) where.tags = { contains: tags };

      const blogs = await prisma.blog.findMany({
        where,
        orderBy: { createdAt: 'desc' }
      });

      res.json({ blogs, count: blogs.length });
    } catch (error) {
      console.error('Erreur searchBlogs:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer les blogs par catégorie
  async getBlogsByCategory(req, res) {
    try {
      const { categorie } = req.params;
      const { page = 1, limit = 10 } = req.query;

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [blogs, total] = await Promise.all([
        prisma.blog.findMany({
          where: { 
            categorie: categorie,
            publie: true 
          },
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' }
        }),
        prisma.blog.count({ 
          where: { 
            categorie: categorie,
            publie: true 
          } 
        })
      ]);

      res.json({
        blogs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getBlogsByCategory:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
};

module.exports = blogController; 