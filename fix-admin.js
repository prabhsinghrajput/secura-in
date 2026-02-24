const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function fixCredentials() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const ID = 'admin01';
    const PASS = 'admin123';
    const newHash = bcrypt.hashSync(PASS, 10);

    console.log('Repairing credentials for:', ID);
    console.log('New Hash:', newHash);

    try {
        // 1. Delete existing user (cascade handles employee profile)
        await supabase.from('users').delete().eq('uid_eid', ID);

        // 2. Insert User
        const { error: userError } = await supabase.from('users').insert({
            uid_eid: ID,
            role: 'admin',
            password_hash: newHash
        });
        if (userError) throw userError;

        // 3. Insert Employee (profile)
        const { error: empError } = await supabase.from('employees').insert({
            eid: ID,
            name: 'System Administrator',
            designation: 'Admin',
            department: 'IT',
            email: 'admin@rkade.in'
        });
        if (empError) throw empError;

        console.log('SUCCESS: Admin user reset with password "admin123"');
    } catch (err) {
        console.error('FAILED:', err.message);
    }
}

fixCredentials();
