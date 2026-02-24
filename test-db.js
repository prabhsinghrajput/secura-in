const { createClient } = require('@supabase/supabase-js');

async function testConnection() {
    console.log('Testing connection with URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);

    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Attempting to fetch user admin01...');
    const start = Date.now();

    try {
        const { data, error } = await supabaseAdmin
            .from('users')
            .select('*')
            .eq('uid_eid', 'admin01')
            .single();

        const duration = Date.now() - start;
        console.log(`Query took ${duration}ms`);

        if (error) {
            console.error('Connection Error:', error.message);
        } else if (data) {
            console.log('Success! Found user:', data.uid_eid);
            console.log('Role:', data.role);
        } else {
            console.log('Query finished but no data found.');
        }
    } catch (err) {
        console.error('Unhandled Exception:', err.message);
    }
}

testConnection();
