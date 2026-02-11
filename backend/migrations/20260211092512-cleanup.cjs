"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {

    // ATENÇÃO: remoção de colunas órfãs (opcional / perigoso)

    /** DROP ORPHAN (revise!) */
    await queryInterface.removeColumn("servicos_juridicos", "aola");
  },

  async down(queryInterface, Sequelize) {
    /** TODO: rollback orphan servicos_juridicos.aola (definir tipo manualmente) */
  },
};
