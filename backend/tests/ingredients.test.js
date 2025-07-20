import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import du contrôleur et des routes
const ingredientController = require('../controllers/ingredientController');
const ingredientRoutes = require('../routes/ingredientRoutes');
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
app.use('/api/ingredients', ingredientRoutes);
app.use(errorHandler);

let ingredientCree;

describe('API Ingrédients - Tests Complets', () => {
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.ingredient.deleteMany();
  });

  describe('POST /api/ingredients - Création', () => {
    it('crée un ingrédient bio avec données valides', async () => {
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'Aloé Vera Bio',
          origine: 'Mexique',
          description: 'Gel d\'aloé vera pur, récolté à la main et certifié bio. Excellent pour hydrater et apaiser la peau.',
          bio: true,
          allergene: false
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Ingrédient créé avec succès');
      expect(res.body.ingredient.nom).toBe('Aloé Vera Bio');
      expect(res.body.ingredient.origine).toBe('Mexique');
      expect(res.body.ingredient.bio).toBe(true);
      expect(res.body.ingredient.allergene).toBe(false);
      
      ingredientCree = res.body.ingredient;
    });

    it('rejette un ingrédient avec nom manquant', async () => {
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          origine: 'France',
          description: 'Description test'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('rejette un ingrédient avec nom trop court', async () => {
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'A',
          origine: 'France'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"nom" length must be at least 2 characters long');
    });

    it('rejette un ingrédient avec nom trop long', async () => {
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'A'.repeat(101), // 101 caractères
          origine: 'France'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"nom" length must be less than or equal to 100 characters long');
    });

    it('crée un ingrédient avec valeurs par défaut', async () => {
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'Huile de Coco',
          origine: 'Sri Lanka'
        });

      expect(res.status).toBe(201);
      expect(res.body.ingredient.bio).toBe(false);
      expect(res.body.ingredient.allergene).toBe(false);
      expect(res.body.ingredient.description).toBeNull();
    });

    it('rejette un ingrédient avec nom déjà existant', async () => {
      // Créer un premier ingrédient
      await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'Huile d\'Argan',
          origine: 'Maroc'
        });

      // Essayer de créer un deuxième avec le même nom
      const res = await request(app)
        .post('/api/ingredients')
        .send({
          nom: 'Huile d\'Argan',
          origine: 'Algérie'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Un ingrédient avec ce nom existe déjà');
    });
  });

  describe('GET /api/ingredients - Lecture', () => {
    beforeEach(async () => {
      // Créer des ingrédients de test
      await prisma.ingredient.createMany({
        data: [
          {
            nom: 'Aloé Vera Bio',
            origine: 'Mexique',
            description: 'Gel d\'aloé vera pur et bio',
            bio: true,
            allergene: false
          },
          {
            nom: 'Huile de Coco',
            origine: 'Sri Lanka',
            description: 'Huile de coco vierge extra',
            bio: false,
            allergene: true
          },
          {
            nom: 'Beurre de Karité',
            origine: 'Burkina Faso',
            description: 'Beurre de karité pur et bio',
            bio: true,
            allergene: false
          }
        ]
      });
    });

    it('récupère tous les ingrédients avec pagination', async () => {
      const res = await request(app)
        .get('/api/ingredients?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it('filtre les ingrédients bio', async () => {
      const res = await request(app)
        .get('/api/ingredients?bio=true');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(2);
      expect(res.body.ingredients.every(i => i.bio)).toBe(true);
    });

    it('filtre les ingrédients allergènes', async () => {
      const res = await request(app)
        .get('/api/ingredients?allergene=true');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].allergene).toBe(true);
    });

    it('filtre les ingrédients par origine', async () => {
      const res = await request(app)
        .get('/api/ingredients?origine=Mexique');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].origine).toBe('Mexique');
    });

    it('récupère un ingrédient par ID', async () => {
      const ingredient = await prisma.ingredient.findFirst();
      
      const res = await request(app)
        .get(`/api/ingredients/${ingredient.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(ingredient.id);
      expect(res.body.nom).toBe(ingredient.nom);
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .get('/api/ingredients/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ingrédient non trouvé');
    });
  });

  describe('PUT /api/ingredients/:id - Modification', () => {
    beforeEach(async () => {
      ingredientCree = await prisma.ingredient.create({
        data: {
          nom: 'Ingrédient Test',
          origine: 'France',
          description: 'Description de test',
          bio: false,
          allergene: false
        }
      });
    });

    it('met à jour un ingrédient avec données valides', async () => {
      const res = await request(app)
        .put(`/api/ingredients/${ingredientCree.id}`)
        .send({
          nom: 'Ingrédient Mis à Jour',
          bio: true,
          allergene: true
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Ingrédient mis à jour avec succès');
      expect(res.body.ingredient.nom).toBe('Ingrédient Mis à Jour');
      expect(res.body.ingredient.bio).toBe(true);
      expect(res.body.ingredient.allergene).toBe(true);
    });

    it('rejette une mise à jour avec nom trop court', async () => {
      const res = await request(app)
        .put(`/api/ingredients/${ingredientCree.id}`)
        .send({
          nom: 'A'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .put('/api/ingredients/inexistant-id')
        .send({ nom: 'Nouveau nom' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ingrédient non trouvé');
    });
  });

  describe('DELETE /api/ingredients/:id - Suppression', () => {
    beforeEach(async () => {
      ingredientCree = await prisma.ingredient.create({
        data: {
          nom: 'Ingrédient à supprimer',
          origine: 'France',
          description: 'Description de test'
        }
      });
    });

    it('supprime un ingrédient existant', async () => {
      const res = await request(app)
        .delete(`/api/ingredients/${ingredientCree.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Ingrédient supprimé avec succès');

      // Vérifier que l'ingrédient n'existe plus
      const ingredientSupprime = await prisma.ingredient.findUnique({
        where: { id: ingredientCree.id }
      });
      expect(ingredientSupprime).toBeNull();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .delete('/api/ingredients/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ingrédient non trouvé');
    });
  });

  describe('GET /api/ingredients/search - Recherche', () => {
    beforeEach(async () => {
      await prisma.ingredient.createMany({
        data: [
          {
            nom: 'Aloé Vera Bio',
            origine: 'Mexique',
            description: 'Gel d\'aloé vera pur et bio pour hydratation',
            bio: true,
            allergene: false
          },
          {
            nom: 'Huile de Coco',
            origine: 'Sri Lanka',
            description: 'Huile de coco vierge extra pour soins',
            bio: false,
            allergene: true
          },
          {
            nom: 'Beurre de Karité',
            origine: 'Burkina Faso',
            description: 'Beurre de karité pur et bio pour protection',
            bio: true,
            allergene: false
          }
        ]
      });
    });

    it('recherche par terme dans nom et description', async () => {
      const res = await request(app)
        .get('/api/ingredients/search?q=aloé');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].nom).toContain('Aloé');
    });

    it('filtre par bio et allergène', async () => {
      const res = await request(app)
        .get('/api/ingredients/search?bio=true&allergene=false');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(2);
      expect(res.body.ingredients.every(i => i.bio && !i.allergene)).toBe(true);
    });

    it('filtre par origine', async () => {
      const res = await request(app)
        .get('/api/ingredients/search?origine=Mexique');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].origine).toBe('Mexique');
    });
  });

  describe('GET /api/ingredients/origine/:origine - Ingrédients par origine', () => {
    beforeEach(async () => {
      await prisma.ingredient.createMany({
        data: [
          {
            nom: 'Ingrédient 1',
            origine: 'France',
            description: 'Description test'
          },
          {
            nom: 'Ingrédient 2',
            origine: 'France',
            description: 'Description test'
          },
          {
            nom: 'Ingrédient 3',
            origine: 'Italie',
            description: 'Description test'
          }
        ]
      });
    });

    it('récupère les ingrédients par origine avec pagination', async () => {
      const res = await request(app)
        .get('/api/ingredients/origine/France?page=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].origine).toBe('France');
      expect(res.body.pagination.total).toBe(2);
    });
  });

  describe('GET /api/ingredients/bio - Ingrédients bio', () => {
    beforeEach(async () => {
      await prisma.ingredient.createMany({
        data: [
          {
            nom: 'Bio 1',
            origine: 'France',
            description: 'Description test',
            bio: true
          },
          {
            nom: 'Bio 2',
            origine: 'Espagne',
            description: 'Description test',
            bio: true
          },
          {
            nom: 'Non Bio',
            origine: 'Italie',
            description: 'Description test',
            bio: false
          }
        ]
      });
    });

    it('récupère tous les ingrédients bio avec pagination', async () => {
      const res = await request(app)
        .get('/api/ingredients/bio?page=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.ingredients).toHaveLength(1);
      expect(res.body.ingredients[0].bio).toBe(true);
      expect(res.body.pagination.total).toBe(2);
    });
  });
}); 