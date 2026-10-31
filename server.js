require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const {
  inserirCurso, listarCursos, excluirCurso, listarAlunosDoCurso,
  inserirAluno, listarAlunos, buscarPorRa, atualizarAluno, excluirPorRa,
} = require('./supabase');

// códigos de erro do Postgres
const ERRO_DUPLICADO = '23505';         // unique violado (nome de curso ou RA repetido)
const ERRO_CHAVE_ESTRANGEIRA = '23503'; // curso_id inexistente, ou curso com alunos

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ===================== CURSOS =====================

app.get('/cursos', async (req, res) => {
  try {
    res.json(await listarCursos());
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/cursos', async (req, res) => {
  const nome = (req.body?.nome ?? '').trim();
  if (!nome) return res.status(400).json({ erro: 'Campo obrigatório: nome' });

  try {
    res.status(201).json(await inserirCurso(nome));
  } catch (e) {
    if (e.code === ERRO_DUPLICADO) {
      return res.status(409).json({ erro: 'Já existe um curso com esse nome' });
    }
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/cursos/:id', async (req, res) => {
  try {
    const apagado = await excluirCurso(req.params.id);
    if (!apagado.length) return res.status(404).json({ erro: 'Curso não encontrado' });
    res.json(apagado[0]);
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(409).json({
        erro: 'Não é possível excluir: este curso ainda tem alunos',
      });
    }
    res.status(400).json({ erro: e.message });
  }
});

// rota aninhada: os alunos de UM curso
app.get('/cursos/:id/alunos', async (req, res) => {
  try {
    res.json(await listarAlunosDoCurso(req.params.id));
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

// ===================== ALUNOS =====================

app.get('/alunos', async (req, res) => {
  try {
    res.json(await listarAlunos());
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.get('/alunos/:ra', async (req, res) => {
  try {
    const aluno = await buscarPorRa(req.params.ra);
    if (!aluno) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(aluno);
  } catch (e) {
    res.status(500).json({ erro: e.message });
  }
});

app.post('/alunos', async (req, res) => {
  const { nome, ra, curso_id } = req.body ?? {};
  if (!nome || !ra || !curso_id) {
    return res.status(400).json({ erro: 'Campos obrigatórios: nome, ra e curso_id' });
  }

  try {
    res.status(201).json(await inserirAluno(nome, ra, curso_id));
  } catch (e) {
    if (e.code === ERRO_DUPLICADO) {
      return res.status(409).json({ erro: 'Já existe um aluno com esse RA' });
    }
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(400).json({ erro: 'Este curso não existe' });
    }
    res.status(400).json({ erro: e.message });
  }
});

app.put('/alunos/:ra', async (req, res) => {
  const { nome, curso_id } = req.body ?? {};
  try {
    const atualizados = await atualizarAluno(req.params.ra, nome, curso_id);
    if (!atualizados.length) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(atualizados[0]);
  } catch (e) {
    if (e.code === ERRO_CHAVE_ESTRANGEIRA) {
      return res.status(400).json({ erro: 'Este curso não existe' });
    }
    res.status(400).json({ erro: e.message });
  }
});

app.delete('/alunos/:ra', async (req, res) => {
  try {
    const apagados = await excluirPorRa(req.params.ra);
    if (!apagados.length) return res.status(404).json({ erro: 'Aluno não encontrado' });
    res.json(apagados[0]);
  } catch (e) {
    res.status(400).json({ erro: e.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
