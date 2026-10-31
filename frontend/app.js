// Usa caminhos relativos: a página e a API são servidas pelo mesmo server.js,
// então não precisa de URL nem porta fixas aqui.

const el = (id) => document.getElementById(id);

const statusEl = el('status');
const formCurso = el('form-curso');
const formAluno = el('form-aluno');
const btnSalvarAluno = el('btn-salvar-aluno');
const btnCancelar = el('btn-cancelar');

let cursos = [];
let editandoRa = null; // RA do aluno em edição; null = cadastrando um novo

function mostrarStatus(texto, tipo = '') {
  statusEl.textContent = texto;
  statusEl.className = tipo ? `status ${tipo}` : 'status';
}

// chamada à API que checa se a resposta é JSON antes de ler
async function api(url, opcoes = {}) {
  const resposta = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...opcoes,
  });

  const texto = await resposta.text();
  let dados = null;

  try {
    dados = texto ? JSON.parse(texto) : null;
  } catch {
    throw new Error(
      `O servidor respondeu HTML (HTTP ${resposta.status}) em vez de JSON. ` +
      'Confira se a API está rodando (npm start) e se a rota existe.'
    );
  }

  if (!resposta.ok) {
    throw new Error(dados?.erro || `Erro HTTP ${resposta.status}`);
  }
  return dados;
}

// ================= CURSOS (lado 1) =================

async function carregarCursos() {
  cursos = await api('/cursos');
  renderizarCursos();
  preencherSelectCursos();
}

function renderizarCursos() {
  const ul = el('lista-cursos');
  ul.innerHTML = '';

  if (!cursos.length) {
    ul.innerHTML = '<li class="vazio">Nenhum curso cadastrado.</li>';
    return;
  }

  cursos.forEach((curso) => {
    const li = document.createElement('li');

    const info = document.createElement('span');
    info.textContent = `${curso.nome} · ${curso.total_alunos} aluno(s)`;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn perigo pequeno';
    btn.textContent = 'Excluir';
    btn.addEventListener('click', () => excluirCurso(curso));

    li.append(info, btn);
    ul.appendChild(li);
  });
}

// o select de alunos mostra os cursos cadastrados e guarda o id no value
function preencherSelectCursos() {
  const select = el('aluno-curso');
  const valorAtual = select.value;

  select.innerHTML = '<option value="">Selecione um curso</option>';
  cursos.forEach((curso) => {
    const opcao = document.createElement('option');
    opcao.value = curso.id;
    opcao.textContent = curso.nome;
    select.appendChild(opcao);
  });

  select.value = valorAtual;
}

async function criarCurso(evento) {
  evento.preventDefault();
  const nome = el('curso-nome').value.trim();
  if (!nome) return mostrarStatus('Informe o nome do curso.', 'erro');

  try {
    await api('/cursos', { method: 'POST', body: JSON.stringify({ nome }) });
    el('curso-nome').value = '';
    mostrarStatus('Curso cadastrado.', 'ok');
    await atualizarTudo();
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

async function excluirCurso(curso) {
  if (!confirm(`Excluir o curso "${curso.nome}"?`)) return;

  try {
    await api(`/cursos/${curso.id}`, { method: 'DELETE' });
    mostrarStatus('Curso excluído.', 'ok');
    await atualizarTudo();
  } catch (e) {
    // curso com alunos: a API responde 409 com a mensagem pronta
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

// ================= ALUNOS (lado N) =================

async function carregarAlunos() {
  const alunos = await api('/alunos');
  const tbody = el('tabela-alunos');
  tbody.innerHTML = '';

  if (!alunos.length) {
    tbody.innerHTML = '<tr><td colspan="4" class="vazio">Nenhum aluno cadastrado.</td></tr>';
    return;
  }

  alunos.forEach((aluno) => {
    const tr = document.createElement('tr');

    // textContent evita que nome digitado seja lido como HTML
    [aluno.nome, aluno.ra, aluno.curso?.nome ?? '—'].forEach((texto) => {
      const td = document.createElement('td');
      td.textContent = texto;
      tr.appendChild(td);
    });

    const tdAcoes = document.createElement('td');
    tdAcoes.className = 'col-acoes';

    const btnEditar = document.createElement('button');
    btnEditar.type = 'button';
    btnEditar.className = 'btn ghost pequeno';
    btnEditar.textContent = 'Editar';
    btnEditar.addEventListener('click', () => entrarEdicao(aluno));

    const btnExcluir = document.createElement('button');
    btnExcluir.type = 'button';
    btnExcluir.className = 'btn perigo pequeno';
    btnExcluir.textContent = 'Excluir';
    btnExcluir.addEventListener('click', () => excluirAluno(aluno));

    tdAcoes.append(btnEditar, ' ', btnExcluir);
    tr.appendChild(tdAcoes);
    tbody.appendChild(tr);
  });
}

function entrarEdicao(aluno) {
  editandoRa = aluno.ra;
  el('aluno-nome').value = aluno.nome;
  el('aluno-ra').value = aluno.ra;
  el('aluno-ra').disabled = true; // o RA identifica o aluno, não muda
  el('aluno-curso').value = aluno.curso_id;
  btnSalvarAluno.textContent = 'Salvar alterações';
  btnCancelar.hidden = false;
  el('aluno-nome').focus();
}

function sairEdicao() {
  editandoRa = null;
  formAluno.reset();
  el('aluno-ra').disabled = false;
  btnSalvarAluno.textContent = 'Salvar aluno';
  btnCancelar.hidden = true;
}

async function salvarAluno(evento) {
  evento.preventDefault();

  const nome = el('aluno-nome').value.trim();
  const ra = el('aluno-ra').value.trim();
  const curso_id = Number(el('aluno-curso').value); // '' vira 0, que é falso

  if (!nome || !ra || !curso_id) {
    return mostrarStatus('Preencha nome, RA e curso.', 'erro');
  }

  try {
    if (editandoRa) {
      await api(`/alunos/${encodeURIComponent(editandoRa)}`, {
        method: 'PUT',
        body: JSON.stringify({ nome, curso_id }),
      });
      mostrarStatus('Aluno atualizado.', 'ok');
    } else {
      await api('/alunos', {
        method: 'POST',
        body: JSON.stringify({ nome, ra, curso_id }),
      });
      mostrarStatus('Aluno cadastrado.', 'ok');
    }

    sairEdicao();
    await atualizarTudo();
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

async function excluirAluno(aluno) {
  if (!confirm(`Excluir o aluno "${aluno.nome}"?`)) return;

  try {
    await api(`/alunos/${encodeURIComponent(aluno.ra)}`, { method: 'DELETE' });
    if (editandoRa === aluno.ra) sairEdicao();
    mostrarStatus('Aluno excluído.', 'ok');
    await atualizarTudo();
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

// ================= INICIALIZAÇÃO =================

async function atualizarTudo() {
  await carregarCursos();
  await carregarAlunos();
}

formCurso.addEventListener('submit', criarCurso);
formAluno.addEventListener('submit', salvarAluno);
btnCancelar.addEventListener('click', sairEdicao);

atualizarTudo().catch((e) => mostrarStatus(`Erro: ${e.message}`, 'erro'));
