import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import du contrôleur et des routes
const utilisateurController = require('../controllers/utilisateurController');
const utilisateurRoutes = require('../routes/utilisateurRoutes');
const errorHandler = require('../middleware/errorHandler');

const prisma = new PrismaClient();
const app = express();

// Configuration du serveur de test
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes de test
app.use('/api/utilisateurs', utilisateurRoutes);
app.use(errorHandler);

let utilisateurCree;

describe('API Utilisateurs - Tests Complets', () => {
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.utilisateur.deleteMany();
  });

  describe('POST /api/utilisateurs - Création', () => {
    it('crée un utilisateur avec données valides', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'marie.dubois@example.com',
          motDePasse: 'motdepasse123',
          nom: 'Dubois',
          prenom: 'Marie',
          adresse: '123 Rue de la Paix, Paris',
          telephone: '0123456789',
          newsletter: true
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Utilisateur créé avec succès');
      expect(res.body.utilisateur.email).toBe('marie.dubois@example.com');
      expect(res.body.utilisateur.nom).toBe('Dubois');
      expect(res.body.utilisateur.role).toBe('USER');
      expect(res.body.utilisateur.newsletter).toBe(true);
      // Vérifier que le mot de passe n'est pas retourné
      expect(res.body.utilisateur.motDePasse).toBeUndefined();
      
      utilisateurCree = res.body.utilisateur;
    });

    it('rejette un utilisateur avec email manquant', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          motDePasse: 'motdepasse123',
          nom: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('rejette un utilisateur avec mot de passe trop court', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'test@example.com',
          motDePasse: '123',
          nom: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"motDePasse" length must be at least 8 characters long');
    });

    it('rejette un utilisateur avec email invalide', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'email-invalide',
          motDePasse: 'motdepasse123',
          nom: 'Test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"email" must be a valid email');
    });

    it('rejette un utilisateur avec email déjà existant', async () => {
      // Créer un premier utilisateur
      await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'test@example.com',
          motDePasse: 'motdepasse123',
          nom: 'Test'
        });

      // Essayer de créer un deuxième avec le même email
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'test@example.com',
          motDePasse: 'autre123',
          nom: 'Test2'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Un utilisateur avec cet email existe déjà');
    });

    it('crée un utilisateur avec valeurs par défaut', async () => {
      const res = await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'simple@example.com',
          motDePasse: 'motdepasse123'
        });

      expect(res.status).toBe(201);
      expect(res.body.utilisateur.role).toBe('USER');
      expect(res.body.utilisateur.newsletter).toBe(false);
      expect(res.body.utilisateur.nom).toBeNull();
      expect(res.body.utilisateur.prenom).toBeNull();
    });
  });

  describe('POST /api/utilisateurs/login - Connexion', () => {
    beforeEach(async () => {
      // Créer un utilisateur pour les tests de connexion
      await request(app)
        .post('/api/utilisateurs')
        .send({
          email: 'login@example.com',
          motDePasse: 'motdepasse123',
          nom: 'Login',
          prenom: 'Test'
        });
    });

    it('connecte un utilisateur avec des identifiants valides', async () => {
      const res = await request(app)
        .post('/api/utilisateurs/login')
        .send({
          email: 'login@example.com',
          motDePasse: 'motdepasse123'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Connexion réussie');
      expect(res.body.utilisateur.email).toBe('login@example.com');
      expect(res.body.utilisateur.nom).toBe('Login');
      expect(res.body.utilisateur.motDePasse).toBeUndefined();
    });

    it('rejette la connexion avec email incorrect', async () => {
      const res = await request(app)
        .post('/api/utilisateurs/login')
        .send({
          email: 'inexistant@example.com',
          motDePasse: 'motdepasse123'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Email ou mot de passe incorrect');
    });

    it('rejette la connexion avec mot de passe incorrect', async () => {
      const res = await request(app)
        .post('/api/utilisateurs/login')
        .send({
          email: 'login@example.com',
          motDePasse: 'mauvaismotdepasse'
        });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Email ou mot de passe incorrect');
    });

    it('rejette la connexion avec données manquantes', async () => {
      const res = await request(app)
        .post('/api/utilisateurs/login')
        .send({
          email: 'login@example.com'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Email et mot de passe requis');
    });
  });

  describe('GET /api/utilisateurs - Lecture', () => {
    beforeEach(async () => {
      // Créer des utilisateurs de test
      await prisma.utilisateur.createMany({
        data: [
          {
            email: 'user1@example.com',
            motDePasse: 'hashedpassword1',
            nom: 'User1',
            prenom: 'Test',
            role: 'USER',
            newsletter: true
          },
          {
            email: 'admin@example.com',
            motDePasse: 'hashedpassword2',
            nom: 'Admin',
            prenom: 'Test',
            role: 'ADMIN',
            newsletter: false
          },
          {
            email: 'user2@example.com',
            motDePasse: 'hashedpassword3',
            nom: 'User2',
            prenom: 'Test',
            role: 'USER',
            newsletter: true
          }
        ]
      });
    });

    it('récupère tous les utilisateurs avec pagination', async () => {
      const res = await request(app)
        .get('/api/utilisateurs?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.utilisateurs).toHaveLength(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it('filtre les utilisateurs par role', async () => {
      const res = await request(app)
        .get('/api/utilisateurs?role=ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.utilisateurs).toHaveLength(1);
      expect(res.body.utilisateurs[0].role).toBe('ADMIN');
    });

    it('filtre les utilisateurs par newsletter', async () => {
      const res = await request(app)
        .get('/api/utilisateurs?newsletter=true');

      expect(res.status).toBe(200);
      expect(res.body.utilisateurs).toHaveLength(2);
      expect(res.body.utilisateurs.every(u => u.newsletter)).toBe(true);
    });

    it('récupère un utilisateur par ID', async () => {
      const utilisateur = await prisma.utilisateur.findFirst();
      
      const res = await request(app)
        .get(`/api/utilisateurs/${utilisateur.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(utilisateur.id);
      expect(res.body.email).toBe(utilisateur.email);
      expect(res.body.motDePasse).toBeUndefined();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .get('/api/utilisateurs/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Utilisateur non trouvé');
    });
  });

  describe('PUT /api/utilisateurs/:id - Modification', () => {
    beforeEach(async () => {
      utilisateurCree = await prisma.utilisateur.create({
        data: {
          email: 'update@example.com',
          motDePasse: 'hashedpassword',
          nom: 'Update',
          prenom: 'Test',
          role: 'USER'
        }
      });
    });

    it('met à jour un utilisateur avec données valides', async () => {
      const res = await request(app)
        .put(`/api/utilisateurs/${utilisateurCree.id}`)
        .send({
          nom: 'Updated',
          prenom: 'Name',
          newsletter: true
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Utilisateur mis à jour avec succès');
      expect(res.body.utilisateur.nom).toBe('Updated');
      expect(res.body.utilisateur.prenom).toBe('Name');
      expect(res.body.utilisateur.newsletter).toBe(true);
    });

    it('met à jour le mot de passe', async () => {
      const res = await request(app)
        .put(`/api/utilisateurs/${utilisateurCree.id}`)
        .send({
          motDePasse: 'nouveaumotdepasse123'
        });

      expect(res.status).toBe(200);
      expect(res.body.utilisateur.motDePasse).toBeUndefined();
    });

    it('rejette une mise à jour avec email invalide', async () => {
      const res = await request(app)
        .put(`/api/utilisateurs/${utilisateurCree.id}`)
        .send({
          email: 'email-invalide'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .put('/api/utilisateurs/inexistant-id')
        .send({ nom: 'Nouveau nom' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Utilisateur non trouvé');
    });
  });

  describe('DELETE /api/utilisateurs/:id - Suppression', () => {
    beforeEach(async () => {
      utilisateurCree = await prisma.utilisateur.create({
        data: {
          email: 'delete@example.com',
          motDePasse: 'hashedpassword',
          nom: 'Delete',
          prenom: 'Test',
          role: 'USER'
        }
      });
    });

    it('supprime un utilisateur existant', async () => {
      const res = await request(app)
        .delete(`/api/utilisateurs/${utilisateurCree.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Utilisateur supprimé avec succès');

      // Vérifier que l'utilisateur n'existe plus
      const utilisateurSupprime = await prisma.utilisateur.findUnique({
        where: { id: utilisateurCree.id }
      });
      expect(utilisateurSupprime).toBeNull();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .delete('/api/utilisateurs/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Utilisateur non trouvé');
    });
  });

  describe('GET /api/utilisateurs/search - Recherche', () => {
    beforeEach(async () => {
      await prisma.utilisateur.createMany({
        data: [
          {
            email: 'marie.dubois@example.com',
            motDePasse: 'hashedpassword1',
            nom: 'Dubois',
            prenom: 'Marie',
            role: 'USER'
          },
          {
            email: 'jean.martin@example.com',
            motDePasse: 'hashedpassword2',
            nom: 'Martin',
            prenom: 'Jean',
            role: 'ADMIN'
          }
        ]
      });
    });

    it('recherche par terme dans email, nom et prénom', async () => {
      const res = await request(app)
        .get('/api/utilisateurs/search?q=marie');

      expect(res.status).toBe(200);
      expect(res.body.utilisateurs).toHaveLength(1);
      expect(res.body.utilisateurs[0].prenom).toBe('Marie');
    });

    it('filtre par role et newsletter', async () => {
      const res = await request(app)
        .get('/api/utilisateurs/search?role=ADMIN');

      expect(res.status).toBe(200);
      expect(res.body.utilisateurs).toHaveLength(1);
      expect(res.body.utilisateurs[0].role).toBe('ADMIN');
    });
  });
}); 