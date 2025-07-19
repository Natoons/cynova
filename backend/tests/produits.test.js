import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import du contrôleur et des routes
const produitController = require('../controllers/produitController');
const produitRoutes = require('../routes/produitRoutes');
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
app.use('/api/produits', produitRoutes);
app.use(errorHandler);

let produitCree;

describe('API Produits - Tests Complets', () => {
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.produit.deleteMany();
  });

  describe('POST /api/produits - Création', () => {
    it('crée un shampoing avec données valides', async () => {
      const res = await request(app)
        .post('/api/produits')
        .send({
          nom: 'Shampoing Hydratant Aloé Vera',
          description: 'Shampoing naturel hydratant pour cheveux secs et abîmés',
          prix: 18.50,
          categorie: 'shampoing',
          stock: 25,
          yukaScore: 95,
          provenance: 'Maroc',
          imageUrl: 'https://example.com/aloevera-shampoo.jpg'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Produit créé avec succès');
      expect(res.body.produit.nom).toBe('Shampoing Hydratant Aloé Vera');
      expect(res.body.produit.prix).toBe(18.50);
      expect(res.body.produit.actif).toBe(true);
      
      produitCree = res.body.produit;
    });

    it('rejette un produit avec nom manquant', async () => {
      const res = await request(app)
        .post('/api/produits')
        .send({
          description: 'Description test',
          prix: 10.00,
          categorie: 'savon',
          stock: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"nom" is required');
    });

    it('rejette un produit avec prix négatif', async () => {
      const res = await request(app)
        .post('/api/produits')
        .send({
          nom: 'Produit Test',
          description: 'Description test',
          prix: -5.00,
          categorie: 'savon',
          stock: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"prix" must be a positive number');
    });

    it('rejette un produit avec catégorie invalide', async () => {
      const res = await request(app)
        .post('/api/produits')
        .send({
          nom: 'Produit Test',
          description: 'Description test',
          prix: 10.00,
          categorie: 'categorie_invalide',
          stock: 10
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('crée un produit avec valeurs par défaut', async () => {
      const res = await request(app)
        .post('/api/produits')
        .send({
          nom: 'Savon au Miel',
          description: 'Savon artisanal au miel bio',
          prix: 8.90,
          categorie: 'savon',
          stock: 15
        });

      expect(res.status).toBe(201);
      expect(res.body.produit.ingredientIds).toBe('[]');
      expect(res.body.produit.bienfaits).toBe('[]');
      expect(res.body.produit.actif).toBe(true);
    });
  });

  describe('GET /api/produits - Lecture', () => {
    beforeEach(async () => {
      // Créer des produits de test
      await prisma.produit.createMany({
        data: [
          {
            nom: 'Shampoing Aloé Vera',
            description: 'Shampoing hydratant',
            prix: 18.50,
            categorie: 'shampoing',
            stock: 25,
            yukaScore: 95
          },
          {
            nom: 'Savon au Miel',
            description: 'Savon nourrissant',
            prix: 8.90,
            categorie: 'savon',
            stock: 40,
            yukaScore: 88
          },
          {
            nom: 'Crème Lavande',
            description: 'Crème hydratante',
            prix: 24.90,
            categorie: 'crème',
            stock: 15,
            yukaScore: 92
          }
        ]
      });
    });

    it('récupère tous les produits avec pagination', async () => {
      const res = await request(app)
        .get('/api/produits?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.produits).toHaveLength(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it('filtre les produits par catégorie', async () => {
      const res = await request(app)
        .get('/api/produits?categorie=shampoing');

      expect(res.status).toBe(200);
      expect(res.body.produits).toHaveLength(1);
      expect(res.body.produits[0].categorie).toBe('shampoing');
    });

    it('filtre les produits par score Yuka minimum', async () => {
      const res = await request(app)
        .get('/api/produits?yukaMin=90');

      expect(res.status).toBe(200);
      expect(res.body.produits).toHaveLength(2);
      expect(res.body.produits.every(p => p.yukaScore >= 90)).toBe(true);
    });

    it('récupère un produit par ID', async () => {
      const produit = await prisma.produit.findFirst();
      
      const res = await request(app)
        .get(`/api/produits/${produit.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(produit.id);
      expect(res.body.nom).toBe(produit.nom);
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .get('/api/produits/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Produit non trouvé');
    });
  });

  describe('PUT /api/produits/:id - Modification', () => {
    beforeEach(async () => {
      produitCree = await prisma.produit.create({
        data: {
          nom: 'Produit Test',
          description: 'Description test',
          prix: 10.00,
          categorie: 'savon',
          stock: 10
        }
      });
    });

    it('met à jour un produit avec données valides', async () => {
      const res = await request(app)
        .put(`/api/produits/${produitCree.id}`)
        .send({
          prix: 15.90,
          stock: 20,
          description: 'Description mise à jour'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Produit mis à jour avec succès');
      expect(res.body.produit.prix).toBe(15.90);
      expect(res.body.produit.stock).toBe(20);
      expect(res.body.produit.description).toBe('Description mise à jour');
    });

    it('rejette une mise à jour avec données invalides', async () => {
      const res = await request(app)
        .put(`/api/produits/${produitCree.id}`)
        .send({
          prix: -5.00,
          categorie: 'categorie_invalide'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .put('/api/produits/inexistant-id')
        .send({ prix: 15.90 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Produit non trouvé');
    });
  });

  describe('DELETE /api/produits/:id - Suppression', () => {
    beforeEach(async () => {
      produitCree = await prisma.produit.create({
        data: {
          nom: 'Produit à supprimer',
          description: 'Description test',
          prix: 10.00,
          categorie: 'savon',
          stock: 10
        }
      });
    });

    it('supprime un produit existant', async () => {
      const res = await request(app)
        .delete(`/api/produits/${produitCree.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Produit supprimé avec succès');

      // Vérifier que le produit n'existe plus
      const produitSupprime = await prisma.produit.findUnique({
        where: { id: produitCree.id }
      });
      expect(produitSupprime).toBeNull();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .delete('/api/produits/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Produit non trouvé');
    });
  });

  describe('GET /api/produits/search - Recherche', () => {
    beforeEach(async () => {
      await prisma.produit.createMany({
        data: [
          {
            nom: 'Shampoing Aloé Vera',
            description: 'Shampoing hydratant naturel',
            prix: 18.50,
            categorie: 'shampoing',
            stock: 25,
            yukaScore: 95
          },
          {
            nom: 'Savon au Miel',
            description: 'Savon nourrissant au miel',
            prix: 8.90,
            categorie: 'savon',
            stock: 40,
            yukaScore: 88
          }
        ]
      });
    });

    it('recherche par terme dans nom et description', async () => {
      const res = await request(app)
        .get('/api/produits/search?q=miel');

      expect(res.status).toBe(200);
      expect(res.body.produits).toHaveLength(1);
      expect(res.body.produits[0].nom).toContain('Miel');
    });

    it('filtre par catégorie et score Yuka', async () => {
      const res = await request(app)
        .get('/api/produits/search?categorie=shampoing&yukaMin=90');

      expect(res.status).toBe(200);
      expect(res.body.produits).toHaveLength(1);
      expect(res.body.produits[0].categorie).toBe('shampoing');
      expect(res.body.produits[0].yukaScore).toBeGreaterThanOrEqual(90);
    });
  });

  describe('Rate Limiting', () => {
    it('applique le rate limiting après trop de requêtes', async () => {
      // Faire plusieurs requêtes rapides
      const promises = Array.from({ length: 105 }, () =>
        request(app).get('/api/produits')
      );

      const responses = await Promise.all(promises);
      const rateLimited = responses.filter(r => r.status === 429);

      expect(rateLimited.length).toBeGreaterThan(0);
      expect(rateLimited[0].body.error).toBe('Trop de requêtes, veuillez réessayer plus tard');
    });
  });
}); 