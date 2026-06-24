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
      categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      customers: {
        Row: {
          created_at: string
          document: string | null
          email: string | null
          full_name: string
          id: string
          interests: string | null
          location: string | null
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          document?: string | null
          email?: string | null
          full_name: string
          id?: string
          interests?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          document?: string | null
          email?: string | null
          full_name?: string
          id?: string
          interests?: string | null
          location?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fair_items: {
        Row: {
          created_at: string
          fair_id: string
          id: string
          product_id: string
          qty_returned: number
          qty_sent: number
          qty_sold: number
        }
        Insert: {
          created_at?: string
          fair_id: string
          id?: string
          product_id: string
          qty_returned?: number
          qty_sent?: number
          qty_sold?: number
        }
        Update: {
          created_at?: string
          fair_id?: string
          id?: string
          product_id?: string
          qty_returned?: number
          qty_sent?: number
          qty_sold?: number
        }
        Relationships: [
          {
            foreignKeyName: "fair_items_fair_id_fkey"
            columns: ["fair_id"]
            isOneToOne: false
            referencedRelation: "fairs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fair_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      fairs: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          location: string | null
          name: string
          notes: string | null
          starts_at: string | null
          warehouse_origin_id: string | null
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          starts_at?: string | null
          warehouse_origin_id?: string | null
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          starts_at?: string | null
          warehouse_origin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fairs_warehouse_origin_id_fkey"
            columns: ["warehouse_origin_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes: string | null
          product_id: string
          quantity: number
          reason: string | null
          related_sale_id: string | null
          warehouse_dest_id: string | null
          warehouse_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id: string
          quantity: number
          reason?: string | null
          related_sale_id?: string | null
          warehouse_dest_id?: string | null
          warehouse_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["movement_type"]
          notes?: string | null
          product_id?: string
          quantity?: number
          reason?: string | null
          related_sale_id?: string | null
          warehouse_dest_id?: string | null
          warehouse_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_dest_id_fkey"
            columns: ["warehouse_dest_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_stock: {
        Row: {
          id: string
          product_id: string
          quantity: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          id?: string
          product_id: string
          quantity?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          id?: string
          product_id?: string
          quantity?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_stock_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_stock_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          interest: string | null
          location: string | null
          message: string | null
          phone: string | null
          source: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          interest?: string | null
          location?: string | null
          message?: string | null
          phone?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          interest?: string | null
          location?: string | null
          message?: string | null
          phone?: string | null
          source?: string | null
        }
        Relationships: []
      }
      material_presentations: {
        Row: {
          created_at: string
          id: string
          label: string | null
          price: number
          product_id: string
          unit: Database["public"]["Enums"]["presentation_unit"]
          units_in_presentation: number
        }
        Insert: {
          created_at?: string
          id?: string
          label?: string | null
          price: number
          product_id: string
          unit: Database["public"]["Enums"]["presentation_unit"]
          units_in_presentation?: number
        }
        Update: {
          created_at?: string
          id?: string
          label?: string | null
          price?: number
          product_id?: string
          unit?: Database["public"]["Enums"]["presentation_unit"]
          units_in_presentation?: number
        }
        Relationships: [
          {
            foreignKeyName: "material_presentations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      news_posts: {
        Row: {
          category: Database["public"]["Enums"]["news_category"]
          content: string | null
          cover_image_url: string | null
          created_at: string
          cta_type: string | null
          cta_url: string | null
          id: string
          is_featured: boolean
          published_at: string | null
          related_product_id: string | null
          related_workshop_id: string | null
          slug: string
          status: Database["public"]["Enums"]["news_status"]
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          related_product_id?: string | null
          related_workshop_id?: string | null
          slug: string
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["news_category"]
          content?: string | null
          cover_image_url?: string | null
          created_at?: string
          cta_type?: string | null
          cta_url?: string | null
          id?: string
          is_featured?: boolean
          published_at?: string | null
          related_product_id?: string | null
          related_workshop_id?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["news_status"]
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_posts_related_product_id_fkey"
            columns: ["related_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt: string | null
          created_at: string
          id: string
          product_id: string
          sort_order: number
          url: string
        }
        Insert: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          url: string
        }
        Update: {
          alt?: string | null
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          artisan: string | null
          category_id: string | null
          color: string | null
          cost: number | null
          created_at: string
          description: string | null
          id: string
          internal_notes: string | null
          is_featured: boolean
          is_visible: boolean
          main_image_url: string | null
          material: string | null
          measurements: string | null
          min_stock: number | null
          name: string
          price: number
          short_description: string | null
          sku: string | null
          slug: string
          status: Database["public"]["Enums"]["product_status"]
          supplier: string | null
          type: Database["public"]["Enums"]["product_type"]
          updated_at: string
        }
        Insert: {
          artisan?: string | null
          category_id?: string | null
          color?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          is_featured?: boolean
          is_visible?: boolean
          main_image_url?: string | null
          material?: string | null
          measurements?: string | null
          min_stock?: number | null
          name: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug: string
          status?: Database["public"]["Enums"]["product_status"]
          supplier?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Update: {
          artisan?: string | null
          category_id?: string | null
          color?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          id?: string
          internal_notes?: string | null
          is_featured?: boolean
          is_visible?: boolean
          main_image_url?: string | null
          material?: string | null
          measurements?: string | null
          min_stock?: number | null
          name?: string
          price?: number
          short_description?: string | null
          sku?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["product_status"]
          supplier?: string | null
          type?: Database["public"]["Enums"]["product_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          location: string | null
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          location?: string | null
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          location?: string | null
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      receipts: {
        Row: {
          id: string
          issued_at: string
          number: string
          pdf_url: string | null
          sale_id: string
        }
        Insert: {
          id?: string
          issued_at?: string
          number: string
          pdf_url?: string | null
          sale_id: string
        }
        Update: {
          id?: string
          issued_at?: string
          number?: string
          pdf_url?: string | null
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: true
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_items: {
        Row: {
          created_at: string
          description: string | null
          discount: number
          id: string
          presentation_id: string | null
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          presentation_id?: string | null
          product_id: string
          quantity: number
          sale_id: string
          subtotal: number
          unit_price: number
        }
        Update: {
          created_at?: string
          description?: string | null
          discount?: number
          id?: string
          presentation_id?: string | null
          product_id?: string
          quantity?: number
          sale_id?: string
          subtotal?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_presentation_id_fkey"
            columns: ["presentation_id"]
            isOneToOne: false
            referencedRelation: "material_presentations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sale_payments: {
        Row: {
          amount: number
          evidence_url: string | null
          id: string
          method: Database["public"]["Enums"]["payment_method"]
          notes: string | null
          operation_code: string | null
          paid_at: string
          sale_id: string
        }
        Insert: {
          amount: number
          evidence_url?: string | null
          id?: string
          method: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          operation_code?: string | null
          paid_at?: string
          sale_id: string
        }
        Update: {
          amount?: number
          evidence_url?: string | null
          id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          notes?: string | null
          operation_code?: string | null
          paid_at?: string
          sale_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          confirmed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          delivery_status: Database["public"]["Enums"]["delivery_status"]
          discount: number
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          status: Database["public"]["Enums"]["sale_status"]
          subtotal: number
          total: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          discount?: number
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          confirmed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          delivery_status?: Database["public"]["Enums"]["delivery_status"]
          discount?: number
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          status?: Database["public"]["Enums"]["sale_status"]
          subtotal?: number
          total?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
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
      warehouses: {
        Row: {
          address: string | null
          code: string
          created_at: string
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      workshop_enrollments: {
        Row: {
          amount: number
          created_at: string
          customer_id: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          phone: string | null
          user_id: string | null
          workshop_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          user_id?: string | null
          workshop_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          customer_id?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          phone?: string | null
          user_id?: string | null
          workshop_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workshop_enrollments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workshop_enrollments_workshop_id_fkey"
            columns: ["workshop_id"]
            isOneToOne: false
            referencedRelation: "workshops"
            referencedColumns: ["id"]
          },
        ]
      }
      workshops: {
        Row: {
          capacity: number
          cover_image_url: string | null
          created_at: string
          description: string | null
          ends_at: string | null
          enrolled_count: number
          id: string
          is_visible: boolean
          level: Database["public"]["Enums"]["workshop_level"]
          location: string | null
          materials_included: string | null
          modality: Database["public"]["Enums"]["workshop_modality"]
          price: number
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["workshop_status"]
          title: string
          updated_at: string
        }
        Insert: {
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enrolled_count?: number
          id?: string
          is_visible?: boolean
          level?: Database["public"]["Enums"]["workshop_level"]
          location?: string | null
          materials_included?: string | null
          modality?: Database["public"]["Enums"]["workshop_modality"]
          price?: number
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["workshop_status"]
          title: string
          updated_at?: string
        }
        Update: {
          capacity?: number
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          ends_at?: string | null
          enrolled_count?: number
          id?: string
          is_visible?: boolean
          level?: Database["public"]["Enums"]["workshop_level"]
          location?: string | null
          materials_included?: string | null
          modality?: Database["public"]["Enums"]["workshop_modality"]
          price?: number
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["workshop_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "ventas" | "almacen" | "cliente"
      delivery_status:
        | "pendiente"
        | "en_preparacion"
        | "entregado"
        | "enviado"
        | "cancelado"
      movement_type:
        | "entrada"
        | "salida"
        | "transferencia"
        | "ajuste"
        | "venta"
        | "devolucion"
      news_category:
        | "evento"
        | "feria"
        | "taller"
        | "curso_nuevo"
        | "producto_nuevo"
        | "historia"
        | "inspiracion"
        | "promocion"
      news_status: "borrador" | "publicado" | "oculto"
      payment_method:
        | "efectivo"
        | "yape"
        | "plin"
        | "transferencia"
        | "tarjeta"
        | "mixto"
        | "otro"
      payment_status: "pendiente" | "parcial" | "pagado" | "anulado"
      presentation_unit:
        | "unidad"
        | "metro"
        | "rollo"
        | "madeja"
        | "paquete"
        | "docena"
        | "ciento"
        | "combo"
        | "otro"
      product_status: "disponible" | "por_encargo" | "agotado" | "reservado"
      product_type: "producto_terminado" | "material" | "kit" | "curso"
      sale_status: "borrador" | "confirmada" | "anulada"
      workshop_level: "basico" | "intermedio" | "avanzado"
      workshop_modality: "presencial" | "virtual" | "hibrido"
      workshop_status: "abierto" | "lleno" | "finalizado" | "cancelado"
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
      app_role: ["admin", "ventas", "almacen", "cliente"],
      delivery_status: [
        "pendiente",
        "en_preparacion",
        "entregado",
        "enviado",
        "cancelado",
      ],
      movement_type: [
        "entrada",
        "salida",
        "transferencia",
        "ajuste",
        "venta",
        "devolucion",
      ],
      news_category: [
        "evento",
        "feria",
        "taller",
        "curso_nuevo",
        "producto_nuevo",
        "historia",
        "inspiracion",
        "promocion",
      ],
      news_status: ["borrador", "publicado", "oculto"],
      payment_method: [
        "efectivo",
        "yape",
        "plin",
        "transferencia",
        "tarjeta",
        "mixto",
        "otro",
      ],
      payment_status: ["pendiente", "parcial", "pagado", "anulado"],
      presentation_unit: [
        "unidad",
        "metro",
        "rollo",
        "madeja",
        "paquete",
        "docena",
        "ciento",
        "combo",
        "otro",
      ],
      product_status: ["disponible", "por_encargo", "agotado", "reservado"],
      product_type: ["producto_terminado", "material", "kit", "curso"],
      sale_status: ["borrador", "confirmada", "anulada"],
      workshop_level: ["basico", "intermedio", "avanzado"],
      workshop_modality: ["presencial", "virtual", "hibrido"],
      workshop_status: ["abierto", "lleno", "finalizado", "cancelado"],
    },
  },
} as const
