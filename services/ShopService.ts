import { supabase, isSupabaseConfigured } from './Supabase';
import { Logger } from './Logger';
import { UserSessionService } from './auth/UserSessionService';

interface DBShopItem {
  id: string;
  name: string;
  description: string;
  category: string;
  cost_gold: number;
  effect_type: string;
  effect_value: number;
  max_purchases: number;
  icon_key: string;
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  category: 'stat_upgrade' | 'class_unlock' | 'cosmetic';
  costGold: number;
  effectType: string;
  effectValue: number;
  maxPurchases: number;
  iconKey?: string;
  owned?: boolean; // Client-side hydration
}

export class ShopService {
  private static instance: ShopService | null = null;

  private constructor() {}

  static getInstance(): ShopService {
    ShopService.instance ??= new ShopService();
    return ShopService.instance;
  }

  /**
   * Fetch all shop items available
   */
  async getItems(): Promise<ShopItem[]> {
    if (!isSupabaseConfigured() || supabase === null) return [];

    const { data, error } = await supabase
      .from('shop_items')
      .select('*')
      .eq('is_active', true)
      .order('cost_gold', { ascending: true });

    if (error) {
      Logger.error('[ShopService] Failed to fetch shop items', error);
      return [];
    }

    return (data as unknown as DBShopItem[]).map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      category: item.category as 'stat_upgrade' | 'class_unlock' | 'cosmetic',
      costGold: item.cost_gold,
      effectType: item.effect_type,
      effectValue: item.effect_value,
      maxPurchases: item.max_purchases,
      iconKey: item.icon_key,
    }));
  }

  /**
   * Fetch player's inventory to check ownership
   */
  async getInventory(): Promise<string[]> {
    if (!isSupabaseConfigured() || supabase === null) return [];
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon-')) return [];

    const { data, error } = await supabase
      .from('profile_inventory')
      .select('item_id')
      .eq('profile_id', profileId);

    if (error) {
      Logger.error('[ShopService] Failed to fetch inventory', error);
      return [];
    }

    return (data as { item_id: string }[]).map(item => item.item_id);
  }

  /**
   * Purchase an item securely via Postgres Function
   */
  async purchaseItem(
    itemId: string
  ): Promise<{ success: boolean; error?: string; newBalance?: number }> {
    const profileId = UserSessionService.getProfileId();
    if (profileId.startsWith('anon-')) {
      return { success: false, error: 'Must be logged in to purchase' };
    }

    if (!isSupabaseConfigured() || supabase === null) {
      return { success: false, error: 'Supabase unavailable' };
    }

    try {
      const { data, error } = await supabase.rpc('purchase_item', {
        p_profile_id: profileId,
        p_item_id: itemId,
      });

      if (error) throw error;

      // RPC returns jsonb: { success: boolean, error?: string, balance_after?: number }
      // Explicitly checking properties safely
      const result = data as {
        success: boolean;
        error?: string;
        balance_after?: number;
      } | null;

      if (result?.success) {
        Logger.info(
          `[ShopService] Purchased ${itemId}, new balance: ${result.balance_after}`
        );
        return { success: true, newBalance: result.balance_after };
      } else {
        return { success: false, error: result?.error ?? 'Purchase failed' };
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      Logger.error('[ShopService] Purchase exception', err);
      return { success: false, error: msg };
    }
  }
}
