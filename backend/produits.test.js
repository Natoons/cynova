import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Routes API pour les tests
app.get('/api/produits', async (req, res) => {
  const produits = await prisma.produit.findMany();
  res.json(produits);
});

app.post('/api/produits', async (req, res) => {
  try {
    const data = req.body;
    const produit = await prisma.produit.create({ data });
    res.status(201).json(produit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.put('/api/produits/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const data = req.body;
    const produit = await prisma.produit.update({ where: { id }, data });
    res.json(produit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/produits/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.produit.delete({ where: { id } });
    res.json({ message: 'Produit supprimé' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

let produitCree;

describe('API Produits - Tests Réalistes', () => {
  it('POST /api/produits crée un shampoing à l\'aloé vera', async () => {
    const res = await request(app)
      .post('/api/produits')
      .send({
        nom: 'Shampoing Hydratant Aloé Vera',
        description: 'Shampoing naturel hydratant pour cheveux secs et abîmés',
        prix: 18.50,
        categorie: 'shampoing',
        ingredientIds: '["ing1", "ing2"]',
        bienfaits: '["Hydratant", "Apaisant", "Réparateur"]',
        quantiteIds: '["qty1", "qty2"]',
        yukaScore: 95,
        provenance: 'Maroc',
        stock: 25,
        blogIds: '["blog1"]',
        imageUrl: 'https://example.com/aloevera-shampoo.jpg',
        actif: true
      });
    
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Shampoing Hydratant Aloé Vera');
    expect(res.body.prix).toBe(18.50);
    expect(res.body.categorie).toBe('shampoing');
    expect(res.body.yukaScore).toBe(95);
    produitCree = res.body;
  });

  it('POST /api/produits crée un savon au miel', async () => {
    const res = await request(app)
      .post('/api/produits')
      .send({
        nom: 'Savon Nourrissant au Miel',
        description: 'Savon artisanal au miel bio pour peau sensible',
        prix: 8.90,
        categorie: 'savon',
        ingredientIds: '["ing3"]',
        bienfaits: '["Nourrissant", "Antibactérien", "Apaisant"]',
        quantiteIds: '["qty3"]',
        yukaScore: 88,
        provenance: 'France',
        stock: 40,
        blogIds: '["blog2"]',
        imageUrl: 'https://example.com/honey-soap.jpg',
        actif: true
      });
    
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Savon Nourrissant au Miel');
    expect(res.body.prix).toBe(8.90);
    expect(res.body.categorie).toBe('savon');
  });

  it('GET /api/produits retourne la liste des produits', async () => {
    const res = await request(app).get('/api/produits');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    
    // Vérifie que les produits ont les bonnes propriétés
    const premierProduit = res.body[0];
    expect(premierProduit).toHaveProperty('nom');
    expect(premierProduit).toHaveProperty('prix');
    expect(premierProduit).toHaveProperty('categorie');
    expect(premierProduit).toHaveProperty('yukaScore');
  });

  it('PUT /api/produits/:id modifie le prix et le stock', async () => {
    const res = await request(app)
      .put(`/api/produits/${produitCree.id}`)
      .send({ 
        prix: 19.90,
        stock: 30,
        description: 'Shampoing naturel hydratant pour cheveux secs et abîmés - Version améliorée'
      });
    
    expect(res.status).toBe(200);
    expect(res.body.prix).toBe(19.90);
    expect(res.body.stock).toBe(30);
    expect(res.body.description).toContain('Version améliorée');
  });

  it('DELETE /api/produits/:id supprime le produit', async () => {
    const res = await request(app)
      .delete(`/api/produits/${produitCree.id}`);
    
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Produit supprimé');
  });

  it('POST /api/produits valide les champs obligatoires', async () => {
    const res = await request(app)
      .post('/api/produits')
      .send({
        // Manque nom, description, prix, categorie, stock
        yukaScore: 90
      });
    
    expect(res.status).toBe(400);
  });

  it('POST /api/produits crée un produit avec valeurs par défaut', async () => {
    const res = await request(app)
      .post('/api/produits')
      .send({
        nom: 'Crème Hydratante Lavande',
        description: 'Crème hydratante à la lavande bio',
        prix: 24.90,
        categorie: 'crème',
        stock: 15
        // Les autres champs auront leurs valeurs par défaut
      });
    
    expect(res.status).toBe(201);
    expect(res.body.actif).toBe(true);
    expect(res.body.stock).toBe(15);
    expect(res.body.ingredientIds).toBe('[]');
    expect(res.body.bienfaits).toBe('[]');
  });
}); 