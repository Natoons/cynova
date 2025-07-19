import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { PrismaClient } from '@prisma/client';
import express from 'express';
import cors from 'cors';

const prisma = new PrismaClient();
const app = express();
app.use(cors());
app.use(express.json());

// Copie des routes produits (pour test, à factoriser dans un vrai projet)
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

describe('API Produits', () => {
  it('POST /api/produits crée un produit', async () => {
    const res = await request(app)
      .post('/api/produits')
      .send({
        nom: 'Test Vitest',
        description: 'Produit test',
        ingredientIds: [],
        bienfaits: ['Test'],
        quantiteIds: [],
        yukaScore: 100,
        provenance: 'Test',
        stock: 1,
        blogIds: []
      });
    expect(res.status).toBe(201);
    expect(res.body.nom).toBe('Test Vitest');
    produitCree = res.body;
  });

  it('GET /api/produits retourne la liste', async () => {
    const res = await request(app).get('/api/produits');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('PUT /api/produits/:id modifie le produit', async () => {
    const res = await request(app)
      .put(`/api/produits/${produitCree.id}`)
      .send({ nom: 'Test Modifié' });
    expect(res.status).toBe(200);
    expect(res.body.nom).toBe('Test Modifié');
  });

  it('DELETE /api/produits/:id supprime le produit', async () => {
    const res = await request(app)
      .delete(`/api/produits/${produitCree.id}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Produit supprimé');
  });
}); 