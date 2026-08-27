export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.17";
  };
  public: {
    Tables: {
      calendar_event_audit: {
        Row: {
          action: string;
          event_id: string;
          id: string;
          new_values: Json | null;
          old_values: Json | null;
          performed_at: string;
          performed_by: string;
          reason: string | null;
        };
        Insert: {
          action: string;
          event_id: string;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          performed_at?: string;
          performed_by: string;
          reason?: string | null;
        };
        Update: {
          action?: string;
          event_id?: string;
          id?: string;
          new_values?: Json | null;
          old_values?: Json | null;
          performed_at?: string;
          performed_by?: string;
          reason?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_event_audit_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "calendar_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_event_audit_performed_by_fkey";
            columns: ["performed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      calendar_event_types: {
        Row: {
          color: string;
          created_at: string;
          default_duration_minutes: number | null;
          icon: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          color: string;
          created_at?: string;
          default_duration_minutes?: number | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          color?: string;
          created_at?: string;
          default_duration_minutes?: number | null;
          icon?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      calendar_events: {
        Row: {
          address: string | null;
          cancellation_reason: string | null;
          cancelled_at: string | null;
          conflict_force_reason: string | null;
          conflict_forced: boolean;
          created_at: string;
          created_by: string;
          customer_id: string | null;
          ends_at: string;
          event_type_id: string;
          id: string;
          modality: string;
          notes: string | null;
          preparation_minutes: number;
          product_id: string | null;
          responsible_user_id: string;
          sale_id: string | null;
          starts_at: string;
          status: string;
          timezone: string;
          title: string;
          travel_minutes: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          conflict_force_reason?: string | null;
          conflict_forced?: boolean;
          created_at?: string;
          created_by: string;
          customer_id?: string | null;
          ends_at: string;
          event_type_id: string;
          id?: string;
          modality?: string;
          notes?: string | null;
          preparation_minutes?: number;
          product_id?: string | null;
          responsible_user_id: string;
          sale_id?: string | null;
          starts_at: string;
          status?: string;
          timezone?: string;
          title: string;
          travel_minutes?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          cancellation_reason?: string | null;
          cancelled_at?: string | null;
          conflict_force_reason?: string | null;
          conflict_forced?: boolean;
          created_at?: string;
          created_by?: string;
          customer_id?: string | null;
          ends_at?: string;
          event_type_id?: string;
          id?: string;
          modality?: string;
          notes?: string | null;
          preparation_minutes?: number;
          product_id?: string | null;
          responsible_user_id?: string;
          sale_id?: string | null;
          starts_at?: string;
          status?: string;
          timezone?: string;
          title?: string;
          travel_minutes?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "calendar_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_event_type_id_fkey";
            columns: ["event_type_id"];
            isOneToOne: false;
            referencedRelation: "calendar_event_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_responsible_user_id_fkey";
            columns: ["responsible_user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "calendar_events_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          is_active: boolean;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          slug?: string;
          sort_order?: number;
        };
        Relationships: [];
      };
      commerce_audit_logs: {
        Row: {
          action: string;
          actor_user_id: string | null;
          after_data: Json | null;
          aggregate_id: string | null;
          aggregate_type: string;
          before_data: Json | null;
          created_at: string;
          id: string;
          ip_address: unknown;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor_user_id?: string | null;
          after_data?: Json | null;
          aggregate_id?: string | null;
          aggregate_type: string;
          before_data?: Json | null;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor_user_id?: string | null;
          after_data?: Json | null;
          aggregate_id?: string | null;
          aggregate_type?: string;
          before_data?: Json | null;
          created_at?: string;
          id?: string;
          ip_address?: unknown;
          reason?: string | null;
        };
        Relationships: [];
      };
      commerce_settings: {
        Row: {
          created_at: string;
          default_web_warehouse_id: string | null;
          id: boolean;
          izipay_easypay_public_url: string | null;
          lima_delivery_enabled: boolean;
          order_expiration_minutes: number;
          pending_payment_message: string;
          pickup_enabled: boolean;
          pickup_instructions: string | null;
          reservation_minutes: number;
          updated_at: string;
          updated_by: string | null;
          whatsapp_coordination_enabled: boolean;
          whatsapp_coordination_message: string;
          whatsapp_coordination_number: string | null;
          whatsapp_service_hours: string | null;
          whatsapp_service_instructions: string | null;
        };
        Insert: {
          created_at?: string;
          default_web_warehouse_id?: string | null;
          id?: boolean;
          izipay_easypay_public_url?: string | null;
          lima_delivery_enabled?: boolean;
          order_expiration_minutes?: number;
          pending_payment_message?: string;
          pickup_enabled?: boolean;
          pickup_instructions?: string | null;
          reservation_minutes?: number;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_coordination_enabled?: boolean;
          whatsapp_coordination_message?: string;
          whatsapp_coordination_number?: string | null;
          whatsapp_service_hours?: string | null;
          whatsapp_service_instructions?: string | null;
        };
        Update: {
          created_at?: string;
          default_web_warehouse_id?: string | null;
          id?: boolean;
          izipay_easypay_public_url?: string | null;
          lima_delivery_enabled?: boolean;
          order_expiration_minutes?: number;
          pending_payment_message?: string;
          pickup_enabled?: boolean;
          pickup_instructions?: string | null;
          reservation_minutes?: number;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp_coordination_enabled?: boolean;
          whatsapp_coordination_message?: string;
          whatsapp_coordination_number?: string | null;
          whatsapp_service_hours?: string | null;
          whatsapp_service_instructions?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "commerce_settings_default_web_warehouse_id_fkey";
            columns: ["default_web_warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      complaint_book_entries: {
        Row: {
          address: string;
          admin_notes: string | null;
          claim_date: string;
          claim_detail: string;
          claim_number: string;
          claim_type: string;
          claimed_amount: number | null;
          consumption_date: string | null;
          consumption_type: string;
          contact_authorization: boolean;
          created_at: string;
          customer_request: string;
          department: string;
          district: string;
          document_number: string;
          document_type: string;
          email: string;
          expiration_date: string | null;
          first_name: string;
          first_surname: string;
          id: string;
          order_number: string;
          phone: string;
          product_description: string | null;
          provider: string | null;
          province: string;
          purchase_date: string | null;
          reference: string | null;
          second_surname: string;
          status: string;
          sworn_declaration: boolean;
          updated_at: string;
        };
        Insert: {
          address: string;
          admin_notes?: string | null;
          claim_date: string;
          claim_detail: string;
          claim_number: string;
          claim_type: string;
          claimed_amount?: number | null;
          consumption_date?: string | null;
          consumption_type: string;
          contact_authorization?: boolean;
          created_at?: string;
          customer_request: string;
          department: string;
          district: string;
          document_number: string;
          document_type: string;
          email: string;
          expiration_date?: string | null;
          first_name: string;
          first_surname: string;
          id?: string;
          order_number: string;
          phone: string;
          product_description?: string | null;
          provider?: string | null;
          province: string;
          purchase_date?: string | null;
          reference?: string | null;
          second_surname: string;
          status?: string;
          sworn_declaration?: boolean;
          updated_at?: string;
        };
        Update: {
          address?: string;
          admin_notes?: string | null;
          claim_date?: string;
          claim_detail?: string;
          claim_number?: string;
          claim_type?: string;
          claimed_amount?: number | null;
          consumption_date?: string | null;
          consumption_type?: string;
          contact_authorization?: boolean;
          created_at?: string;
          customer_request?: string;
          department?: string;
          district?: string;
          document_number?: string;
          document_type?: string;
          email?: string;
          expiration_date?: string | null;
          first_name?: string;
          first_surname?: string;
          id?: string;
          order_number?: string;
          phone?: string;
          product_description?: string | null;
          provider?: string | null;
          province?: string;
          purchase_date?: string | null;
          reference?: string | null;
          second_surname?: string;
          status?: string;
          sworn_declaration?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      customers: {
        Row: {
          created_at: string;
          document: string | null;
          email: string | null;
          full_name: string;
          id: string;
          interests: string | null;
          location: string | null;
          notes: string | null;
          phone: string | null;
          source: string | null;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          interests?: string | null;
          location?: string | null;
          notes?: string | null;
          phone?: string | null;
          source?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          created_at?: string;
          document?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          interests?: string | null;
          location?: string | null;
          notes?: string | null;
          phone?: string | null;
          source?: string | null;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [];
      };
      delivery_methods: {
        Row: {
          code: string;
          created_at: string;
          fee: number;
          id: string;
          instructions: string | null;
          is_active: boolean;
          kind: Database["public"]["Enums"]["delivery_kind"];
          name: string;
          sort_order: number;
          updated_at: string;
          zone_id: string | null;
        };
        Insert: {
          code: string;
          created_at?: string;
          fee?: number;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          kind: Database["public"]["Enums"]["delivery_kind"];
          name: string;
          sort_order?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Update: {
          code?: string;
          created_at?: string;
          fee?: number;
          id?: string;
          instructions?: string | null;
          is_active?: boolean;
          kind?: Database["public"]["Enums"]["delivery_kind"];
          name?: string;
          sort_order?: number;
          updated_at?: string;
          zone_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_methods_zone_id_fkey";
            columns: ["zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_zone_districts: {
        Row: {
          created_at: string;
          delivery_zone_id: string;
          department: string;
          district: string;
          id: string;
          is_active: boolean;
          normalized_district: string | null;
          province: string;
          ubigeo: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          delivery_zone_id: string;
          department?: string;
          district: string;
          id?: string;
          is_active?: boolean;
          normalized_district?: string | null;
          province?: string;
          ubigeo?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          delivery_zone_id?: string;
          department?: string;
          district?: string;
          id?: string;
          is_active?: boolean;
          normalized_district?: string | null;
          province?: string;
          ubigeo?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "delivery_zone_districts_delivery_zone_id_fkey";
            columns: ["delivery_zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
        ];
      };
      delivery_zones: {
        Row: {
          base_fee: number;
          code: string;
          created_at: string;
          districts: string[];
          estimated_time: string | null;
          id: string;
          is_active: boolean;
          name: string;
          notes: string | null;
          requires_coordination: boolean;
          scope: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          base_fee?: number;
          code: string;
          created_at?: string;
          districts?: string[];
          estimated_time?: string | null;
          id?: string;
          is_active?: boolean;
          name: string;
          notes?: string | null;
          requires_coordination?: boolean;
          scope?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          base_fee?: number;
          code?: string;
          created_at?: string;
          districts?: string[];
          estimated_time?: string | null;
          id?: string;
          is_active?: boolean;
          name?: string;
          notes?: string | null;
          requires_coordination?: boolean;
          scope?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      fair_items: {
        Row: {
          created_at: string;
          fair_id: string;
          id: string;
          product_id: string;
          qty_returned: number;
          qty_sent: number;
          qty_sold: number;
        };
        Insert: {
          created_at?: string;
          fair_id: string;
          id?: string;
          product_id: string;
          qty_returned?: number;
          qty_sent?: number;
          qty_sold?: number;
        };
        Update: {
          created_at?: string;
          fair_id?: string;
          id?: string;
          product_id?: string;
          qty_returned?: number;
          qty_sent?: number;
          qty_sold?: number;
        };
        Relationships: [
          {
            foreignKeyName: "fair_items_fair_id_fkey";
            columns: ["fair_id"];
            isOneToOne: false;
            referencedRelation: "fairs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fair_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      fairs: {
        Row: {
          created_at: string;
          ends_at: string | null;
          id: string;
          location: string | null;
          name: string;
          notes: string | null;
          starts_at: string | null;
          warehouse_origin_id: string | null;
        };
        Insert: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          name: string;
          notes?: string | null;
          starts_at?: string | null;
          warehouse_origin_id?: string | null;
        };
        Update: {
          created_at?: string;
          ends_at?: string | null;
          id?: string;
          location?: string | null;
          name?: string;
          notes?: string | null;
          starts_at?: string | null;
          warehouse_origin_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "fairs_warehouse_origin_id_fkey";
            columns: ["warehouse_origin_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_movements: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          notes: string | null;
          presentation_id: string | null;
          product_id: string;
          quantity: number;
          reason: string | null;
          related_sale_id: string | null;
          warehouse_dest_id: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type: Database["public"]["Enums"]["movement_type"];
          notes?: string | null;
          presentation_id?: string | null;
          product_id: string;
          quantity: number;
          reason?: string | null;
          related_sale_id?: string | null;
          warehouse_dest_id?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: string;
          movement_type?: Database["public"]["Enums"]["movement_type"];
          notes?: string | null;
          presentation_id?: string | null;
          product_id?: string;
          quantity?: number;
          reason?: string | null;
          related_sale_id?: string | null;
          warehouse_dest_id?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_movements_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_warehouse_dest_id_fkey";
            columns: ["warehouse_dest_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_movements_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_reservations: {
        Row: {
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          order_id: string;
          order_item_id: string;
          presentation_id: string | null;
          product_id: string;
          quantity: number;
          released_at: string | null;
          status: Database["public"]["Enums"]["inventory_reservation_status"];
          warehouse_id: string;
        };
        Insert: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          order_id: string;
          order_item_id: string;
          presentation_id?: string | null;
          product_id: string;
          quantity: number;
          released_at?: string | null;
          status?: Database["public"]["Enums"]["inventory_reservation_status"];
          warehouse_id: string;
        };
        Update: {
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          order_id?: string;
          order_item_id?: string;
          presentation_id?: string | null;
          product_id?: string;
          quantity?: number;
          released_at?: string | null;
          status?: Database["public"]["Enums"]["inventory_reservation_status"];
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_reservations_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_order_item_id_fkey";
            columns: ["order_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_reservations_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      inventory_stock: {
        Row: {
          id: string;
          presentation_id: string | null;
          product_id: string;
          quantity: number;
          updated_at: string;
          warehouse_id: string;
        };
        Insert: {
          id?: string;
          presentation_id?: string | null;
          product_id: string;
          quantity?: number;
          updated_at?: string;
          warehouse_id: string;
        };
        Update: {
          id?: string;
          presentation_id?: string | null;
          product_id?: string;
          quantity?: number;
          updated_at?: string;
          warehouse_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "inventory_stock_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_stock_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "inventory_stock_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      leads: {
        Row: {
          created_at: string;
          email: string | null;
          full_name: string;
          id: string;
          interest: string | null;
          location: string | null;
          message: string | null;
          phone: string | null;
          source: string | null;
        };
        Insert: {
          created_at?: string;
          email?: string | null;
          full_name: string;
          id?: string;
          interest?: string | null;
          location?: string | null;
          message?: string | null;
          phone?: string | null;
          source?: string | null;
        };
        Update: {
          created_at?: string;
          email?: string | null;
          full_name?: string;
          id?: string;
          interest?: string | null;
          location?: string | null;
          message?: string | null;
          phone?: string | null;
          source?: string | null;
        };
        Relationships: [];
      };
      manual_images: {
        Row: {
          alt_text: string | null;
          created_at: string;
          id: string;
          image_url: string;
          manual_id: string;
          order_index: number;
          storage_path: string | null;
        };
        Insert: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url: string;
          manual_id: string;
          order_index?: number;
          storage_path?: string | null;
        };
        Update: {
          alt_text?: string | null;
          created_at?: string;
          id?: string;
          image_url?: string;
          manual_id?: string;
          order_index?: number;
          storage_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "manual_images_manual_id_fkey";
            columns: ["manual_id"];
            isOneToOne: false;
            referencedRelation: "manuals";
            referencedColumns: ["id"];
          },
        ];
      };
      manual_materials: {
        Row: {
          created_at: string;
          id: string;
          manual_id: string;
          material_id: string;
          material_presentation_id: string | null;
          notes: string | null;
          quantity: number;
          unit: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          manual_id: string;
          material_id: string;
          material_presentation_id?: string | null;
          notes?: string | null;
          quantity?: number;
          unit?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          manual_id?: string;
          material_id?: string;
          material_presentation_id?: string | null;
          notes?: string | null;
          quantity?: number;
          unit?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "manual_materials_manual_id_fkey";
            columns: ["manual_id"];
            isOneToOne: false;
            referencedRelation: "manuals";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manual_materials_material_id_fkey";
            columns: ["material_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "manual_materials_material_presentation_id_fkey";
            columns: ["material_presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
        ];
      };
      manuals: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          measurements: string | null;
          notes: string | null;
          piece_id: string;
          quantity: number;
          title: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          measurements?: string | null;
          notes?: string | null;
          piece_id: string;
          quantity?: number;
          title: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          measurements?: string | null;
          notes?: string | null;
          piece_id?: string;
          quantity?: number;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "manuals_piece_id_fkey";
            columns: ["piece_id"];
            isOneToOne: true;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      material_presentations: {
        Row: {
          cost: number | null;
          created_at: string;
          id: string;
          label: string | null;
          price: number;
          product_id: string;
          sku: string | null;
          unit: Database["public"]["Enums"]["presentation_unit"];
          units_in_presentation: number;
        };
        Insert: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          label?: string | null;
          price: number;
          product_id: string;
          sku?: string | null;
          unit: Database["public"]["Enums"]["presentation_unit"];
          units_in_presentation?: number;
        };
        Update: {
          cost?: number | null;
          created_at?: string;
          id?: string;
          label?: string | null;
          price?: number;
          product_id?: string;
          sku?: string | null;
          unit?: Database["public"]["Enums"]["presentation_unit"];
          units_in_presentation?: number;
        };
        Relationships: [
          {
            foreignKeyName: "material_presentations_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      news_posts: {
        Row: {
          category: Database["public"]["Enums"]["news_category"];
          content: string | null;
          cover_image_url: string | null;
          created_at: string;
          cta_type: string | null;
          cta_url: string | null;
          id: string;
          is_featured: boolean;
          published_at: string | null;
          related_product_id: string | null;
          related_workshop_id: string | null;
          slug: string;
          status: Database["public"]["Enums"]["news_status"];
          summary: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          category?: Database["public"]["Enums"]["news_category"];
          content?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          cta_type?: string | null;
          cta_url?: string | null;
          id?: string;
          is_featured?: boolean;
          published_at?: string | null;
          related_product_id?: string | null;
          related_workshop_id?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["news_status"];
          summary?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          category?: Database["public"]["Enums"]["news_category"];
          content?: string | null;
          cover_image_url?: string | null;
          created_at?: string;
          cta_type?: string | null;
          cta_url?: string | null;
          id?: string;
          is_featured?: boolean;
          published_at?: string | null;
          related_product_id?: string | null;
          related_workshop_id?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["news_status"];
          summary?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "news_posts_related_product_id_fkey";
            columns: ["related_product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_addresses: {
        Row: {
          additional_instructions: string | null;
          address_line: string;
          created_at: string;
          department: string;
          district: string;
          document_number: string | null;
          id: string;
          kind: string;
          order_id: string;
          phone: string | null;
          province: string;
          recipient_name: string;
          reference: string | null;
        };
        Insert: {
          additional_instructions?: string | null;
          address_line: string;
          created_at?: string;
          department: string;
          district: string;
          document_number?: string | null;
          id?: string;
          kind: string;
          order_id: string;
          phone?: string | null;
          province: string;
          recipient_name: string;
          reference?: string | null;
        };
        Update: {
          additional_instructions?: string | null;
          address_line?: string;
          created_at?: string;
          department?: string;
          district?: string;
          document_number?: string | null;
          id?: string;
          kind?: string;
          order_id?: string;
          phone?: string | null;
          province?: string;
          recipient_name?: string;
          reference?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_addresses_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          discount: number;
          id: string;
          item_type: Database["public"]["Enums"]["order_item_type"];
          kit_mode: string | null;
          line_number: number;
          name_snapshot: string;
          order_id: string;
          presentation_id: string | null;
          product_id: string | null;
          quantity: number;
          related_course_item_id: string | null;
          requires_inventory: boolean;
          sku_snapshot: string | null;
          subtotal: number;
          tax_amount: number;
          unit_price: number;
          variant: Json;
          workshop_id: string | null;
        };
        Insert: {
          created_at?: string;
          discount?: number;
          id?: string;
          item_type: Database["public"]["Enums"]["order_item_type"];
          kit_mode?: string | null;
          line_number: number;
          name_snapshot: string;
          order_id: string;
          presentation_id?: string | null;
          product_id?: string | null;
          quantity: number;
          related_course_item_id?: string | null;
          requires_inventory?: boolean;
          sku_snapshot?: string | null;
          subtotal: number;
          tax_amount?: number;
          unit_price: number;
          variant?: Json;
          workshop_id?: string | null;
        };
        Update: {
          created_at?: string;
          discount?: number;
          id?: string;
          item_type?: Database["public"]["Enums"]["order_item_type"];
          kit_mode?: string | null;
          line_number?: number;
          name_snapshot?: string;
          order_id?: string;
          presentation_id?: string | null;
          product_id?: string | null;
          quantity?: number;
          related_course_item_id?: string | null;
          requires_inventory?: boolean;
          sku_snapshot?: string | null;
          subtotal?: number;
          tax_amount?: number;
          unit_price?: number;
          variant?: Json;
          workshop_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_related_course_item_id_fkey";
            columns: ["related_course_item_id"];
            isOneToOne: false;
            referencedRelation: "order_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          access_token_hash: string;
          billing_fiscal_address: string | null;
          billing_legal_name: string | null;
          billing_ruc: string | null;
          cart_fingerprint: string;
          checkout_key: string;
          code: string;
          created_at: string;
          currency: string;
          customer_id: string | null;
          delivery_contacted_at: string | null;
          delivery_coordination_status:
            | Database["public"]["Enums"]["delivery_coordination_status"]
            | null;
          delivery_district_snapshot: string | null;
          delivery_fee_cents: number;
          delivery_method_id: string | null;
          delivery_method_snapshot: string;
          delivery_notes: string | null;
          delivery_responsible: string | null;
          delivery_scheduled_at: string | null;
          delivery_time_window: string | null;
          delivery_zone_district_id: string | null;
          delivery_zone_id: string | null;
          delivery_zone_name_snapshot: string | null;
          discount_total: number;
          document_number: string | null;
          document_type: string | null;
          email: string;
          expires_at: string;
          first_name: string;
          id: string;
          last_name: string;
          phone: string;
          privacy_accepted_at: string;
          receipt_type: Database["public"]["Enums"]["receipt_type"];
          reservation_minutes: number;
          shipping_total: number;
          status: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax_total: number;
          terms_accepted_at: string;
          total: number;
          updated_at: string;
          user_id: string | null;
          warehouse_id: string | null;
        };
        Insert: {
          access_token_hash: string;
          billing_fiscal_address?: string | null;
          billing_legal_name?: string | null;
          billing_ruc?: string | null;
          cart_fingerprint: string;
          checkout_key: string;
          code: string;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          delivery_contacted_at?: string | null;
          delivery_coordination_status?:
            | Database["public"]["Enums"]["delivery_coordination_status"]
            | null;
          delivery_district_snapshot?: string | null;
          delivery_fee_cents?: number;
          delivery_method_id?: string | null;
          delivery_method_snapshot: string;
          delivery_notes?: string | null;
          delivery_responsible?: string | null;
          delivery_scheduled_at?: string | null;
          delivery_time_window?: string | null;
          delivery_zone_district_id?: string | null;
          delivery_zone_id?: string | null;
          delivery_zone_name_snapshot?: string | null;
          discount_total?: number;
          document_number?: string | null;
          document_type?: string | null;
          email: string;
          expires_at: string;
          first_name: string;
          id?: string;
          last_name: string;
          phone: string;
          privacy_accepted_at: string;
          receipt_type?: Database["public"]["Enums"]["receipt_type"];
          reservation_minutes: number;
          shipping_total?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal: number;
          tax_total?: number;
          terms_accepted_at: string;
          total: number;
          updated_at?: string;
          user_id?: string | null;
          warehouse_id?: string | null;
        };
        Update: {
          access_token_hash?: string;
          billing_fiscal_address?: string | null;
          billing_legal_name?: string | null;
          billing_ruc?: string | null;
          cart_fingerprint?: string;
          checkout_key?: string;
          code?: string;
          created_at?: string;
          currency?: string;
          customer_id?: string | null;
          delivery_contacted_at?: string | null;
          delivery_coordination_status?:
            | Database["public"]["Enums"]["delivery_coordination_status"]
            | null;
          delivery_district_snapshot?: string | null;
          delivery_fee_cents?: number;
          delivery_method_id?: string | null;
          delivery_method_snapshot?: string;
          delivery_notes?: string | null;
          delivery_responsible?: string | null;
          delivery_scheduled_at?: string | null;
          delivery_time_window?: string | null;
          delivery_zone_district_id?: string | null;
          delivery_zone_id?: string | null;
          delivery_zone_name_snapshot?: string | null;
          discount_total?: number;
          document_number?: string | null;
          document_type?: string | null;
          email?: string;
          expires_at?: string;
          first_name?: string;
          id?: string;
          last_name?: string;
          phone?: string;
          privacy_accepted_at?: string;
          receipt_type?: Database["public"]["Enums"]["receipt_type"];
          reservation_minutes?: number;
          shipping_total?: number;
          status?: Database["public"]["Enums"]["order_status"];
          subtotal?: number;
          tax_total?: number;
          terms_accepted_at?: string;
          total?: number;
          updated_at?: string;
          user_id?: string | null;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_delivery_method_id_fkey";
            columns: ["delivery_method_id"];
            isOneToOne: false;
            referencedRelation: "delivery_methods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_delivery_zone_district_id_fkey";
            columns: ["delivery_zone_district_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zone_districts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_delivery_zone_id_fkey";
            columns: ["delivery_zone_id"];
            isOneToOne: false;
            referencedRelation: "delivery_zones";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_attempts: {
        Row: {
          attempt_number: number;
          created_at: string;
          expires_at: string | null;
          external_url: string | null;
          id: string;
          idempotency_key: string;
          payment_id: string;
          sanitized_error: string | null;
          status: Database["public"]["Enums"]["payment_attempt_status"];
          updated_at: string;
        };
        Insert: {
          attempt_number: number;
          created_at?: string;
          expires_at?: string | null;
          external_url?: string | null;
          id?: string;
          idempotency_key: string;
          payment_id: string;
          sanitized_error?: string | null;
          status?: Database["public"]["Enums"]["payment_attempt_status"];
          updated_at?: string;
        };
        Update: {
          attempt_number?: number;
          created_at?: string;
          expires_at?: string | null;
          external_url?: string | null;
          id?: string;
          idempotency_key?: string;
          payment_id?: string;
          sanitized_error?: string | null;
          status?: Database["public"]["Enums"]["payment_attempt_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payment_attempts_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payment_events: {
        Row: {
          created_at: string;
          event_type: string;
          id: string;
          is_valid: boolean;
          payment_attempt_id: string | null;
          payment_id: string;
          processed_at: string | null;
          processing_error: string | null;
          provider: string;
          provider_event_id: string;
          sanitized_payload: Json;
        };
        Insert: {
          created_at?: string;
          event_type: string;
          id?: string;
          is_valid?: boolean;
          payment_attempt_id?: string | null;
          payment_id: string;
          processed_at?: string | null;
          processing_error?: string | null;
          provider: string;
          provider_event_id: string;
          sanitized_payload?: Json;
        };
        Update: {
          created_at?: string;
          event_type?: string;
          id?: string;
          is_valid?: boolean;
          payment_attempt_id?: string | null;
          payment_id?: string;
          processed_at?: string | null;
          processing_error?: string | null;
          provider?: string;
          provider_event_id?: string;
          sanitized_payload?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "payment_events_payment_attempt_id_fkey";
            columns: ["payment_attempt_id"];
            isOneToOne: false;
            referencedRelation: "payment_attempts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "payment_events_payment_id_fkey";
            columns: ["payment_id"];
            isOneToOne: false;
            referencedRelation: "payments";
            referencedColumns: ["id"];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          confirmed_at: string | null;
          created_at: string;
          currency: string;
          evidence_path: string | null;
          id: string;
          order_id: string;
          provider: string;
          provider_payment_id: string | null;
          reference: string | null;
          rejection_reason: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sanitized_metadata: Json;
          status: Database["public"]["Enums"]["commerce_payment_status"];
          updated_at: string;
        };
        Insert: {
          amount: number;
          confirmed_at?: string | null;
          created_at?: string;
          currency?: string;
          evidence_path?: string | null;
          id?: string;
          order_id: string;
          provider?: string;
          provider_payment_id?: string | null;
          reference?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sanitized_metadata?: Json;
          status?: Database["public"]["Enums"]["commerce_payment_status"];
          updated_at?: string;
        };
        Update: {
          amount?: number;
          confirmed_at?: string | null;
          created_at?: string;
          currency?: string;
          evidence_path?: string | null;
          id?: string;
          order_id?: string;
          provider?: string;
          provider_payment_id?: string | null;
          reference?: string | null;
          rejection_reason?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sanitized_metadata?: Json;
          status?: Database["public"]["Enums"]["commerce_payment_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      product_images: {
        Row: {
          alt: string | null;
          created_at: string;
          id: string;
          product_id: string;
          sort_order: number;
          url: string;
        };
        Insert: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          product_id: string;
          sort_order?: number;
          url: string;
        };
        Update: {
          alt?: string | null;
          created_at?: string;
          id?: string;
          product_id?: string;
          sort_order?: number;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          artisan: string | null;
          category_id: string | null;
          color: string | null;
          cost: number | null;
          created_at: string;
          description: string | null;
          id: string;
          internal_notes: string | null;
          is_featured: boolean;
          is_visible: boolean;
          main_image_url: string | null;
          material: string | null;
          measurements: string | null;
          min_stock: number | null;
          name: string;
          price: number;
          short_description: string | null;
          sku: string | null;
          slug: string;
          status: Database["public"]["Enums"]["product_status"];
          supplier: string | null;
          type: Database["public"]["Enums"]["product_type"];
          updated_at: string;
        };
        Insert: {
          artisan?: string | null;
          category_id?: string | null;
          color?: string | null;
          cost?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_featured?: boolean;
          is_visible?: boolean;
          main_image_url?: string | null;
          material?: string | null;
          measurements?: string | null;
          min_stock?: number | null;
          name: string;
          price?: number;
          short_description?: string | null;
          sku?: string | null;
          slug: string;
          status?: Database["public"]["Enums"]["product_status"];
          supplier?: string | null;
          type?: Database["public"]["Enums"]["product_type"];
          updated_at?: string;
        };
        Update: {
          artisan?: string | null;
          category_id?: string | null;
          color?: string | null;
          cost?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          internal_notes?: string | null;
          is_featured?: boolean;
          is_visible?: boolean;
          main_image_url?: string | null;
          material?: string | null;
          measurements?: string | null;
          min_stock?: number | null;
          name?: string;
          price?: number;
          short_description?: string | null;
          sku?: string | null;
          slug?: string;
          status?: Database["public"]["Enums"]["product_status"];
          supplier?: string | null;
          type?: Database["public"]["Enums"]["product_type"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          location: string | null;
          phone: string | null;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          location?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          location?: string | null;
          phone?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      purchase_items: {
        Row: {
          category: string | null;
          created_at: string;
          description: string;
          id: string;
          igv_amount: number;
          purchase_id: string;
          quantity: number;
          total_amount: number;
          unit_value: number;
        };
        Insert: {
          category?: string | null;
          created_at?: string;
          description: string;
          id?: string;
          igv_amount?: number;
          purchase_id: string;
          quantity?: number;
          total_amount: number;
          unit_value: number;
        };
        Update: {
          category?: string | null;
          created_at?: string;
          description?: string;
          id?: string;
          igv_amount?: number;
          purchase_id?: string;
          quantity?: number;
          total_amount?: number;
          unit_value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey";
            columns: ["purchase_id"];
            isOneToOne: false;
            referencedRelation: "purchases";
            referencedColumns: ["id"];
          },
        ];
      };
      purchases: {
        Row: {
          car: string | null;
          category: string | null;
          created_at: string;
          created_by: string | null;
          currency: string;
          document_type: string;
          due_date: string | null;
          id: string;
          igv_amount: number;
          issue_date: string;
          number: string;
          payment_status: string;
          pdf_path: string | null;
          reconciliation_status: string;
          series: string;
          source: string;
          status: string;
          supplier_name: string;
          supplier_ruc: string;
          tax_period: string;
          taxable_amount: number;
          total_amount: number;
          updated_at: string;
          updated_by: string | null;
          xml_path: string | null;
        };
        Insert: {
          car?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          document_type: string;
          due_date?: string | null;
          id?: string;
          igv_amount?: number;
          issue_date: string;
          number: string;
          payment_status?: string;
          pdf_path?: string | null;
          reconciliation_status?: string;
          series: string;
          source?: string;
          status?: string;
          supplier_name: string;
          supplier_ruc: string;
          tax_period: string;
          taxable_amount?: number;
          total_amount: number;
          updated_at?: string;
          updated_by?: string | null;
          xml_path?: string | null;
        };
        Update: {
          car?: string | null;
          category?: string | null;
          created_at?: string;
          created_by?: string | null;
          currency?: string;
          document_type?: string;
          due_date?: string | null;
          id?: string;
          igv_amount?: number;
          issue_date?: string;
          number?: string;
          payment_status?: string;
          pdf_path?: string | null;
          reconciliation_status?: string;
          series?: string;
          source?: string;
          status?: string;
          supplier_name?: string;
          supplier_ruc?: string;
          tax_period?: string;
          taxable_amount?: number;
          total_amount?: number;
          updated_at?: string;
          updated_by?: string | null;
          xml_path?: string | null;
        };
        Relationships: [];
      };
      receipts: {
        Row: {
          created_by: string | null;
          id: string;
          issued_at: string;
          number: string;
          pdf_url: string | null;
          sale_id: string;
        };
        Insert: {
          created_by?: string | null;
          id?: string;
          issued_at?: string;
          number: string;
          pdf_url?: string | null;
          sale_id: string;
        };
        Update: {
          created_by?: string | null;
          id?: string;
          issued_at?: string;
          number?: string;
          pdf_url?: string | null;
          sale_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "receipts_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: true;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_document_conversions: {
        Row: {
          actor_reference: string;
          actor_type: string;
          converted_at: string;
          converted_by: string | null;
          id: string;
          price_snapshot: number;
          sale_id: string;
          source_document: string;
          target_document: string;
          warehouse_id: string | null;
        };
        Insert: {
          actor_reference: string;
          actor_type: string;
          converted_at?: string;
          converted_by?: string | null;
          id?: string;
          price_snapshot: number;
          sale_id: string;
          source_document: string;
          target_document: string;
          warehouse_id?: string | null;
        };
        Update: {
          actor_reference?: string;
          actor_type?: string;
          converted_at?: string;
          converted_by?: string | null;
          id?: string;
          price_snapshot?: number;
          sale_id?: string;
          source_document?: string;
          target_document?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sale_document_conversions_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_document_conversions_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_items: {
        Row: {
          created_at: string;
          description: string | null;
          discount: number;
          id: string;
          is_manual_item: boolean;
          manual_item_name: string | null;
          presentation_id: string | null;
          product_id: string | null;
          provisional_source: string | null;
          quantity: number;
          sale_id: string;
          subtotal: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          discount?: number;
          id?: string;
          is_manual_item?: boolean;
          manual_item_name?: string | null;
          presentation_id?: string | null;
          product_id?: string | null;
          provisional_source?: string | null;
          quantity: number;
          sale_id: string;
          subtotal: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          discount?: number;
          id?: string;
          is_manual_item?: boolean;
          manual_item_name?: string | null;
          presentation_id?: string | null;
          product_id?: string | null;
          provisional_source?: string | null;
          quantity?: number;
          sale_id?: string;
          subtotal?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sale_items_presentation_id_fkey";
            columns: ["presentation_id"];
            isOneToOne: false;
            referencedRelation: "material_presentations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sale_payments: {
        Row: {
          amount: number;
          evidence_url: string | null;
          id: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes: string | null;
          operation_code: string | null;
          paid_at: string;
          sale_id: string;
        };
        Insert: {
          amount: number;
          evidence_url?: string | null;
          id?: string;
          method: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          operation_code?: string | null;
          paid_at?: string;
          sale_id: string;
        };
        Update: {
          amount?: number;
          evidence_url?: string | null;
          id?: string;
          method?: Database["public"]["Enums"]["payment_method"];
          notes?: string | null;
          operation_code?: string | null;
          paid_at?: string;
          sale_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sale_payments_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
        ];
      };
      sales: {
        Row: {
          confirmed_at: string | null;
          created_at: string;
          created_by: string | null;
          customer_id: string | null;
          delivery_status: Database["public"]["Enums"]["delivery_status"];
          discount: number;
          estimated_completion_at: string | null;
          id: string;
          notes: string | null;
          order_id: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          quote_number: number;
          status: Database["public"]["Enums"]["sale_status"];
          subtotal: number;
          total: number;
          updated_at: string;
          warehouse_id: string | null;
        };
        Insert: {
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_status?: Database["public"]["Enums"]["delivery_status"];
          discount?: number;
          estimated_completion_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quote_number?: number;
          status?: Database["public"]["Enums"]["sale_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Update: {
          confirmed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          customer_id?: string | null;
          delivery_status?: Database["public"]["Enums"]["delivery_status"];
          discount?: number;
          estimated_completion_at?: string | null;
          id?: string;
          notes?: string | null;
          order_id?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          quote_number?: number;
          status?: Database["public"]["Enums"]["sale_status"];
          subtotal?: number;
          total?: number;
          updated_at?: string;
          warehouse_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sales_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sales_warehouse_id_fkey";
            columns: ["warehouse_id"];
            isOneToOne: false;
            referencedRelation: "warehouses";
            referencedColumns: ["id"];
          },
        ];
      };
      sire_inconsistencies: {
        Row: {
          created_at: string;
          details: Json;
          id: string;
          inconsistency_type: string;
          internal_record_id: string | null;
          reviewed_at: string | null;
          reviewed_by: string | null;
          sire_period_id: string;
          status: string;
          sunat_record_id: string | null;
        };
        Insert: {
          created_at?: string;
          details?: Json;
          id?: string;
          inconsistency_type: string;
          internal_record_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sire_period_id: string;
          status?: string;
          sunat_record_id?: string | null;
        };
        Update: {
          created_at?: string;
          details?: Json;
          id?: string;
          inconsistency_type?: string;
          internal_record_id?: string | null;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          sire_period_id?: string;
          status?: string;
          sunat_record_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sire_inconsistencies_internal_record_id_fkey";
            columns: ["internal_record_id"];
            isOneToOne: false;
            referencedRelation: "sire_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sire_inconsistencies_sire_period_id_fkey";
            columns: ["sire_period_id"];
            isOneToOne: false;
            referencedRelation: "sire_periods";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sire_inconsistencies_sunat_record_id_fkey";
            columns: ["sunat_record_id"];
            isOneToOne: false;
            referencedRelation: "sire_records";
            referencedColumns: ["id"];
          },
        ];
      };
      sire_periods: {
        Row: {
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          file_hash: string | null;
          file_path: string | null;
          id: string;
          last_synced_at: string | null;
          makrana_total: number;
          period: string;
          proposal_status: string;
          registry_type: string;
          review_status: string;
          submission_status: string;
          sunat_total: number;
          ticket: string | null;
          updated_at: string;
        };
        Insert: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          file_hash?: string | null;
          file_path?: string | null;
          id?: string;
          last_synced_at?: string | null;
          makrana_total?: number;
          period: string;
          proposal_status?: string;
          registry_type: string;
          review_status?: string;
          submission_status?: string;
          sunat_total?: number;
          ticket?: string | null;
          updated_at?: string;
        };
        Update: {
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          file_hash?: string | null;
          file_path?: string | null;
          id?: string;
          last_synced_at?: string | null;
          makrana_total?: number;
          period?: string;
          proposal_status?: string;
          registry_type?: string;
          review_status?: string;
          submission_status?: string;
          sunat_total?: number;
          ticket?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      sire_records: {
        Row: {
          document_type: string;
          external_key: string;
          id: string;
          igv_amount: number;
          issue_date: string;
          number: string;
          raw_data: Json | null;
          series: string;
          sire_period_id: string;
          source: string;
          supplier_or_customer_document: string | null;
          taxable_amount: number;
          total_amount: number;
        };
        Insert: {
          document_type: string;
          external_key: string;
          id?: string;
          igv_amount?: number;
          issue_date: string;
          number: string;
          raw_data?: Json | null;
          series: string;
          sire_period_id: string;
          source: string;
          supplier_or_customer_document?: string | null;
          taxable_amount?: number;
          total_amount?: number;
        };
        Update: {
          document_type?: string;
          external_key?: string;
          id?: string;
          igv_amount?: number;
          issue_date?: string;
          number?: string;
          raw_data?: Json | null;
          series?: string;
          sire_period_id?: string;
          source?: string;
          supplier_or_customer_document?: string | null;
          taxable_amount?: number;
          total_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "sire_records_sire_period_id_fkey";
            columns: ["sire_period_id"];
            isOneToOne: false;
            referencedRelation: "sire_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      sire_sync_runs: {
        Row: {
          correlation_id: string;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          initiated_by: string | null;
          records_count: number;
          sire_period_id: string;
          started_at: string;
          status: string;
          ticket: string | null;
        };
        Insert: {
          correlation_id?: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          initiated_by?: string | null;
          records_count?: number;
          sire_period_id: string;
          started_at?: string;
          status: string;
          ticket?: string | null;
        };
        Update: {
          correlation_id?: string;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          initiated_by?: string | null;
          records_count?: number;
          sire_period_id?: string;
          started_at?: string;
          status?: string;
          ticket?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sire_sync_runs_sire_period_id_fkey";
            columns: ["sire_period_id"];
            isOneToOne: false;
            referencedRelation: "sire_periods";
            referencedColumns: ["id"];
          },
        ];
      };
      staff_module_permissions: {
        Row: {
          enabled: boolean;
          module: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          enabled?: boolean;
          module: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          enabled?: boolean;
          module?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      sunat_daily_summaries: {
        Row: {
          attempt_count: number;
          cdr_path: string | null;
          correlation_id: string;
          created_at: string;
          document_hash: string | null;
          id: string;
          issue_date: string;
          signed_xml_path: string | null;
          status: string;
          summary_identifier: string;
          tax_settings_id: string;
          ticket: string | null;
          updated_at: string;
          xml_path: string | null;
          zip_path: string | null;
        };
        Insert: {
          attempt_count?: number;
          cdr_path?: string | null;
          correlation_id?: string;
          created_at?: string;
          document_hash?: string | null;
          id?: string;
          issue_date: string;
          signed_xml_path?: string | null;
          status?: string;
          summary_identifier: string;
          tax_settings_id: string;
          ticket?: string | null;
          updated_at?: string;
          xml_path?: string | null;
          zip_path?: string | null;
        };
        Update: {
          attempt_count?: number;
          cdr_path?: string | null;
          correlation_id?: string;
          created_at?: string;
          document_hash?: string | null;
          id?: string;
          issue_date?: string;
          signed_xml_path?: string | null;
          status?: string;
          summary_identifier?: string;
          tax_settings_id?: string;
          ticket?: string | null;
          updated_at?: string;
          xml_path?: string | null;
          zip_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sunat_daily_summaries_tax_settings_id_fkey";
            columns: ["tax_settings_id"];
            isOneToOne: false;
            referencedRelation: "tax_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      sunat_daily_summary_items: {
        Row: {
          action: string;
          id: string;
          status: string;
          summary_id: string;
          tax_document_id: string;
        };
        Insert: {
          action: string;
          id?: string;
          status?: string;
          summary_id: string;
          tax_document_id: string;
        };
        Update: {
          action?: string;
          id?: string;
          status?: string;
          summary_id?: string;
          tax_document_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sunat_daily_summary_items_summary_id_fkey";
            columns: ["summary_id"];
            isOneToOne: false;
            referencedRelation: "sunat_daily_summaries";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sunat_daily_summary_items_tax_document_id_fkey";
            columns: ["tax_document_id"];
            isOneToOne: false;
            referencedRelation: "tax_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      sunat_transmission_attempts: {
        Row: {
          attempt_number: number;
          attempted_at: string;
          correlation_id: string;
          duration_ms: number | null;
          environment: string;
          id: string;
          idempotency_key: string;
          message: string | null;
          next_retry_at: string | null;
          operation: string;
          sanitized_response: Json | null;
          status: string;
          sunat_code: string | null;
          tax_document_id: string | null;
          transport_code: string | null;
        };
        Insert: {
          attempt_number: number;
          attempted_at?: string;
          correlation_id?: string;
          duration_ms?: number | null;
          environment: string;
          id?: string;
          idempotency_key: string;
          message?: string | null;
          next_retry_at?: string | null;
          operation: string;
          sanitized_response?: Json | null;
          status: string;
          sunat_code?: string | null;
          tax_document_id?: string | null;
          transport_code?: string | null;
        };
        Update: {
          attempt_number?: number;
          attempted_at?: string;
          correlation_id?: string;
          duration_ms?: number | null;
          environment?: string;
          id?: string;
          idempotency_key?: string;
          message?: string | null;
          next_retry_at?: string | null;
          operation?: string;
          sanitized_response?: Json | null;
          status?: string;
          sunat_code?: string | null;
          tax_document_id?: string | null;
          transport_code?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sunat_transmission_attempts_tax_document_id_fkey";
            columns: ["tax_document_id"];
            isOneToOne: false;
            referencedRelation: "tax_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_audit_log: {
        Row: {
          action: string;
          actor_id: string | null;
          correlation_id: string;
          created_at: string;
          entity_id: string | null;
          entity_type: string;
          id: string;
          next_state: Json | null;
          previous_state: Json | null;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type: string;
          id?: string;
          next_state?: Json | null;
          previous_state?: Json | null;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          correlation_id?: string;
          created_at?: string;
          entity_id?: string | null;
          entity_type?: string;
          id?: string;
          next_state?: Json | null;
          previous_state?: Json | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      tax_document_items: {
        Row: {
          created_at: string;
          description: string;
          discount_amount: number;
          id: string;
          igv_affectation_code: string;
          igv_amount: number;
          internal_code: string | null;
          line_number: number;
          product_id: string | null;
          quantity: number;
          sale_value: number;
          sunat_code: string | null;
          sunat_unit_code: string;
          tax_document_id: string;
          total_amount: number;
          unit_price: number;
          unit_value: number;
        };
        Insert: {
          created_at?: string;
          description: string;
          discount_amount?: number;
          id?: string;
          igv_affectation_code?: string;
          igv_amount: number;
          internal_code?: string | null;
          line_number: number;
          product_id?: string | null;
          quantity: number;
          sale_value: number;
          sunat_code?: string | null;
          sunat_unit_code?: string;
          tax_document_id: string;
          total_amount: number;
          unit_price: number;
          unit_value: number;
        };
        Update: {
          created_at?: string;
          description?: string;
          discount_amount?: number;
          id?: string;
          igv_affectation_code?: string;
          igv_amount?: number;
          internal_code?: string | null;
          line_number?: number;
          product_id?: string | null;
          quantity?: number;
          sale_value?: number;
          sunat_code?: string | null;
          sunat_unit_code?: string;
          tax_document_id?: string;
          total_amount?: number;
          unit_price?: number;
          unit_value?: number;
        };
        Relationships: [
          {
            foreignKeyName: "tax_document_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_document_items_tax_document_id_fkey";
            columns: ["tax_document_id"];
            isOneToOne: false;
            referencedRelation: "tax_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_document_series: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          document_type: string;
          environment: string;
          establishment_code: string;
          id: string;
          last_number: number;
          series: string;
          tax_settings_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          document_type: string;
          environment?: string;
          establishment_code?: string;
          id?: string;
          last_number?: number;
          series: string;
          tax_settings_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          document_type?: string;
          environment?: string;
          establishment_code?: string;
          id?: string;
          last_number?: number;
          series?: string;
          tax_settings_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tax_document_series_tax_settings_id_fkey";
            columns: ["tax_settings_id"];
            isOneToOne: false;
            referencedRelation: "tax_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_documents: {
        Row: {
          accepted_at: string | null;
          cdr_path: string | null;
          created_at: string;
          credit_note_reason_code: string | null;
          credited_amount: number;
          currency: string;
          customer_document_number: string | null;
          customer_document_type: string;
          customer_id: string | null;
          customer_name: string;
          discount_amount: number;
          document_hash: string | null;
          document_type: string;
          environment: string;
          exempt_amount: number;
          free_amount: number;
          id: string;
          idempotency_key: string;
          igv_amount: number;
          issue_date: string;
          issue_time: string;
          issued_by: string | null;
          number: number;
          operation_type: string;
          payment_method: string | null;
          pdf_path: string | null;
          qr_payload: string | null;
          related_document_id: string | null;
          sale_id: string | null;
          series: string;
          signed_xml_path: string | null;
          status: string;
          subtotal: number;
          sunat_code: string | null;
          sunat_message: string | null;
          sunat_status: string | null;
          sunat_ticket: string | null;
          tax_settings_id: string;
          taxable_amount: number;
          total_amount: number;
          unaffected_amount: number;
          updated_at: string;
          voided_at: string | null;
          xml_path: string | null;
          zip_path: string | null;
        };
        Insert: {
          accepted_at?: string | null;
          cdr_path?: string | null;
          created_at?: string;
          credit_note_reason_code?: string | null;
          credited_amount?: number;
          currency?: string;
          customer_document_number?: string | null;
          customer_document_type: string;
          customer_id?: string | null;
          customer_name: string;
          discount_amount?: number;
          document_hash?: string | null;
          document_type: string;
          environment?: string;
          exempt_amount?: number;
          free_amount?: number;
          id?: string;
          idempotency_key: string;
          igv_amount?: number;
          issue_date: string;
          issue_time: string;
          issued_by?: string | null;
          number: number;
          operation_type?: string;
          payment_method?: string | null;
          pdf_path?: string | null;
          qr_payload?: string | null;
          related_document_id?: string | null;
          sale_id?: string | null;
          series: string;
          signed_xml_path?: string | null;
          status?: string;
          subtotal?: number;
          sunat_code?: string | null;
          sunat_message?: string | null;
          sunat_status?: string | null;
          sunat_ticket?: string | null;
          tax_settings_id: string;
          taxable_amount?: number;
          total_amount?: number;
          unaffected_amount?: number;
          updated_at?: string;
          voided_at?: string | null;
          xml_path?: string | null;
          zip_path?: string | null;
        };
        Update: {
          accepted_at?: string | null;
          cdr_path?: string | null;
          created_at?: string;
          credit_note_reason_code?: string | null;
          credited_amount?: number;
          currency?: string;
          customer_document_number?: string | null;
          customer_document_type?: string;
          customer_id?: string | null;
          customer_name?: string;
          discount_amount?: number;
          document_hash?: string | null;
          document_type?: string;
          environment?: string;
          exempt_amount?: number;
          free_amount?: number;
          id?: string;
          idempotency_key?: string;
          igv_amount?: number;
          issue_date?: string;
          issue_time?: string;
          issued_by?: string | null;
          number?: number;
          operation_type?: string;
          payment_method?: string | null;
          pdf_path?: string | null;
          qr_payload?: string | null;
          related_document_id?: string | null;
          sale_id?: string | null;
          series?: string;
          signed_xml_path?: string | null;
          status?: string;
          subtotal?: number;
          sunat_code?: string | null;
          sunat_message?: string | null;
          sunat_status?: string | null;
          sunat_ticket?: string | null;
          tax_settings_id?: string;
          taxable_amount?: number;
          total_amount?: number;
          unaffected_amount?: number;
          updated_at?: string;
          voided_at?: string | null;
          xml_path?: string | null;
          zip_path?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tax_documents_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_documents_related_document_id_fkey";
            columns: ["related_document_id"];
            isOneToOne: false;
            referencedRelation: "tax_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_documents_sale_id_fkey";
            columns: ["sale_id"];
            isOneToOne: false;
            referencedRelation: "sales";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tax_documents_tax_settings_id_fkey";
            columns: ["tax_settings_id"];
            isOneToOne: false;
            referencedRelation: "tax_settings";
            referencedColumns: ["id"];
          },
        ];
      };
      tax_settings: {
        Row: {
          beta_authorized_at: string | null;
          beta_authorized_by: string | null;
          certificate_configured: boolean;
          certificate_expires_at: string | null;
          country_code: string;
          created_at: string;
          created_by: string | null;
          currency_code: string;
          department: string | null;
          district: string | null;
          electronic_issuer_enabled: boolean;
          environment: string;
          fiscal_address: string;
          id: string;
          igv_rate: number;
          legal_name: string;
          prices_include_igv: boolean | null;
          province: string | null;
          readiness_statuses: Json;
          ruc: string;
          sire_configured: boolean;
          tax_email: string | null;
          tax_regime: string | null;
          trade_name: string | null;
          ubigeo: string | null;
          updated_at: string;
          updated_by: string | null;
          xsd_tests_passed_at: string | null;
        };
        Insert: {
          beta_authorized_at?: string | null;
          beta_authorized_by?: string | null;
          certificate_configured?: boolean;
          certificate_expires_at?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          department?: string | null;
          district?: string | null;
          electronic_issuer_enabled?: boolean;
          environment?: string;
          fiscal_address: string;
          id?: string;
          igv_rate?: number;
          legal_name: string;
          prices_include_igv?: boolean | null;
          province?: string | null;
          readiness_statuses?: Json;
          ruc: string;
          sire_configured?: boolean;
          tax_email?: string | null;
          tax_regime?: string | null;
          trade_name?: string | null;
          ubigeo?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          xsd_tests_passed_at?: string | null;
        };
        Update: {
          beta_authorized_at?: string | null;
          beta_authorized_by?: string | null;
          certificate_configured?: boolean;
          certificate_expires_at?: string | null;
          country_code?: string;
          created_at?: string;
          created_by?: string | null;
          currency_code?: string;
          department?: string | null;
          district?: string | null;
          electronic_issuer_enabled?: boolean;
          environment?: string;
          fiscal_address?: string;
          id?: string;
          igv_rate?: number;
          legal_name?: string;
          prices_include_igv?: boolean | null;
          province?: string | null;
          readiness_statuses?: Json;
          ruc?: string;
          sire_configured?: boolean;
          tax_email?: string | null;
          tax_regime?: string | null;
          trade_name?: string | null;
          ubigeo?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          xsd_tests_passed_at?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string | null;
          role: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string | null;
          role: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string | null;
          role?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      warehouses: {
        Row: {
          address: string | null;
          code: string;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
        };
        Insert: {
          address?: string | null;
          code: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
        };
        Update: {
          address?: string | null;
          code?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
        };
        Relationships: [];
      };
      workshop_enrollments: {
        Row: {
          amount: number;
          created_at: string;
          customer_id: string | null;
          email: string | null;
          full_name: string;
          id: string;
          notes: string | null;
          payment_status: Database["public"]["Enums"]["payment_status"];
          phone: string | null;
          user_id: string | null;
          workshop_id: string;
        };
        Insert: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          email?: string | null;
          full_name: string;
          id?: string;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          phone?: string | null;
          user_id?: string | null;
          workshop_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          customer_id?: string | null;
          email?: string | null;
          full_name?: string;
          id?: string;
          notes?: string | null;
          payment_status?: Database["public"]["Enums"]["payment_status"];
          phone?: string | null;
          user_id?: string | null;
          workshop_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "workshop_enrollments_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "workshop_enrollments_workshop_id_fkey";
            columns: ["workshop_id"];
            isOneToOne: false;
            referencedRelation: "workshops";
            referencedColumns: ["id"];
          },
        ];
      };
      workshops: {
        Row: {
          capacity: number;
          cover_image_url: string | null;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          enrolled_count: number;
          id: string;
          is_visible: boolean;
          level: Database["public"]["Enums"]["workshop_level"];
          location: string | null;
          materials_included: string | null;
          modality: Database["public"]["Enums"]["workshop_modality"];
          price: number;
          slug: string;
          starts_at: string | null;
          status: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at: string;
        };
        Insert: {
          capacity?: number;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          enrolled_count?: number;
          id?: string;
          is_visible?: boolean;
          level?: Database["public"]["Enums"]["workshop_level"];
          location?: string | null;
          materials_included?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price?: number;
          slug: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["workshop_status"];
          title: string;
          updated_at?: string;
        };
        Update: {
          capacity?: number;
          cover_image_url?: string | null;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          enrolled_count?: number;
          id?: string;
          is_visible?: boolean;
          level?: Database["public"]["Enums"]["workshop_level"];
          location?: string | null;
          materials_included?: string | null;
          modality?: Database["public"]["Enums"]["workshop_modality"];
          price?: number;
          slug?: string;
          starts_at?: string | null;
          status?: Database["public"]["Enums"]["workshop_status"];
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      apply_inventory_movement: {
        Args: {
          _movement_type: Database["public"]["Enums"]["movement_type"];
          _notes?: string;
          _presentation_id?: string;
          _product_id: string;
          _quantity: number;
          _reason?: string;
          _warehouse_dest_id?: string;
          _warehouse_id: string;
        };
        Returns: string;
      };
      calendar_sale_warnings: { Args: { _event: Json }; Returns: Json };
      cancel_sale: {
        Args: { _sale_id: string };
        Returns: {
          sale_id: string;
        }[];
      };
      confirm_sale: {
        Args: { _sale_id: string };
        Returns: {
          receipt_id: string;
          receipt_number: string;
          sale_id: string;
        }[];
      };
      create_checkout_order: { Args: { _payload: Json }; Returns: Json };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      mutate_inventory_stock: {
        Args: {
          _presentation_id: string;
          _product_id: string;
          _quantity: number;
          _replace?: boolean;
          _warehouse_id: string;
        };
        Returns: undefined;
      };
      normalize_delivery_place: { Args: { value: string }; Returns: string };
      release_expired_inventory_reservations: { Args: never; Returns: number };
      replace_delivery_zone_districts: {
        Args: { _districts: string[]; _zone_id: string };
        Returns: undefined;
      };
      reserve_tax_document_number: {
        Args: { _series_id: string };
        Returns: {
          document_type: string;
          environment: string;
          number: number;
          series: string;
          tax_settings_id: string;
        }[];
      };
      review_manual_payment: {
        Args: {
          _approve: boolean;
          _ip?: unknown;
          _payment_id: string;
          _reason: string;
        };
        Returns: Json;
      };
      sale_document_intent: { Args: { _notes: string }; Returns: string };
      save_calendar_event: {
        Args: {
          _event: Json;
          _force_conflict?: boolean;
          _force_reason?: string;
        };
        Returns: Json;
      };
      tax_environment_ready: {
        Args: { _settings_id: string; _target: string };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "ventas" | "almacen" | "cliente";
      commerce_payment_status:
        | "created"
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded"
        | "unknown";
      delivery_coordination_status:
        | "pending_coordination"
        | "contacted"
        | "scheduled"
        | "dispatched"
        | "delivered"
        | "pickup_ready"
        | "picked_up"
        | "cancelled";
      delivery_kind: "pickup" | "lima_delivery";
      delivery_status: "pendiente" | "en_preparacion" | "entregado" | "enviado" | "cancelado";
      inventory_reservation_status: "active" | "consumed" | "released" | "expired";
      movement_type: "entrada" | "salida" | "transferencia" | "ajuste" | "venta" | "devolucion";
      news_category:
        | "evento"
        | "feria"
        | "taller"
        | "curso_nuevo"
        | "producto_nuevo"
        | "historia"
        | "inspiracion"
        | "promocion";
      news_status: "borrador" | "publicado" | "oculto";
      order_item_type: "product" | "material" | "kit" | "course" | "workshop";
      order_status:
        | "draft"
        | "pending_payment"
        | "payment_under_review"
        | "paid"
        | "processing"
        | "ready_for_pickup"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "expired"
        | "refunded"
        | "partially_refunded"
        | "payment_failed";
      payment_attempt_status:
        | "created"
        | "pending"
        | "under_review"
        | "approved"
        | "rejected"
        | "cancelled"
        | "expired"
        | "failed";
      payment_method: "efectivo" | "yape" | "plin" | "transferencia" | "tarjeta" | "mixto" | "otro";
      payment_status: "pendiente" | "parcial" | "pagado" | "anulado";
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
        | "centimetro"
        | "bolsa"
        | "caja"
        | "cono"
        | "bobina"
        | "ovillo"
        | "par"
        | "media_docena"
        | "gramo"
        | "kilogramo"
        | "litro"
        | "mililitro"
        | "set"
        | "kit";
      product_status: "disponible" | "por_encargo" | "agotado" | "reservado";
      product_type: "producto_terminado" | "material" | "kit" | "curso";
      receipt_type: "receipt" | "invoice";
      sale_status: "borrador" | "confirmada" | "anulada";
      workshop_level: "basico" | "intermedio" | "avanzado";
      workshop_modality: "presencial" | "virtual" | "hibrido";
      workshop_status: "abierto" | "lleno" | "finalizado" | "cancelado";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "ventas", "almacen", "cliente"],
      commerce_payment_status: [
        "created",
        "pending",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
        "unknown",
      ],
      delivery_coordination_status: [
        "pending_coordination",
        "contacted",
        "scheduled",
        "dispatched",
        "delivered",
        "pickup_ready",
        "picked_up",
        "cancelled",
      ],
      delivery_kind: ["pickup", "lima_delivery"],
      delivery_status: ["pendiente", "en_preparacion", "entregado", "enviado", "cancelado"],
      inventory_reservation_status: ["active", "consumed", "released", "expired"],
      movement_type: ["entrada", "salida", "transferencia", "ajuste", "venta", "devolucion"],
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
      order_item_type: ["product", "material", "kit", "course", "workshop"],
      order_status: [
        "draft",
        "pending_payment",
        "payment_under_review",
        "paid",
        "processing",
        "ready_for_pickup",
        "shipped",
        "delivered",
        "cancelled",
        "expired",
        "refunded",
        "partially_refunded",
        "payment_failed",
      ],
      payment_attempt_status: [
        "created",
        "pending",
        "under_review",
        "approved",
        "rejected",
        "cancelled",
        "expired",
        "failed",
      ],
      payment_method: ["efectivo", "yape", "plin", "transferencia", "tarjeta", "mixto", "otro"],
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
        "centimetro",
        "bolsa",
        "caja",
        "cono",
        "bobina",
        "ovillo",
        "par",
        "media_docena",
        "gramo",
        "kilogramo",
        "litro",
        "mililitro",
        "set",
        "kit",
      ],
      product_status: ["disponible", "por_encargo", "agotado", "reservado"],
      product_type: ["producto_terminado", "material", "kit", "curso"],
      receipt_type: ["receipt", "invoice"],
      sale_status: ["borrador", "confirmada", "anulada"],
      workshop_level: ["basico", "intermedio", "avanzado"],
      workshop_modality: ["presencial", "virtual", "hibrido"],
      workshop_status: ["abierto", "lleno", "finalizado", "cancelado"],
    },
  },
} as const;
