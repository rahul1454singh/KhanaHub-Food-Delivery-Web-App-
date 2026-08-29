import { supabase } from './supabase';

const GLOBAL_CHANNEL_NAME = 'khanahub_global_realtime';

let globalChannel = null;

export const getGlobalRealtimeChannel = () => {
  if (!globalChannel) {
    globalChannel = supabase.channel(GLOBAL_CHANNEL_NAME, {
      config: {
        broadcast: { ack: false }
      }
    });
    globalChannel.subscribe((status) => {
      console.log(`[RealtimeHub] Channel subscription status:`, status);
    });
  }
  return globalChannel;
};

// Broadcast an order event across all open tabs/clients instantly
export const broadcastOrderUpdate = async (event, payload) => {
  try {
    const channel = getGlobalRealtimeChannel();
    await channel.send({
      type: 'broadcast',
      event: event || 'order_updated',
      payload: payload || {}
    });
  } catch (err) {
    console.warn('[RealtimeHub] broadcast failed:', err);
  }
};
