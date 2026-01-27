const { User, sequelize } = require('./models/user');
const bcrypt = require('bcrypt');

async function reset() {
    try {
        await sequelize.authenticate();
        const adminEmail = 'hugocor0609@gmail.com';
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('123', salt);

        const result = await User.update(
            { password: hashedPassword },
            { where: { email: adminEmail } }
        );

        if (result[0] > 0) {
            console.log('✅ Password reset to "123" for AdminPrueba');
        } else {
            console.log('❌ AdminPrueba not found');
        }
        process.exit(0);
    } catch (e) {
        console.error('❌ Error:', e);
        process.exit(1);
    }
}

reset();
