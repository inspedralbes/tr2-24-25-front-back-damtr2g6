const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

// Configuración de la conexión (usa los datos del docker-compose)
const sequelize = new Sequelize('datos', 'root', '1234', {
  host: 'db', // Nombre del servicio en Docker
  dialect: 'mysql'
});

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  hooks: {
    // Antes de crear el usuario, ciframos la contraseña
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    }
  }
});

module.exports = { User, sequelize };