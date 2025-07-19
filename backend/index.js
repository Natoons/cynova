const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// GET tous les produits
app.get('/api/produits', async (req, res) => {
  const produits = await prisma.produit.findMany();
  res.json(produits);
});

// GET un produit par ID
app.get('/api/produits/:id', async (req, res) => {
  const { id } = req.params;
  const produit = await prisma.produit.findUnique({ where: { id } });
  if (!produit) return res.status(404).json({ error: 'Produit non trouvé' });
  res.json(produit);
});

// POST créer un produit
app.post('/api/produits', async (req, res) => {
  try {
    const data = req.body;
    const produit = await prisma.produit.create({ data });
    res.status(201).json(produit);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// PUT modifier un produit
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

// DELETE supprimer un produit
app.delete('/api/produits/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await prisma.produit.delete({ where: { id } });
    res.json({ message: 'Produit supprimé' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend API running on http://localhost:${PORT}`);
}); 