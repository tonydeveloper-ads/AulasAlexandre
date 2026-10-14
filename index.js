const {
  inserirAluno, listarAlunos, buscarPorRa,
  buscarPorNome, atualizarCurso, excluirPorRa,
} = require('./supabase');

// main() é async porque TODAS as funções de banco são assíncronas
// (cada await pausa até a promise ser resolvida antes de continuar)
async function main() {
  try {
    // 1) tenta cadastrar - dentro de um try/catch próprio, porque
    // um RA duplicado não deve derrubar o resto do script
    try {
      const novo = await inserirAluno('Maria Silva', '2024001', 'ADS');
      console.log('Inserido com sucesso:', novo);
    } catch (e) {
      console.log('Não inseriu (talvez RA já existia):', e.message || e);
    }

    const todos = await listarAlunos();
    console.log('Total:', `${todos.length}`, todos);

    const um = await buscarPorRa('2024001');
    console.log(um ?? 'Não encontrado');

    const atualizados = await atualizarCurso('2024001', 'Gestão Comercial');
    console.log(atualizados);

    const filtrados = await buscarPorNome('Maria');
    console.log(filtrados);

    // DELETE fica comentado até você ter certeza de que quer apagado
    // const apagado = await excluirPorRa('2024001');

  } catch (err) {
    // captura qualquer erro geral: rede, chave inválida, RLS bloqueando...
    console.error('ERRO GERAL:', err.message || err);
  }
}

main();  // dispara a função principal - sem isso, nada roda