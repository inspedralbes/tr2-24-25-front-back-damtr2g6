const { User, sequelize } = require('./models/user');

async function check() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to MySQL');
        const users = await User.findAll({
            attributes: ['id', 'username', 'email', 'center_code', 'role', 'isVerified', 'isApproved']
        });
        console.log('👥 Users in database:');
        console.table(users.map(u => u.toJSON()));
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

check();
