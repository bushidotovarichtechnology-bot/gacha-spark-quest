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
          name: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          sort_order?: number
        }
        Relationships: []
      }
      coin_gifts: {
        Row: {
          amount: number
          created_at: string
          id: string
          message: string
          receiver_email: string
          receiver_id: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          message?: string
          receiver_email?: string
          receiver_id: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          message?: string
          receiver_email?: string
          receiver_id?: string
          sender_id?: string
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
          name: string
          sort_order: number
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          name: string
          sort_order?: number
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
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
        ]
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_banned_users: {
        Args: never
        Returns: {
          ban_reason: string
          banned_at: string
          email: string
          user_id: string
        }[]
      }
      admin_set_user_banned: {
        Args: { _banned: boolean; _reason?: string; _user_id: string }
        Returns: Json
      }
      expire_pending_transactions: { Args: never; Returns: number }
      expire_unpaid_claims: { Args: never; Returns: number }
      find_user_id_by_email: { Args: { _email: string }; Returns: string }
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
      redeem_reward: { Args: { _reward_id: string }; Returns: Json }
      secure_draw: {
        Args: { _campaign_id: string; _draw_count: number }
        Returns: Json
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
