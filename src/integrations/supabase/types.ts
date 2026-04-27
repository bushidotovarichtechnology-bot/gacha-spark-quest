export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      campaign_tiers: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          image_url: string
          label: string
          name: string
          probability_weight: number
          remaining: number
          sort_order: number
          total: number
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          image_url?: string
          label: string
          name: string
          probability_weight?: number
          remaining?: number
          sort_order?: number
          total?: number
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          image_url?: string
          label?: string
          name?: string
          probability_weight?: number
          remaining?: number
          sort_order?: number
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          is_hot: boolean
          price: number
          slug: string
          sort_order: number
          subcategory_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id: string
          image_url?: string
          is_active?: boolean
          is_hot?: boolean
          price?: number
          slug: string
          sort_order?: number
          subcategory_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          is_hot?: boolean
          price?: number
          slug?: string
          sort_order?: number
          subcategory_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          icon: string
          id: string
          image_url: string
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coin_gifts: {
        Row: {
          amount: number
          created_at: string
          error_message: string | null
          id: string
          message: string
          receiver_email: string
          receiver_id: string
          request_id: string | null
          sender_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          receiver_email?: string
          receiver_id: string
          request_id?: string | null
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          error_message?: string | null
          id?: string
          message?: string
          receiver_email?: string
          receiver_id?: string
          request_id?: string | null
          sender_id?: string
          status?: string
        }
        Relationships: []
      }
      coin_ledger: {
        Row: {
          amount: number
          balance_after: number | null
          created_at: string
          description: string
          entry_type: string
          id: string
          metadata: Json
          reference_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          created_at?: string
          description?: string
          entry_type: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          created_at?: string
          description?: string
          entry_type?: string
          id?: string
          metadata?: Json
          reference_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      coin_packages: {
        Row: {
          bonus_coins: number
          bonus_label: string
          coins: number
          created_at: string
          discount_end: string | null
          discount_percent: number
          discount_start: string | null
          icon: string
          id: string
          is_active: boolean
          is_popular: boolean
          name: string
          price: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_coins?: number
          bonus_label?: string
          coins: number
          created_at?: string
          discount_end?: string | null
          discount_percent?: number
          discount_start?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name: string
          price: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_coins?: number
          bonus_label?: string
          coins?: number
          created_at?: string
          discount_end?: string | null
          discount_percent?: number
          discount_start?: string | null
          icon?: string
          id?: string
          is_active?: boolean
          is_popular?: boolean
          name?: string
          price?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          replied_at: string | null
          reply: string | null
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          replied_at?: string | null
          reply?: string | null
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          replied_at?: string | null
          reply?: string | null
          subject?: string
        }
        Relationships: []
      }
      coupon_redemptions: {
        Row: {
          benefit_type: string
          benefit_value: number
          coupon_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          benefit_type: string
          benefit_value?: number
          coupon_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          benefit_type?: string
          benefit_value?: number
          coupon_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_id_fkey"
            columns: ["coupon_id"]
            isOneToOne: false
            referencedRelation: "coupons"
            referencedColumns: ["id"]
          },
        ]
      }
      coupons: {
        Row: {
          benefit_type: string
          benefit_value: number
          code: string
          created_at: string
          description: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          max_uses_per_user: number
          updated_at: string
          used_count: number
        }
        Insert: {
          benefit_type?: string
          benefit_value?: number
          code: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          max_uses_per_user?: number
          updated_at?: string
          used_count?: number
        }
        Update: {
          benefit_type?: string
          benefit_value?: number
          code?: string
          created_at?: string
          description?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          max_uses_per_user?: number
          updated_at?: string
          used_count?: number
        }
        Relationships: []
      }
      digital_codes: {
        Row: {
          assigned_at: string | null
          assigned_to_inventory_id: string | null
          assigned_to_user_id: string | null
          code: string
          created_at: string
          id: string
          prize_id: string
          status: string
        }
        Insert: {
          assigned_at?: string | null
          assigned_to_inventory_id?: string | null
          assigned_to_user_id?: string | null
          code: string
          created_at?: string
          id?: string
          prize_id: string
          status?: string
        }
        Update: {
          assigned_at?: string | null
          assigned_to_inventory_id?: string | null
          assigned_to_user_id?: string | null
          code?: string
          created_at?: string
          id?: string
          prize_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "digital_codes_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "tier_prizes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_codes_prize_id_fkey"
            columns: ["prize_id"]
            isOneToOne: false
            referencedRelation: "tier_prizes_public"
            referencedColumns: ["id"]
          },
        ]
      }
      draws: {
        Row: {
          campaign_id: string
          coin_value: number
          created_at: string
          id: string
          is_pity: boolean
          prize_name: string
          tier_label: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          coin_value?: number
          created_at?: string
          id?: string
          is_pity?: boolean
          prize_name: string
          tier_label: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          coin_value?: number
          created_at?: string
          id?: string
          is_pity?: boolean
          prize_name?: string
          tier_label?: string
          user_id?: string
        }
        Relationships: []
      }
      gacha_logs: {
        Row: {
          campaign_id: string
          created_at: string
          draw_count: number
          error_message: string | null
          id: string
          ip_address: string | null
          result_summary: Json
          status: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          draw_count?: number
          error_message?: string | null
          id?: string
          ip_address?: string | null
          result_summary?: Json
          status?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          draw_count?: number
          error_message?: string | null
          id?: string
          ip_address?: string | null
          result_summary?: Json
          status?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      indonesian_cities: {
        Row: {
          city: string
          created_at: string
          id: string
          province: string
        }
        Insert: {
          city: string
          created_at?: string
          id?: string
          province: string
        }
        Update: {
          city?: string
          created_at?: string
          id?: string
          province?: string
        }
        Relationships: []
      }
      pity_settings: {
        Row: {
          campaign_id: string
          created_at: string
          guaranteed_tier: string
          id: string
          is_enabled: boolean
          threshold: number
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          guaranteed_tier?: string
          id?: string
          is_enabled?: boolean
          threshold?: number
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          guaranteed_tier?: string
          id?: string
          is_enabled?: boolean
          threshold?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pity_settings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: true
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      prize_claims: {
        Row: {
          address: string
          campaign_id: string
          city: string
          coin_value: number
          courier_company: string | null
          courier_name: string | null
          courier_service: string | null
          created_at: string
          delivered_at: string | null
          destination_area_id: string | null
          id: string
          image_url: string
          notes: string | null
          payment_status: string
          phone: string
          postal_code: string
          prize_name: string
          province: string
          recipient_name: string
          shipped_at: string | null
          shipping_cost: number
          shipping_eta: string | null
          shipping_method: string
          shipping_order_id: string | null
          shipping_paid: boolean
          status: string
          tier_label: string
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address: string
          campaign_id: string
          city: string
          coin_value?: number
          courier_company?: string | null
          courier_name?: string | null
          courier_service?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_area_id?: string | null
          id?: string
          image_url?: string
          notes?: string | null
          payment_status?: string
          phone: string
          postal_code: string
          prize_name: string
          province: string
          recipient_name: string
          shipped_at?: string | null
          shipping_cost?: number
          shipping_eta?: string | null
          shipping_method?: string
          shipping_order_id?: string | null
          shipping_paid?: boolean
          status?: string
          tier_label: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string
          campaign_id?: string
          city?: string
          coin_value?: number
          courier_company?: string | null
          courier_name?: string | null
          courier_service?: string | null
          created_at?: string
          delivered_at?: string | null
          destination_area_id?: string | null
          id?: string
          image_url?: string
          notes?: string | null
          payment_status?: string
          phone?: string
          postal_code?: string
          prize_name?: string
          province?: string
          recipient_name?: string
          shipped_at?: string | null
          shipping_cost?: number
          shipping_eta?: string | null
          shipping_method?: string
          shipping_order_id?: string | null
          shipping_paid?: boolean
          status?: string
          tier_label?: string
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string
          avatar_url: string
          city: string
          created_at: string
          display_name: string
          id: string
          phone: string
          postal_code: string
          province: string
          recipient_name: string
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          address?: string
          avatar_url?: string
          city?: string
          created_at?: string
          display_name?: string
          id?: string
          phone?: string
          postal_code?: string
          province?: string
          recipient_name?: string
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          address?: string
          avatar_url?: string
          city?: string
          created_at?: string
          display_name?: string
          id?: string
          phone?: string
          postal_code?: string
          province?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      promo_banners: {
        Row: {
          created_at: string
          cta_label: string
          ends_at: string | null
          id: string
          image_url: string
          is_active: boolean
          link_url: string
          sort_order: number
          starts_at: string | null
          subtitle: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          ends_at?: string | null
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string
          sort_order?: number
          starts_at?: string | null
          subtitle?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      redeem_claims: {
        Row: {
          created_at: string
          id: string
          reward_id: string
          reward_name: string
          status: string
          tickets_spent: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          reward_id: string
          reward_name: string
          status?: string
          tickets_spent: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          reward_id?: string
          reward_name?: string
          status?: string
          tickets_spent?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redeem_claims_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "redeem_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      redeem_rewards: {
        Row: {
          created_at: string
          description: string
          id: string
          image_url: string
          is_active: boolean
          name: string
          sort_order: number
          stock: number
          ticket_cost: number
          ticket_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name: string
          sort_order?: number
          stock?: number
          ticket_cost?: number
          ticket_type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          stock?: number
          ticket_cost?: number
          ticket_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      redeem_tickets: {
        Row: {
          campaign_id: string
          created_at: string
          draw_id: string
          id: string
          quantity: number
          remaining: number
          ticket_type: string
          user_id: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          draw_id: string
          id?: string
          quantity?: number
          remaining?: number
          ticket_type?: string
          user_id: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          draw_id?: string
          id?: string
          quantity?: number
          remaining?: number
          ticket_type?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          created_at: string
          express_eta: string
          express_price: number
          id: string
          provinces: string[]
          regular_eta: string
          regular_price: number
          same_day_available: boolean
          same_day_eta: string
          same_day_price: number
          updated_at: string
          zone_name: string
          zone_number: number
        }
        Insert: {
          created_at?: string
          express_eta?: string
          express_price?: number
          id?: string
          provinces?: string[]
          regular_eta?: string
          regular_price?: number
          same_day_available?: boolean
          same_day_eta?: string
          same_day_price?: number
          updated_at?: string
          zone_name: string
          zone_number: number
        }
        Update: {
          created_at?: string
          express_eta?: string
          express_price?: number
          id?: string
          provinces?: string[]
          regular_eta?: string
          regular_price?: number
          same_day_available?: boolean
          same_day_eta?: string
          same_day_price?: number
          updated_at?: string
          zone_name?: string
          zone_number?: number
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          image_url: string
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          image_url?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          image_url?: string
          name?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_prizes: {
        Row: {
          auto_refill: boolean
          coin_value: number
          created_at: string
          description: string
          id: string
          image_url: string
          is_digital: boolean
          name: string
          probability_weight: number
          remaining: number
          sort_order: number
          tier_id: string
          total: number
          weight_grams: number
        }
        Insert: {
          auto_refill?: boolean
          coin_value?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_digital?: boolean
          name: string
          probability_weight?: number
          remaining?: number
          sort_order?: number
          tier_id: string
          total?: number
          weight_grams?: number
        }
        Update: {
          auto_refill?: boolean
          coin_value?: number
          created_at?: string
          description?: string
          id?: string
          image_url?: string
          is_digital?: boolean
          name?: string
          probability_weight?: number
          remaining?: number
          sort_order?: number
          tier_id?: string
          total?: number
          weight_grams?: number
        }
        Relationships: [
          {
            foreignKeyName: "tier_prizes_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "campaign_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_prizes_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "campaign_tiers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      trade_history: {
        Row: {
          created_at: string
          error_reason: string | null
          gas_fee: number
          id: string
          initiator_id: string
          initiator_ip: string | null
          items_exchanged: Json
          outcome: string
          responder_id: string | null
          responder_ip: string | null
          tier_label: string | null
          trade_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          error_reason?: string | null
          gas_fee?: number
          id?: string
          initiator_id: string
          initiator_ip?: string | null
          items_exchanged?: Json
          outcome: string
          responder_id?: string | null
          responder_ip?: string | null
          tier_label?: string | null
          trade_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          error_reason?: string | null
          gas_fee?: number
          id?: string
          initiator_id?: string
          initiator_ip?: string | null
          items_exchanged?: Json
          outcome?: string
          responder_id?: string | null
          responder_ip?: string | null
          tier_label?: string | null
          trade_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      trades: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          initiator_id: string
          initiator_ip: string | null
          initiator_items: Json
          initiator_user_agent: string | null
          message: string
          recipient_id: string | null
          responded_at: string | null
          responder_id: string | null
          responder_items: Json
          review_expires_at: string | null
          status: string
          tier_label: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          initiator_id: string
          initiator_ip?: string | null
          initiator_items?: Json
          initiator_user_agent?: string | null
          message?: string
          recipient_id?: string | null
          responded_at?: string | null
          responder_id?: string | null
          responder_items?: Json
          review_expires_at?: string | null
          status?: string
          tier_label: string
          token: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          initiator_id?: string
          initiator_ip?: string | null
          initiator_items?: Json
          initiator_user_agent?: string | null
          message?: string
          recipient_id?: string | null
          responded_at?: string | null
          responder_id?: string | null
          responder_items?: Json
          review_expires_at?: string | null
          status?: string
          tier_label?: string
          token?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          coins: number
          created_at: string
          id: string
          order_id: string
          package_id: string
          payment_type: string | null
          snap_token: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          coins: number
          created_at?: string
          id?: string
          order_id: string
          package_id: string
          payment_type?: string | null
          snap_token?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          coins?: number
          created_at?: string
          id?: string
          order_id?: string
          package_id?: string
          payment_type?: string | null
          snap_token?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coins: {
        Row: {
          active_discount_percent: number
          balance: number
          ban_reason: string
          banned_at: string | null
          created_at: string
          draws_since_tier_a: number
          free_draws: number
          id: string
          is_banned: boolean
          last_draw_at: string | null
          last_draw_ip: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          active_discount_percent?: number
          balance?: number
          ban_reason?: string
          banned_at?: string | null
          created_at?: string
          draws_since_tier_a?: number
          free_draws?: number
          id?: string
          is_banned?: boolean
          last_draw_at?: string | null
          last_draw_ip?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          active_discount_percent?: number
          balance?: number
          ban_reason?: string
          banned_at?: string | null
          created_at?: string
          draws_since_tier_a?: number
          free_draws?: number
          id?: string
          is_banned?: boolean
          last_draw_at?: string | null
          last_draw_ip?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_inventory: {
        Row: {
          campaign_id: string
          campaign_name: string
          coin_value: number
          created_at: string
          digital_code: string | null
          id: string
          image_url: string
          prize_name: string
          tier_label: string
          user_id: string
          won_at: string
        }
        Insert: {
          campaign_id?: string
          campaign_name?: string
          coin_value?: number
          created_at?: string
          digital_code?: string | null
          id?: string
          image_url?: string
          prize_name: string
          tier_label: string
          user_id: string
          won_at?: string
        }
        Update: {
          campaign_id?: string
          campaign_name?: string
          coin_value?: number
          created_at?: string
          digital_code?: string | null
          id?: string
          image_url?: string
          prize_name?: string
          tier_label?: string
          user_id?: string
          won_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_security_pins: {
        Row: {
          created_at: string
          pin_hash: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          pin_hash: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          pin_hash?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      campaign_tiers_public: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string | null
          image_url: string | null
          label: string | null
          name: string | null
          sort_order: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          label?: string | null
          name?: string | null
          sort_order?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string | null
          image_url?: string | null
          label?: string | null
          name?: string | null
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_tiers_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      tier_prizes_public: {
        Row: {
          auto_refill: boolean | null
          coin_value: number | null
          created_at: string | null
          description: string | null
          id: string | null
          image_url: string | null
          is_sold_out: boolean | null
          name: string | null
          sort_order: number | null
          tier_id: string | null
          weight_grams: number | null
        }
        Insert: {
          auto_refill?: boolean | null
          coin_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_sold_out?: never
          name?: string | null
          sort_order?: number | null
          tier_id?: string | null
          weight_grams?: number | null
        }
        Update: {
          auto_refill?: boolean | null
          coin_value?: number | null
          created_at?: string | null
          description?: string | null
          id?: string | null
          image_url?: string | null
          is_sold_out?: never
          name?: string | null
          sort_order?: number | null
          tier_id?: string | null
          weight_grams?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tier_prizes_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "campaign_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tier_prizes_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "campaign_tiers_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_coins_admin: {
        Row: {
          active_discount_percent: number | null
          balance: number | null
          ban_reason: string | null
          banned_at: string | null
          created_at: string | null
          draws_since_tier_a: number | null
          free_draws: number | null
          id: string | null
          is_banned: boolean | null
          last_draw_at: string | null
          last_draw_ip: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          active_discount_percent?: number | null
          balance?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          draws_since_tier_a?: number | null
          free_draws?: number | null
          id?: string | null
          is_banned?: boolean | null
          last_draw_at?: string | null
          last_draw_ip?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          active_discount_percent?: number | null
          balance?: number | null
          ban_reason?: string | null
          banned_at?: string | null
          created_at?: string | null
          draws_since_tier_a?: number | null
          free_draws?: number | null
          id?: string | null
          is_banned?: boolean | null
          last_draw_at?: string | null
          last_draw_ip?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      _internal_execute_trade: {
        Args: {
          _action: string
          _caller_id: string
          _caller_ip: string
          _responder_items: Json
          _trade_id: string
          _user_agent: string
        }
        Returns: Json
      }
      _rate_up_multiplier: { Args: { _user_id: string }; Returns: number }
      admin_get_banned_users: {
        Args: never
        Returns: {
          ban_reason: string
          banned_at: string
          email: string
          last_draw_at: string
          total_draws: number
          user_id: string
        }[]
      }
      admin_get_digital_code_stats: {
        Args: { _prize_id: string }
        Returns: Json
      }
      admin_set_user_banned: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: Json
      }
      admin_upload_digital_codes: {
        Args: { _codes: string[]; _prize_id: string }
        Returns: Json
      }
      expire_pending_transactions: { Args: never; Returns: number }
      expire_stale_trades: { Args: never; Returns: number }
      expire_unpaid_claims: { Args: never; Returns: number }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
      find_user_id_by_username: { Args: { _username: string }; Returns: string }
      generate_trade_token: { Args: never; Returns: string }
      get_admin_stats: { Args: never; Returns: Json }
      get_all_users_admin: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
        }[]
      }
      get_campaign_stock_summary: {
        Args: { _campaign_ids: string[] }
        Returns: {
          campaign_id: string
          is_sold_out: boolean
          remaining_bucket: string
          tier_id: string
          tier_label: string
          total_bucket: number
        }[]
      }
      get_grand_prize_winners: {
        Args: { lim?: number }
        Returns: {
          avatar_url: string
          campaign_id: string
          campaign_title: string
          display_name: string
          draw_id: string
          prize_name: string
          user_id: string
          won_at: string
        }[]
      }
      get_pity_trend: {
        Args: { days_back?: number }
        Returns: {
          date: string
          pity_count: number
        }[]
      }
      get_popular_campaigns: {
        Args: { lim?: number }
        Returns: {
          campaign_id: string
          campaign_title: string
          draw_count: number
        }[]
      }
      get_prize_availability: {
        Args: { _campaign_id: string }
        Returns: {
          is_sold_out: boolean
          prize_id: string
          tier_id: string
        }[]
      }
      get_rate_up_status: { Args: { _user_id?: string }; Returns: Json }
      get_tier_distribution: {
        Args: { _campaign_id: string; _limit?: number }
        Returns: {
          draw_count: number
          tier_label: string
          total_draws: number
        }[]
      }
      get_trade_item_details: {
        Args: { _trade_id: string }
        Returns: {
          coin_value: number
          image_url: string
          item_id: string
          prize_name: string
          side: string
          tier_label: string
        }[]
      }
      get_user_ticket_balance: {
        Args: { _user_id: string }
        Returns: {
          ticket_type: string
          total_remaining: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_security_pin: { Args: never; Returns: boolean }
      is_username_available: { Args: { _username: string }; Returns: boolean }
      recycle_inventory_item: { Args: { _item_id: string }; Returns: Json }
      redeem_coupon_atomic: { Args: { _code: string }; Returns: Json }
      redeem_reward: { Args: { _reward_id: string }; Returns: Json }
      secure_draw: {
        Args: { _campaign_id: string; _draw_count: number }
        Returns: Json
      }
      set_security_pin: { Args: { _pin: string }; Returns: Json }
      set_username: { Args: { _username: string }; Returns: Json }
      slugify: { Args: { _input: string }; Returns: string }
      transfer_gift_coins: {
        Args: { _amount: number; _receiver_id: string }
        Returns: Json
      }
      verify_security_pin: {
        Args: { _pin: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
