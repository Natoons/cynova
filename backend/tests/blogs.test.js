import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

// Import du contrôleur et des routes
const blogController = require('../controllers/blogController');
const blogRoutes = require('../routes/blogRoutes');
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
app.use('/api/blogs', blogRoutes);
app.use(errorHandler);

let blogCree;

describe('API Blogs - Tests Complets', () => {
  beforeEach(async () => {
    // Nettoyer la base de données avant chaque test
    await prisma.blog.deleteMany();
  });

  describe('POST /api/blogs - Création', () => {
    it('crée un blog sur les ingrédients naturels', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          titre: 'Les Bienfaits de l\'Aloé Vera en Cosmétique',
          contenu: 'L\'aloé vera est un ingrédient naturel très prisé en cosmétique. Ses propriétés hydratantes et apaisantes en font un allié de choix pour les peaux sensibles. Dans cet article, nous explorons ses multiples bienfaits et comment l\'intégrer dans votre routine beauté quotidienne.',
          categorie: 'ingrédients',
          auteur: 'Marie Dubois',
          imageUrl: 'https://example.com/aloevera-blog.jpg',
          tags: '["aloé vera", "hydratation", "naturel"]',
          produitIds: '["prod1", "prod2"]'
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toBe('Blog créé avec succès');
      expect(res.body.blog.titre).toBe('Les Bienfaits de l\'Aloé Vera en Cosmétique');
      expect(res.body.blog.categorie).toBe('ingrédients');
      expect(res.body.blog.publie).toBe(true);
      
      blogCree = res.body.blog;
    });

    it('rejette un blog avec titre manquant', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          contenu: 'Contenu test',
          categorie: 'conseils'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('rejette un blog avec contenu trop court', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          titre: 'Blog Test',
          contenu: 'Trop court',
          categorie: 'conseils'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toContain('"contenu" length must be at least 50 characters long');
    });

    it('rejette un blog avec catégorie invalide', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          titre: 'Blog Test',
          contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
          categorie: 'categorie_invalide'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
      expect(res.body.details).toBeDefined();
      expect(res.body.details.length).toBeGreaterThan(0);
    });

    it('crée un blog avec valeurs par défaut', async () => {
      const res = await request(app)
        .post('/api/blogs')
        .send({
          titre: 'Guide DIY : Masque Hydratant',
          contenu: 'Découvrez comment créer votre propre masque hydratant à la maison avec des ingrédients naturels. Cette recette simple et efficace vous permettra de prendre soin de votre peau sans produits chimiques.',
          categorie: 'DIY'
        });

      expect(res.status).toBe(201);
      expect(res.body.blog.auteur).toBe('Équipe Cynova');
      expect(res.body.blog.produitIds).toBe('[]');
      expect(res.body.blog.tags).toBe('[]');
      expect(res.body.blog.publie).toBe(true);
    });
  });

  describe('GET /api/blogs - Lecture', () => {
    beforeEach(async () => {
      // Créer des blogs de test
      await prisma.blog.createMany({
        data: [
          {
            titre: 'Les Bienfaits de l\'Aloé Vera',
            contenu: 'L\'aloé vera est un ingrédient naturel très prisé en cosmétique.',
            categorie: 'ingrédients',
            auteur: 'Marie Dubois'
          },
          {
            titre: 'Guide DIY : Masque Hydratant',
            contenu: 'Découvrez comment créer votre propre masque hydratant à la maison.',
            categorie: 'DIY',
            auteur: 'Équipe Cynova'
          },
          {
            titre: 'Conseils pour une Peau Saine',
            contenu: 'Voici nos conseils pour maintenir une peau saine et éclatante.',
            categorie: 'conseils',
            auteur: 'Dr. Sophie Martin'
          }
        ]
      });
    });

    it('récupère tous les blogs avec pagination', async () => {
      const res = await request(app)
        .get('/api/blogs?page=1&limit=2');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(2);
      expect(res.body.pagination.page).toBe(1);
      expect(res.body.pagination.limit).toBe(2);
      expect(res.body.pagination.total).toBe(3);
    });

    it('filtre les blogs par catégorie', async () => {
      const res = await request(app)
        .get('/api/blogs?categorie=ingrédients');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(1);
      expect(res.body.blogs[0].categorie).toBe('ingrédients');
    });

    it('filtre les blogs par auteur', async () => {
      const res = await request(app)
        .get('/api/blogs?auteur=Marie Dubois');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(1);
      expect(res.body.blogs[0].auteur).toBe('Marie Dubois');
    });

    it('récupère un blog par ID', async () => {
      const blog = await prisma.blog.findFirst();
      
      const res = await request(app)
        .get(`/api/blogs/${blog.id}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(blog.id);
      expect(res.body.titre).toBe(blog.titre);
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .get('/api/blogs/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Blog non trouvé');
    });
  });

  describe('PUT /api/blogs/:id - Modification', () => {
    beforeEach(async () => {
      blogCree = await prisma.blog.create({
        data: {
          titre: 'Blog Test',
          contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
          categorie: 'conseils'
        }
      });
    });

    it('met à jour un blog avec données valides', async () => {
      const res = await request(app)
        .put(`/api/blogs/${blogCree.id}`)
        .send({
          titre: 'Blog Mis à Jour',
          contenu: 'Contenu mis à jour avec suffisamment de caractères pour passer la validation',
          categorie: 'santé'
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Blog mis à jour avec succès');
      expect(res.body.blog.titre).toBe('Blog Mis à Jour');
      expect(res.body.blog.categorie).toBe('santé');
    });

    it('rejette une mise à jour avec données invalides', async () => {
      const res = await request(app)
        .put(`/api/blogs/${blogCree.id}`)
        .send({
          contenu: 'Trop court',
          categorie: 'categorie_invalide'
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Données invalides');
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .put('/api/blogs/inexistant-id')
        .send({ titre: 'Nouveau titre' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Blog non trouvé');
    });
  });

  describe('DELETE /api/blogs/:id - Suppression', () => {
    beforeEach(async () => {
      blogCree = await prisma.blog.create({
        data: {
          titre: 'Blog à supprimer',
          contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
          categorie: 'conseils'
        }
      });
    });

    it('supprime un blog existant', async () => {
      const res = await request(app)
        .delete(`/api/blogs/${blogCree.id}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Blog supprimé avec succès');

      // Vérifier que le blog n'existe plus
      const blogSupprime = await prisma.blog.findUnique({
        where: { id: blogCree.id }
      });
      expect(blogSupprime).toBeNull();
    });

    it('retourne 404 pour un ID inexistant', async () => {
      const res = await request(app)
        .delete('/api/blogs/inexistant-id');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Blog non trouvé');
    });
  });

  describe('GET /api/blogs/search - Recherche', () => {
    beforeEach(async () => {
      await prisma.blog.createMany({
        data: [
          {
            titre: 'Les Bienfaits de l\'Aloé Vera',
            contenu: 'L\'aloé vera est un ingrédient naturel très prisé en cosmétique.',
            categorie: 'ingrédients',
            auteur: 'Marie Dubois',
            tags: '["aloé vera", "hydratation"]'
          },
          {
            titre: 'Guide DIY : Masque Hydratant',
            contenu: 'Découvrez comment créer votre propre masque hydratant à la maison.',
            categorie: 'DIY',
            auteur: 'Équipe Cynova',
            tags: '["DIY", "masque", "hydratation"]'
          }
        ]
      });
    });

    it('recherche par terme dans titre et contenu', async () => {
      const res = await request(app)
        .get('/api/blogs/search?q=aloé');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(1);
      expect(res.body.blogs[0].titre).toContain('Aloé');
    });

    it('filtre par catégorie et auteur', async () => {
      const res = await request(app)
        .get('/api/blogs/search?categorie=DIY&auteur=Équipe Cynova');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(1);
      expect(res.body.blogs[0].categorie).toBe('DIY');
      expect(res.body.blogs[0].auteur).toBe('Équipe Cynova');
    });
  });

  describe('GET /api/blogs/categorie/:categorie - Blogs par catégorie', () => {
    beforeEach(async () => {
      await prisma.blog.createMany({
        data: [
          {
            titre: 'Blog 1',
            contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
            categorie: 'conseils',
            publie: true
          },
          {
            titre: 'Blog 2',
            contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
            categorie: 'conseils',
            publie: true
          },
          {
            titre: 'Blog 3',
            contenu: 'Contenu de test avec suffisamment de caractères pour passer la validation',
            categorie: 'DIY',
            publie: true
          }
        ]
      });
    });

    it('récupère les blogs par catégorie avec pagination', async () => {
      const res = await request(app)
        .get('/api/blogs/categorie/conseils?page=1&limit=1');

      expect(res.status).toBe(200);
      expect(res.body.blogs).toHaveLength(1);
      expect(res.body.blogs[0].categorie).toBe('conseils');
      expect(res.body.pagination.total).toBe(2);
    });
  });
}); 