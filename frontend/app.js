// Caminhos relativos: a página e a API são servidas pelo mesmo server.js.

const el = (id) => document.getElementById(id);

const statusEl = el('status');
const formCurso = el('form-curso');
const formAluno = el('form-aluno');
const btnSalvarAluno = el('btn-salvar-aluno');
const btnCancelar = el('btn-cancelar');
const btnAtualizar = el('btn-atualizar');
const filtroCurso = el('filtro-curso');
const tabelaAlunos = el('tabela-alunos');
const alunosStatus = el('alunos-status');
const sentinelaAlunos = el('sentinela-alunos');

// ===== Memória da lista que cresce ao rolar =====
// Ficam fora das funções para sobreviver de uma leva para a outra.
const ALUNOS_POR_PAGINA = 5;
let alunosInicio = 0;      // quantos alunos já estão desenhados
let alunosTotal = 0;       // quantos existem no filtro atual
let alunosTemMais = false; // ainda falta gente?
let alunosCarregando = false;
let alunosErro = false;
let alunosPedido = 0;      // número da busca que vale agora

let cursos = [];
let editandoRa = null; // RA do aluno em edição; null = cadastrando

function mostrarStatus(texto, tipo = '') {
  statusEl.textContent = texto;
  statusEl.className = tipo ? `status ${tipo}` : 'status';
}

// chamada à API: confere se a resposta é JSON antes de ler
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
  preencherSelect(filtroCurso, cursos, 'Todos os cursos');
  preencherSelect(el('aluno-curso'), cursos, 'Selecione um curso');
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

// preenche um select com os cursos, mantendo a escolha atual se ela ainda existir
function preencherSelect(select, lista, textoPadrao) {
  const valorAtual = select.value;

  select.innerHTML = '';
  const padrao = document.createElement('option');
  padrao.value = '';
  padrao.textContent = textoPadrao;
  select.appendChild(padrao);

  lista.forEach((curso) => {
    const opcao = document.createElement('option');
    opcao.value = curso.id;
    opcao.textContent = curso.nome;
    select.appendChild(opcao);
  });

  // se o curso escolhido foi excluído, volta para o padrão
  select.value = lista.some((c) => String(c.id) === valorAtual) ? valorAtual : '';
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

// acrescentar = false: busca nova (apaga a tabela e começa do zero)
// acrescentar = true:  a próxima leva, colada embaixo das que já estão
async function listarAlunos(acrescentar = false) {
  if (acrescentar && (alunosCarregando || !alunosTemMais)) return;

  const pedido = acrescentar ? alunosPedido : ++alunosPedido;
  const inicio = acrescentar ? alunosInicio : 0;

  if (!acrescentar) {
    alunosInicio = 0;
    alunosTotal = 0;
    alunosTemMais = false;
  }

  const cursoId = filtroCurso.value;
  const base = cursoId ? `/cursos/${cursoId}/alunos` : '/alunos';

  alunosCarregando = true;
  alunosErro = false;
  atualizarRodape();

  try {
    const dados = await api(`${base}?inicio=${inicio}&limite=${ALUNOS_POR_PAGINA}`);

    // resposta de uma busca antiga (o usuário já trocou o filtro): descarta
    if (pedido !== alunosPedido) return;

    const alunos = dados.alunos || [];
    alunosTotal = dados.total || 0;

    if (!acrescentar) tabelaAlunos.innerHTML = '';

    if (!alunosTotal) {
      tabelaAlunos.innerHTML = '';
      tabelaAlunos.appendChild(linhaVazia('Nenhum aluno para mostrar.'));
      alunosTemMais = false;
      return;
    }

    alunos.forEach((aluno) => tabelaAlunos.appendChild(linhaAluno(aluno)));

    alunosInicio = inicio + alunos.length;
    alunosTemMais = alunosInicio < alunosTotal;
  } catch (e) {
    if (pedido !== alunosPedido) return;
    alunosErro = true;
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  } finally {
    if (pedido === alunosPedido) {
      alunosCarregando = false;
      atualizarRodape();
      pedirMaisSeVisivel(); // se o marcador já está na tela, carrega a próxima leva
    }
  }
}

function atualizarRodape() {
  if (alunosErro) {
    alunosStatus.textContent = 'A lista não carregou. Use Atualizar lista para tentar de novo.';
  } else if (alunosCarregando && !alunosInicio) {
    alunosStatus.textContent = 'Carregando...';
  } else if (!alunosTotal) {
    alunosStatus.textContent = alunosCarregando ? 'Carregando...' : 'Nenhum aluno para mostrar.';
  } else if (alunosTemMais) {
    alunosStatus.textContent = alunosCarregando
      ? `Mostrando ${alunosInicio} de ${alunosTotal}. Carregando mais...`
      : `Mostrando ${alunosInicio} de ${alunosTotal}. Role a tela para carregar mais.`;
  } else {
    alunosStatus.textContent = `Mostrando ${alunosTotal} de ${alunosTotal}. Fim da lista.`;
  }
}

// dispara a próxima leva quando o marcador chega perto da borda de baixo
function pedirMaisSeVisivel() {
  if (!alunosTemMais || alunosCarregando) return;
  const topo = sentinelaAlunos.getBoundingClientRect().top;
  if (topo <= window.innerHeight + 160) listarAlunos(true);
}

window.addEventListener('scroll', pedirMaisSeVisivel);
window.addEventListener('resize', pedirMaisSeVisivel);

function linhaVazia(texto) {
  const tr = document.createElement('tr');
  const td = document.createElement('td');
  td.colSpan = 4;
  td.className = 'vazio';
  td.textContent = texto;
  tr.appendChild(td);
  return tr;
}

function linhaAluno(aluno) {
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
  return tr;
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
    await atualizarTudo(); // a contagem de alunos por curso também muda
  } catch (e) {
    mostrarStatus(`Erro: ${e.message}`, 'erro');
  }
}

async function excluirAluno(aluno) {
  if (!confirm(`Excluir o aluno "${aluno.nome}" (RA ${aluno.ra})?`)) return;

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

// 1º os cursos (preenchem os selects), 2º os alunos (já usam o filtro preenchido)
async function atualizarTudo() {
  await carregarCursos();
  await listarAlunos(false);
}

formCurso.addEventListener('submit', criarCurso);
formAluno.addEventListener('submit', salvarAluno);
btnCancelar.addEventListener('click', sairEdicao);
btnAtualizar.addEventListener('click', () => atualizarTudo().catch((e) => mostrarStatus(`Erro: ${e.message}`, 'erro')));
filtroCurso.addEventListener('change', () => listarAlunos(false));

atualizarTudo().catch((e) => mostrarStatus(`Erro: ${e.message}`, 'erro'));