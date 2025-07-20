const { PrismaClient } = require('@prisma/client');
const Joi = require('joi');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// Schémas de validation
const utilisateurSchema = Joi.object({
  email: Joi.string().email().required(),
  motDePasse: Joi.string().min(8).required(),
  nom: Joi.string().max(100).optional(),
  prenom: Joi.string().max(100).optional(),
  role: Joi.string().valid('ADMIN', 'USER').default('USER'),
  adresse: Joi.string().max(200).optional(),
  telephone: Joi.string().max(20).optional(),
  newsletter: Joi.boolean().default(false)
});

const updateUtilisateurSchema = Joi.object({
  email: Joi.string().email().optional(),
  motDePasse: Joi.string().min(8).optional(),
  nom: Joi.string().max(100).optional(),
  prenom: Joi.string().max(100).optional(),
  role: Joi.string().valid('ADMIN', 'USER').optional(),
  adresse: Joi.string().max(200).optional(),
  telephone: Joi.string().max(20).optional(),
  newsletter: Joi.boolean().optional()
});

// Contrôleurs
const utilisateurController = {
  // Récupérer tous les utilisateurs (admin seulement)
  async getAllUtilisateurs(req, res) {
    try {
      const { page = 1, limit = 10, role, newsletter } = req.query;
      
      const where = {};
      if (role) where.role = role;
      if (newsletter !== undefined) where.newsletter = newsletter === 'true';

      const skip = (parseInt(page) - 1) * parseInt(limit);
      
      const [utilisateurs, total] = await Promise.all([
        prisma.utilisateur.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            nom: true,
            prenom: true,
            role: true,
            adresse: true,
            telephone: true,
            newsletter: true,
            createdAt: true,
            updatedAt: true
            // Ne pas inclure motDePasse pour la sécurité
          }
        }),
        prisma.utilisateur.count({ where })
      ]);

      res.json({
        utilisateurs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Erreur getAllUtilisateurs:', error);
      res.status(500).json({ 
        error: 'Erreur serveur', 
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Récupérer un utilisateur par ID
  async getUtilisateurById(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'utilisateur requis' });
      }

      const utilisateur = await prisma.utilisateur.findUnique({ 
        where: { id },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          adresse: true,
          telephone: true,
          newsletter: true,
          createdAt: true,
          updatedAt: true
          // Ne pas inclure motDePasse pour la sécurité
        }
      });

      if (!utilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(utilisateur);
    } catch (error) {
      console.error('Erreur getUtilisateurById:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Créer un nouvel utilisateur
  async createUtilisateur(req, res) {
    try {
      // Validation des données d'entrée
      const { error, value } = utilisateurSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier si l'email existe déjà
      const existingUser = await prisma.utilisateur.findUnique({
        where: { email: value.email }
      });

      if (existingUser) {
        return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
      }

      // Hasher le mot de passe
      const saltRounds = 10;
      const hashedPassword = await bcrypt.hash(value.motDePasse, saltRounds);

      const utilisateur = await prisma.utilisateur.create({ 
        data: {
          ...value,
          motDePasse: hashedPassword
        },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          adresse: true,
          telephone: true,
          newsletter: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      res.status(201).json({
        message: 'Utilisateur créé avec succès',
        utilisateur
      });
    } catch (error) {
      console.error('Erreur createUtilisateur:', error);
      
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà' });
      }
      
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Mettre à jour un utilisateur
  async updateUtilisateur(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'utilisateur requis' });
      }

      // Validation des données d'entrée
      const { error, value } = updateUtilisateurSchema.validate(req.body);
      if (error) {
        return res.status(400).json({ 
          error: 'Données invalides', 
          details: error.details.map(d => d.message) 
        });
      }

      // Vérifier que l'utilisateur existe
      const existingUtilisateur = await prisma.utilisateur.findUnique({ where: { id } });
      if (!existingUtilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Si un nouveau mot de passe est fourni, le hasher
      let updateData = { ...value };
      if (value.motDePasse) {
        const saltRounds = 10;
        updateData.motDePasse = await bcrypt.hash(value.motDePasse, saltRounds);
      }

      const utilisateur = await prisma.utilisateur.update({ 
        where: { id }, 
        data: updateData,
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          adresse: true,
          telephone: true,
          newsletter: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({
        message: 'Utilisateur mis à jour avec succès',
        utilisateur
      });
    } catch (error) {
      console.error('Erreur updateUtilisateur:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Supprimer un utilisateur
  async deleteUtilisateur(req, res) {
    try {
      const { id } = req.params;
      
      if (!id) {
        return res.status(400).json({ error: 'ID de l\'utilisateur requis' });
      }

      // Vérifier que l'utilisateur existe
      const existingUtilisateur = await prisma.utilisateur.findUnique({ where: { id } });
      if (!existingUtilisateur) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      await prisma.utilisateur.delete({ where: { id } });

      res.json({ message: 'Utilisateur supprimé avec succès' });
    } catch (error) {
      console.error('Erreur deleteUtilisateur:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Connexion utilisateur
  async login(req, res) {
    try {
      const { email, motDePasse } = req.body;

      if (!email || !motDePasse) {
        return res.status(400).json({ error: 'Email et mot de passe requis' });
      }

      // Trouver l'utilisateur par email
      const utilisateur = await prisma.utilisateur.findUnique({
        where: { email }
      });

      if (!utilisateur) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Vérifier le mot de passe
      const passwordMatch = await bcrypt.compare(motDePasse, utilisateur.motDePasse);

      if (!passwordMatch) {
        return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
      }

      // Retourner les informations utilisateur (sans mot de passe)
      const { motDePasse: _, ...userInfo } = utilisateur;

      res.json({
        message: 'Connexion réussie',
        utilisateur: userInfo
      });
    } catch (error) {
      console.error('Erreur login:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  },

  // Rechercher des utilisateurs
  async searchUtilisateurs(req, res) {
    try {
      const { q, role, newsletter } = req.query;
      
      const where = {};
      
      if (q) {
        where.OR = [
          { email: { contains: q } },
          { nom: { contains: q } },
          { prenom: { contains: q } }
        ];
      }
      
      if (role) where.role = role;
      if (newsletter !== undefined) where.newsletter = newsletter === 'true';

      const utilisateurs = await prisma.utilisateur.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          nom: true,
          prenom: true,
          role: true,
          adresse: true,
          telephone: true,
          newsletter: true,
          createdAt: true,
          updatedAt: true
        }
      });

      res.json({ utilisateurs, count: utilisateurs.length });
    } catch (error) {
      console.error('Erreur searchUtilisateurs:', error);
      res.status(500).json({ 
        error: 'Erreur serveur',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined 
      });
    }
  }
};

module.exports = utilisateurController; 