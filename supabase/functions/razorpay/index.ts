import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Razorpay from "https://esm.sh/razorpay@2.9.2";
import crypto from "https://deno.land/std@0.168.0/node/crypto.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const razorpay = new Razorpay({
      key_id: Deno.env.get('RAZORPAY_KEY_ID'),
      key_secret: Deno.env.get('RAZORPAY_KEY_SECRET'),
    });

    const url = new URL(req.url);
    const body = await req.json();

    // ROUTE: Create Order
    if (body.action === 'create-order') {
      const { items } = body;
      
      // Calculate total securely from database
      let totalAmount = 0;
      for (const item of items) {
        const { data: menuItem } = await supabase
          .from('menu')
          .select('price')
          .eq('name', item.name)
          .single();
          
        if (menuItem) {
          totalAmount += menuItem.price * item.quantity;
        }
      }
      
      const deliveryCharge = 50;
      const grandTotal = totalAmount + deliveryCharge;

      const orderOptions = {
        amount: grandTotal * 100, // amount in paise
        currency: "INR",
        receipt: `receipt_${Date.now()}`
      };

      const order = await razorpay.orders.create(orderOptions);
      return new Response(JSON.stringify(order), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ROUTE: Verify Signature
    if (body.action === 'debug') {
      const { data, error } = await supabase.from('users').insert({
        id: '00000000-0000-0000-0000-000000000000', // invalid uuid but let's see if it complains about foreign key first or columns
        name: 'test',
        email: 'test@test.com',
        role: 'customer'
      });
      return new Response(JSON.stringify({ data, error }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (body.action === 'verify') {
      const { 
        razorpay_order_id, 
        razorpay_payment_id, 
        razorpay_signature, 
        orderDetails 
      } = body;

      const secret = Deno.env.get('RAZORPAY_KEY_SECRET');
      if (!secret) {
        return new Response(JSON.stringify({ success: false, message: 'Server configuration error: missing Razorpay secret' }), { 
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest('hex');

      if (generatedSignature === razorpay_signature) {
        // Save order securely using Service Role
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
          return new Response(JSON.stringify({ success: false, message: 'Missing Authorization header' }), { 
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }
        
        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
          return new Response(JSON.stringify({ success: false, message: 'Unauthorized: ' + (authError?.message || 'User not found') }), { 
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        const { data: newOrder, error: insertError } = await supabase
          .from('orders')
          .insert({
            user_id: user.id,
            items: orderDetails.items,
            total_amount: orderDetails.totalAmount,
            delivery_charge: orderDetails.deliveryCharge,
            grand_total: orderDetails.grandTotal,
            delivery_details: orderDetails.deliveryDetails,
            payment_status: 'paid',
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature
          })
          .select()
          .single();

        if (insertError) {
          return new Response(JSON.stringify({ success: false, message: 'Failed to save order: ' + insertError.message }), { 
            status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          });
        }

        return new Response(JSON.stringify({ success: true, order: newOrder }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      } else {
        return new Response(JSON.stringify({ success: false, message: 'Invalid signature' }), { 
          status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { 
      status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
