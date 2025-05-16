import User from '../models/user.model'; // Adjust path as necessary
import bcrypt from 'bcryptjs';

const initializeAdmin = async () => {
    try {
        const adminEmail = process.env.ADMIN_EMAIL;
        const adminPassword = process.env.ADMIN_PASSWORD;
        const adminName = process.env.ADMIN_NAME || 'Admin';

        if (!adminEmail || !adminPassword) {
            // console.log('Default admin email or password not set in environment variables. Skipping admin initialization.');
            return;
        }

        // Check if an admin user already exists
        const existingAdmin = await User.findOne({ role: 'admin' });
        if (existingAdmin) {
            // console.log('Admin user already exists. Skipping admin initialization.');
            return;
        }

        // Check if a user with the default admin email already exists (even with a different role)
        const userWithDefaultEmail = await User.findOne({ email: adminEmail });
        if (userWithDefaultEmail) {
            console.warn(`User with email ${adminEmail} already exists but is not an admin. Please resolve manually or choose a different DEFAULT_ADMIN_EMAIL.`);
            return;
        }

        // console.log(`No admin user found. Creating default admin: ${adminName} <${adminEmail}>`);

        const newUser = new User({
            name: adminName,
            email: adminEmail,
            password: adminPassword, // The pre-save hook in user.model will hash this
            role: 'admin',
            // You might want to add emailVerified: true or similar if your model supports it
        });

        await newUser.save();
        // console.log(`Default admin user ${adminName} <${adminEmail}> created successfully.`);

    } catch (error) {
        // console.error('Error during admin initialization:', error);
        // Depending on the error, you might want to throw it or handle it gracefully
        throw error;
    }
};

export default initializeAdmin;