// Demo no terminal: CRUD de alunos ligados a um curso (1:N), sem subir o servidor
const {
  inserirCurso, listarCursos, inserirAluno, listarAlunos,
  buscarPorRa, buscarPorNome, atualizarAluno,
} = require('./supabase');

async function main() {
  try {
    // 1) garante que o curso ADS existe e pega o id dele
    const cursos = await listarCursos();
    let ads = cursos.find((c) => c.nome === 'ADS');
    if (!ads) ads = await inserirCurso('ADS');
    console.log('Curso ADS:', ads);

    // 2) cadastra o aluno; RA repetido não derruba o script
    try {
      const novo = await inserirAluno('Maria Silva', '2024001', ads.id);
      console.log('Inserido:', novo);
    } catch (e) {
      console.log('Não inseriu (talvez RA já existia):', e.message || e);
    }

    const todos = await listarAlunos();
    console.log(`Total: ${todos.length}`, todos);

    console.log('Por RA:', (await buscarPorRa('2024001')) ?? 'Não encontrado');

    const atualizados = await atualizarAluno('2024001', undefined, ads.id);
    console.log('Atualizado:', atualizados);

    console.log('Busca por nome "Maria":', await buscarPorNome('Maria'));
  } catch (err) {
    console.error('ERRO GERAL:', err.message || err);
  }
}

main();
