"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
        // Gerado automaticamente: colunas faltando no DB


        await queryInterface.addColumn("servicos_juridicos", "aola", {
            type: Sequelize.BOOLEAN,
            allowNull: false,
            defaultValue: true
        });
  },

  async down(queryInterface, Sequelize) {

        await queryInterface.removeColumn("servicos_juridicos", "aola");
  },
};
