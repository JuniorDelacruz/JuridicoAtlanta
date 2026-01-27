import db from './models/index.js';

console.log('Todos os models carregados:', Object.keys(db));

// Verifica se User existe
if (db.User) {
  console.log('User model encontrado!');
  console.log('User é instância de Model?', db.User instanceof db.Sequelize.Model); // deve ser false, mas tem prototype
  console.log('Métodos do User:', Object.keys(db.User.prototype)); // deve mostrar findAll, findOne, create, etc.
} else {
  console.log('User NÃO foi exportado!');
}

// Testa uma query simples (se o BD estiver conectado)
(async () => {
  try {
    const test = await db.User.findAll({ limit: 1 });
    console.log('Teste query OK! Encontrou', test.length, 'usuários.');
  } catch (err) {
    console.error('Erro ao testar query:', err.message);
  }
})();