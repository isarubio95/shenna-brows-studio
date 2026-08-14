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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      order_items: {
        Row: {
          created_at: string | null
          id: string
          order_id: string
          product_id: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id: string
          product_id?: string | null
          product_name: string
          quantity?: number
          unit_price?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string
          product_id?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          code: string
          created_at: string
          description: string | null
          discount_type: string
          discount_value: number
          ends_at: string | null
          first_order_only: boolean
          id: string
          is_active: boolean
          is_welcome_offer: boolean
          max_uses: number | null
          max_uses_per_email: number | null
          min_subtotal: number | null
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value: number
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          is_welcome_offer?: boolean
          max_uses?: number | null
          max_uses_per_email?: number | null
          min_subtotal?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          discount_type?: string
          discount_value?: number
          ends_at?: string | null
          first_order_only?: boolean
          id?: string
          is_active?: boolean
          is_welcome_offer?: boolean
          max_uses?: number | null
          max_uses_per_email?: number | null
          min_subtotal?: number | null
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          correos_shipment_code: string | null
          created_at: string | null
          customer_tax_id: string | null
          discount_amount: number | null
          discount_code: string | null
          discount_code_id: string | null
          email: string
          id: string
          invoice_requested: boolean
          pending_cart_snapshot: Json | null
          redsys_auth_code: string | null
          refund_status: string
          returned: boolean
          shipped_at: string | null
          shipping: number | null
          shipping_address: Json | null
          status: string
          stripe_session_id: string | null
          subtotal: number | null
          total: number | null
          user_id: string | null
        }
        Insert: {
          correos_shipment_code?: string | null
          created_at?: string | null
          customer_tax_id?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          discount_code_id?: string | null
          email: string
          id?: string
          invoice_requested?: boolean
          pending_cart_snapshot?: Json | null
          redsys_auth_code?: string | null
          refund_status?: string
          returned?: boolean
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
        }
        Update: {
          correos_shipment_code?: string | null
          created_at?: string | null
          customer_tax_id?: string | null
          discount_amount?: number | null
          discount_code?: string | null
          discount_code_id?: string | null
          email?: string
          invoice_requested?: boolean
          id?: string
          pending_cart_snapshot?: Json | null
          redsys_auth_code?: string | null
          refund_status?: string
          returned?: boolean
          shipped_at?: string | null
          shipping?: number | null
          shipping_address?: Json | null
          status?: string
          stripe_session_id?: string | null
          subtotal?: number | null
          total?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      return_requests: {
        Row: {
          admin_note: string | null
          created_at: string
          customer_note: string | null
          id: string
          order_id: string
          reason: string
          refunded_amount: number | null
          refunded_at: string | null
          requested_amount: number | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          customer_note?: string | null
          id?: string
          order_id: string
          reason: string
          refunded_amount?: number | null
          refunded_at?: string | null
          requested_amount?: number | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          customer_note?: string | null
          id?: string
          order_id?: string
          reason?: string
          refunded_amount?: number | null
          refunded_at?: string | null
          requested_amount?: number | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "return_requests_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      newsletter_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_subscribed: boolean
          privacy_accepted_at: string
          source: string
          unsubscribed_at: string | null
          updated_at: string
          user_id: string | null
          welcome_coupon_sent_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_subscribed?: boolean
          privacy_accepted_at?: string
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
          welcome_coupon_sent_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_subscribed?: boolean
          privacy_accepted_at?: string
          source?: string
          unsubscribed_at?: string | null
          updated_at?: string
          user_id?: string | null
          welcome_coupon_sent_at?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          category: string
          color_variants: Json
          created_at: string | null
          description: string | null
          id: string
          image_url: string | null
          is_on_sale: boolean
          is_pack: boolean
          materials: string | null
          materials_label: string | null
          name: string
          price: number
          sale_price: number | null
          shipping_info: string | null
          slug: string
          stock: number
          stripe_price_id: string | null
          tagline: string | null
          updated_at: string | null
        }
        Insert: {
          category: string
          color_variants?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_on_sale?: boolean
          is_pack?: boolean
          materials?: string | null
          materials_label?: string | null
          name: string
          price?: number
          sale_price?: number | null
          shipping_info?: string | null
          slug: string
          stock?: number
          stripe_price_id?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Update: {
          category?: string
          color_variants?: Json
          created_at?: string | null
          description?: string | null
          id?: string
          image_url?: string | null
          is_on_sale?: boolean
          is_pack?: boolean
          materials?: string | null
          materials_label?: string | null
          name?: string
          price?: number
          sale_price?: number | null
          shipping_info?: string | null
          slug?: string
          stock?: number
          stripe_price_id?: string | null
          tagline?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          city: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          user_id: string
          zip_code: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          user_id: string
          zip_code?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          user_id?: string
          zip_code?: string | null
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: string | null
          id: string
          key: string
          title: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string | null
          id?: string
          key: string
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string | null
          id?: string
          key?: string
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      testimonials: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_featured: boolean | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_featured?: boolean | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public_view: {
        Row: {
          content: string | null
          created_at: string | null
          full_name: string | null
          is_featured: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "customer"
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
      app_role: ["admin", "customer"],
    },
  },
} as const
