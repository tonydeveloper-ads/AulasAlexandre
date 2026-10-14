require('dotenv').config();
const express = require('express');
const cors = require('cors');  
const path = require('path');   

const {
  inserirAluno,
  listarAlunos,
  buscarPorRa,
  atualizarCurso,
  excluirPorRa
} = require('./supabase');

const app = express();

// Middlewares globais
app.use(cors());                // habilita CORS
app.use(express.json());        // habilita JSON
app.use(express.static(path.join(__dirname, 'frontend'))); // serve arquivos estáticos

console.log("TESTE atualizarCurso:", typeof atualizarCurso);
console.log("TESTE excluirPorRa:", typeof excluirPorRa);

// ROTA GET - lista todos
app.get('/alunos', async (req, res) => {
  try {
    const dados = await listarAlunos();
    res.json(dados);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ROTA GET - busca por RA
app.get('/alunos/:ra', async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ROTA POST - inserir aluno
app.post('/alunos', async (req, res) => {
  try {
    const { nome, ra, curso } = req.body;
    if (!nome || !ra) {
      return res.status(400).json({ erro: 'Campos obrigatórios: nome e ra' });
    }
    const aluno = await inserirAluno(nome, ra, curso);
    res.status(201).json(aluno);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

// ROTA PUT - atualizar curso
app.put('/alunos/:ra', async (req, res) => {
  try {
    const data = await atualizarCurso(req.params.ra, req.body.curso);
    res.json(data);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

// ROTA DELETE - excluir aluno
app.delete('/alunos/:ra', async (req, res) => {
  try {
    const data = await excluirPorRa(req.params.ra);
    res.json(data);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
