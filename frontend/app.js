// URL base da API
const API_URL = 'http://localhost:3000';

// Elementos da página
const formAluno = document.getElementById('form-aluno');
const listaEl = document.getElementById('lista');
const statusEl = document.getElementById('status');
const logEl = document.getElementById('log');

// Função para mostrar status
function mostrarStatus(texto, tipo = '') {
  statusEl.textContent = texto;
  statusEl.className = tipo ? `status ${tipo}` : 'status';
}

// Função para renderizar lista de alunos
function rendenizarLista(alunos) {
  listaEl.innerHTML = '';
  alunos.forEach(aluno => {
    const li = document.createElement('li');
    li.textContent = `${aluno.nome} (${aluno.ra}) - ${aluno.curso}`;
    listaEl.appendChild(li);
  });
}

// Função para listar alunos
async function listarAlunos() {
  try {
    const resposta = await fetch(`${API_URL}/alunos`);
    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Falha ao listar alunos');
    }

    rendenizarLista(dados);
    mostrarStatus('Lista carregada com sucesso!', 'ok');
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

// Função para inserir aluno
async function inserirAluno(nome, ra, curso) {
  try {
    const resposta = await fetch(`${API_URL}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome, ra, curso }),
    });

    const dados = await resposta.json();

    if (!resposta.ok) {
      throw new Error(dados.erro || 'Falha ao inserir aluno');
    }

    mostrarStatus('Aluno inserido com sucesso!', 'ok');
    listarAlunos(); // atualiza lista
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

// Listener do formulário
formAluno.addEventListener('submit', async (event) => {
  event.preventDefault();
  const nome = formAluno.nome.value.trim();
  const ra = formAluno.ra.value.trim();
  const curso = formAluno.curso.value.trim();

  if (!nome || !ra) {
    mostrarStatus('Nome e RA são obrigatórios!', 'erro');
    return;
  }

  await inserirAluno(nome, ra, curso);
  formAluno.reset();
});

// Inicializa carregando lista
listarAlunos();
