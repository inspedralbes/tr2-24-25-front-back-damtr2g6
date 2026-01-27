const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');
require('dotenv').config();

// Configuración de la conexión (AHORA ES DINÁMICA)
// Intenta leer del .env. Si no encuentra nada, usa los valores fijos (el 'fallback')
const sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'datos',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_PASSWORD || '1234',
  {
    host: process.env.MYSQL_HOST || 'db',
    dialect: 'mysql',
  }
);

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  center_code: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  verificationCode: {
    type: DataTypes.STRING,
    allowNull: true
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'teacher', // 'teacher' || 'admin'
    allowNull: false
  },
  isApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  }
}, {
  hooks: {
    // Antes de crear el usuario, ciframos la contraseña
    beforeCreate: async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
    },
    beforeUpdate: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }

  }
});

module.exports = { User, sequelize };