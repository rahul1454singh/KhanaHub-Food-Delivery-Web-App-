const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function setupDeliveryBoys() {
  const boys = [1,2,3,4,5,6].map(i => ({ email: `db${i}@gmail.com`, password: 'password123', name: `Delivery Boy ${i}`, phone: `987654321${i}` }));
  for (const b of boys) {
    const { data: authData, error: authErr } = await supabase.auth.signUp({ email: b.email, password: b.password });
    if(authErr) { console.log('Auth Err for', b.email, authErr.message); continue; }
    
    if(authData.user) {
      console.log('Created auth user', b.email, authData.user.id);
      
      // Update public.users
      await supabase.from('users').update({ name: b.name, role: 'delivery_boy' }).eq('id', authData.user.id);
    }
  }
}
setupDeliveryBoys();
