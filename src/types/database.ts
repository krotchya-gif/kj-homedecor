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
      account_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
      account_mappings: {
        Row: {
          created_at: string
          credit_account_id: string | null
          debit_account_id: string | null
          description: string | null
          id: string
          is_active: boolean
          transaction_type: string
        }
        Insert: {
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          transaction_type: string
        }
        Update: {
          created_at?: string
          credit_account_id?: string | null
          debit_account_id?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_mappings_credit_account_id_fkey"
            columns: ["credit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_mappings_debit_account_id_fkey"
            columns: ["debit_account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          balance: number | null
          category_id: string | null
          code: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_cash_account: boolean
          name: string
          normal_side: string | null
          parent_id: string | null
          type: string
          updated_at: string
        }
        Insert: {
          balance?: number | null
          category_id?: string | null
          code: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_cash_account?: boolean
          name: string
          normal_side?: string | null
          parent_id?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          balance?: number | null
          category_id?: string | null
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_cash_account?: boolean
          name?: string
          normal_side?: string | null
          parent_id?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounts_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "accounts_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      assets: {
        Row: {
          accumulated_depreciation: number | null
          category: string
          code: string | null
          created_at: string
          current_value: number
          depreciation_method: string | null
          depreciation_rate: number | null
          id: string
          location: string | null
          name: string
          notes: string | null
          purchase_cost: number
          purchase_date: string | null
          purchase_value: number | null
          status: string | null
          updated_at: string
          useful_life_years: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          category: string
          code?: string | null
          created_at?: string
          current_value?: number
          depreciation_method?: string | null
          depreciation_rate?: number | null
          id?: string
          location?: string | null
          name: string
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string | null
          purchase_value?: number | null
          status?: string | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          category?: string
          code?: string | null
          created_at?: string
          current_value?: number
          depreciation_method?: string | null
          depreciation_rate?: number | null
          id?: string
          location?: string | null
          name?: string
          notes?: string | null
          purchase_cost?: number
          purchase_date?: string | null
          purchase_value?: number | null
          status?: string | null
          updated_at?: string
          useful_life_years?: number | null
        }
        Relationships: []
      }
      banners: {
        Row: {
          created_at: string
          id: string
          image_url: string
          is_active: boolean
          link_url: string | null
          sequence: number
          subtitle: string | null
          title: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          is_active?: boolean
          link_url?: string | null
          sequence?: number
          subtitle?: string | null
          title?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link_url?: string | null
          sequence?: number
          subtitle?: string | null
          title?: string | null
        }
        Relationships: []
      }
      bom: {
        Row: {
          created_at: string
          id: string
          material_id: string
          product_id: string
          qty_per_unit: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          material_id: string
          product_id: string
          qty_per_unit?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          material_id?: string
          product_id?: string
          qty_per_unit?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bom_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      cash_accounts: {
        Row: {
          account_holder: string | null
          account_id: string | null
          account_number: string | null
          balance: number
          bank_name: string | null
          code: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string | null
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_id?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_id?: string | null
          account_number?: string | null
          balance?: number
          bank_name?: string | null
          code?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cash_accounts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string
        }
        Relationships: []
      }
      hutang: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          remaining: number
          return_amount: number | null
          return_date: string | null
          return_reason: string | null
          status: string
          supplier_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          remaining?: number
          return_amount?: number | null
          return_date?: string | null
          return_reason?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          remaining?: number
          return_amount?: number | null
          return_date?: string | null
          return_reason?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "hutang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "hutang_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      install_bookings: {
        Row: {
          actual_date: string | null
          address: string | null
          completed_at: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          date: string | null
          id: string
          installer_id: string | null
          notes: string | null
          order_id: string | null
          photo_evidence: Json | null
          revision: string | null
          revision_photos: string[] | null
          revision_reason: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          source: string | null
          status: string
          time: string | null
          type: string
        }
        Insert: {
          actual_date?: string | null
          address?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          id?: string
          installer_id?: string | null
          notes?: string | null
          order_id?: string | null
          photo_evidence?: Json | null
          revision?: string | null
          revision_photos?: string[] | null
          revision_reason?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          source?: string | null
          status?: string
          time?: string | null
          type?: string
        }
        Update: {
          actual_date?: string | null
          address?: string | null
          completed_at?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          date?: string | null
          id?: string
          installer_id?: string | null
          notes?: string | null
          order_id?: string | null
          photo_evidence?: Json | null
          revision?: string | null
          revision_photos?: string[] | null
          revision_reason?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          source?: string | null
          status?: string
          time?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "install_bookings_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "install_bookings_installer_id_fkey"
            columns: ["installer_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "install_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "install_bookings_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      install_checklists: {
        Row: {
          booking_id: string
          completed_at: string | null
          created_at: string
          id: string
          items: Json
          photo_evidence: Json | null
        }
        Insert: {
          booking_id: string
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          photo_evidence?: Json | null
        }
        Update: {
          booking_id?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          items?: Json
          photo_evidence?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "install_checklists_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "install_bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          from_location: string | null
          id: string
          material_id: string | null
          new_stock: number | null
          notes: string | null
          order_id: string | null
          product_id: string | null
          production_job_id: string | null
          qty: number
          reason: string | null
          to_location: string | null
          type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_location?: string | null
          id?: string
          material_id?: string | null
          new_stock?: number | null
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          production_job_id?: string | null
          qty: number
          reason?: string | null
          to_location?: string | null
          type: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_location?: string | null
          id?: string
          material_id?: string | null
          new_stock?: number | null
          notes?: string | null
          order_id?: string | null
          product_id?: string | null
          production_job_id?: string | null
          qty?: number
          reason?: string | null
          to_location?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_entries: {
        Row: {
          account: string | null
          account_id: string | null
          cash_account_id: string | null
          created_at: string
          created_by: string | null
          credit: number
          date: string | null
          debit: number
          description: string | null
          entry_date: string | null
          entry_type: string
          id: string
          idempotency_key: string | null
          is_auto: boolean | null
          is_posted: boolean
          reference_id: string | null
          reference_type: string | null
          total_credit: number | null
          total_debit: number | null
        }
        Insert: {
          account?: string | null
          account_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          date?: string | null
          debit?: number
          description?: string | null
          entry_date?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          is_auto?: boolean | null
          is_posted?: boolean
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Update: {
          account?: string | null
          account_id?: string | null
          cash_account_id?: string | null
          created_at?: string
          created_by?: string | null
          credit?: number
          date?: string | null
          debit?: number
          description?: string | null
          entry_date?: string | null
          entry_type?: string
          id?: string
          idempotency_key?: string | null
          is_auto?: boolean | null
          is_posted?: boolean
          reference_id?: string | null
          reference_type?: string | null
          total_credit?: number | null
          total_debit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "journal_entries_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_cash_account_id_fkey"
            columns: ["cash_account_id"]
            isOneToOne: false
            referencedRelation: "cash_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      journal_lines: {
        Row: {
          account_id: string
          created_at: string
          credit: number | null
          debit: number | null
          description: string | null
          entry_id: string
          id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id: string
          id?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          credit?: number | null
          debit?: number | null
          description?: string | null
          entry_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "journal_lines_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "journal_lines_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "journal_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      landing_settings: {
        Row: {
          address: string | null
          brand_color: string | null
          brand_font_url: string | null
          brand_logo_url: string | null
          brand_name: string | null
          brand_short: string | null
          categories_label: string | null
          categories_subtitle: string | null
          categories_title: string | null
          cta_badge: string | null
          cta_subtitle: string | null
          cta_title: string | null
          facebook: string | null
          hero_background_image: string | null
          hero_background_overlay_opacity: number | null
          hero_cta_link: string | null
          hero_cta_text: string | null
          hero_image_url: string | null
          hero_subtitle: string | null
          hero_title: string | null
          hero_video_url: string | null
          id: string
          instagram: string | null
          key: string
          phone: string | null
          portfolio_label: string | null
          portfolio_subtitle: string | null
          portfolio_title: string | null
          robots_content: string | null
          seo_description: string | null
          seo_ga4_id: string | null
          seo_keywords: string | null
          seo_og_image: string | null
          seo_pixel_id: string | null
          seo_title: string | null
          shopee: string | null
          sitemap_content: string | null
          theme_accent_color: string | null
          theme_background_color: string | null
          theme_border_radius: string | null
          theme_font_body: string | null
          theme_font_heading: string | null
          theme_preset: string | null
          theme_primary_color: string | null
          theme_secondary_color: string | null
          theme_text_color: string | null
          tiktok: string | null
          tokopedia: string | null
          trust_badges: Json | null
          updated_at: string
          value: Json
          whatsapp_message: string | null
          whatsapp_number: string | null
          whyus_card1_desc: string | null
          whyus_card1_title: string | null
          whyus_card2_desc: string | null
          whyus_card2_title: string | null
          whyus_card3_desc: string | null
          whyus_card3_title: string | null
          whyus_card4_desc: string | null
          whyus_card4_title: string | null
          whyus_label: string | null
          whyus_subtitle: string | null
          whyus_title: string | null
        }
        Insert: {
          address?: string | null
          brand_color?: string | null
          brand_font_url?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_short?: string | null
          categories_label?: string | null
          categories_subtitle?: string | null
          categories_title?: string | null
          cta_badge?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          facebook?: string | null
          hero_background_image?: string | null
          hero_background_overlay_opacity?: number | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          id?: string
          instagram?: string | null
          key: string
          phone?: string | null
          portfolio_label?: string | null
          portfolio_subtitle?: string | null
          portfolio_title?: string | null
          robots_content?: string | null
          seo_description?: string | null
          seo_ga4_id?: string | null
          seo_keywords?: string | null
          seo_og_image?: string | null
          seo_pixel_id?: string | null
          seo_title?: string | null
          shopee?: string | null
          sitemap_content?: string | null
          theme_accent_color?: string | null
          theme_background_color?: string | null
          theme_border_radius?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_preset?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          theme_text_color?: string | null
          tiktok?: string | null
          tokopedia?: string | null
          trust_badges?: Json | null
          updated_at?: string
          value?: Json
          whatsapp_message?: string | null
          whatsapp_number?: string | null
          whyus_card1_desc?: string | null
          whyus_card1_title?: string | null
          whyus_card2_desc?: string | null
          whyus_card2_title?: string | null
          whyus_card3_desc?: string | null
          whyus_card3_title?: string | null
          whyus_card4_desc?: string | null
          whyus_card4_title?: string | null
          whyus_label?: string | null
          whyus_subtitle?: string | null
          whyus_title?: string | null
        }
        Update: {
          address?: string | null
          brand_color?: string | null
          brand_font_url?: string | null
          brand_logo_url?: string | null
          brand_name?: string | null
          brand_short?: string | null
          categories_label?: string | null
          categories_subtitle?: string | null
          categories_title?: string | null
          cta_badge?: string | null
          cta_subtitle?: string | null
          cta_title?: string | null
          facebook?: string | null
          hero_background_image?: string | null
          hero_background_overlay_opacity?: number | null
          hero_cta_link?: string | null
          hero_cta_text?: string | null
          hero_image_url?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          hero_video_url?: string | null
          id?: string
          instagram?: string | null
          key?: string
          phone?: string | null
          portfolio_label?: string | null
          portfolio_subtitle?: string | null
          portfolio_title?: string | null
          robots_content?: string | null
          seo_description?: string | null
          seo_ga4_id?: string | null
          seo_keywords?: string | null
          seo_og_image?: string | null
          seo_pixel_id?: string | null
          seo_title?: string | null
          shopee?: string | null
          sitemap_content?: string | null
          theme_accent_color?: string | null
          theme_background_color?: string | null
          theme_border_radius?: string | null
          theme_font_body?: string | null
          theme_font_heading?: string | null
          theme_preset?: string | null
          theme_primary_color?: string | null
          theme_secondary_color?: string | null
          theme_text_color?: string | null
          tiktok?: string | null
          tokopedia?: string | null
          trust_badges?: Json | null
          updated_at?: string
          value?: Json
          whatsapp_message?: string | null
          whatsapp_number?: string | null
          whyus_card1_desc?: string | null
          whyus_card1_title?: string | null
          whyus_card2_desc?: string | null
          whyus_card2_title?: string | null
          whyus_card3_desc?: string | null
          whyus_card3_title?: string | null
          whyus_card4_desc?: string | null
          whyus_card4_title?: string | null
          whyus_label?: string | null
          whyus_subtitle?: string | null
          whyus_title?: string | null
        }
        Relationships: []
      }
      laundry_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_name: string
          customer_phone: string | null
          description: string | null
          id: string
          item: string | null
          kg: number | null
          kg_actual: number | null
          meter: number | null
          notes: string | null
          order_id: string | null
          price: number
          qty: number
          received_at: string
          reported_at: string | null
          reported_by: string | null
          status: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          item?: string | null
          kg?: number | null
          kg_actual?: number | null
          meter?: number | null
          notes?: string | null
          order_id?: string | null
          price?: number
          qty?: number
          received_at?: string
          reported_at?: string | null
          reported_by?: string | null
          status?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_name?: string
          customer_phone?: string | null
          description?: string | null
          id?: string
          item?: string | null
          kg?: number | null
          kg_actual?: number | null
          meter?: number | null
          notes?: string | null
          order_id?: string | null
          price?: number
          qty?: number
          received_at?: string
          reported_at?: string | null
          reported_by?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "laundry_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "laundry_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_payroll: {
        Row: {
          created_at: string
          id: string
          period_month: number
          period_year: number
          staff_id: string
          status: string
          total_amount: number
          total_kg: number
          total_rate: number
        }
        Insert: {
          created_at?: string
          id?: string
          period_month: number
          period_year: number
          staff_id: string
          status?: string
          total_amount?: number
          total_kg?: number
          total_rate?: number
        }
        Update: {
          created_at?: string
          id?: string
          period_month?: number
          period_year?: number
          staff_id?: string
          status?: string
          total_amount?: number
          total_kg?: number
          total_rate?: number
        }
        Relationships: [
          {
            foreignKeyName: "laundry_payroll_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      laundry_rates: {
        Row: {
          id: string
          is_active: boolean
          name: string
          rate_per_kg: number
          updated_at: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          name: string
          rate_per_kg: number
          updated_at?: string
        }
        Update: {
          id?: string
          is_active?: boolean
          name?: string
          rate_per_kg?: number
          updated_at?: string
        }
        Relationships: []
      }
      laundry_records: {
        Row: {
          created_at: string
          created_by: string | null
          customer_name: string
          date: string
          description: string | null
          id: string
          kg: number | null
          meter: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_name: string
          date: string
          description?: string | null
          id?: string
          kg?: number | null
          meter?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_name?: string
          date?: string
          description?: string | null
          id?: string
          kg?: number | null
          meter?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "laundry_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      lembur_records: {
        Row: {
          created_at: string
          created_by: string | null
          date: string
          id: string
          jam: number | null
          keterangan: string | null
          notes: string | null
          staff_id: string | null
          staff_name: string | null
          time_end: string | null
          time_start: string | null
          total_hours: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          date: string
          id?: string
          jam?: number | null
          keterangan?: string | null
          notes?: string | null
          staff_id?: string | null
          staff_name?: string | null
          time_end?: string | null
          time_start?: string | null
          total_hours?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          date?: string
          id?: string
          jam?: number | null
          keterangan?: string | null
          notes?: string | null
          staff_id?: string | null
          staff_name?: string | null
          time_end?: string | null
          time_start?: string | null
          total_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "lembur_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lembur_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      low_stock_alerts: {
        Row: {
          created_at: string
          current_qty: number
          id: string
          material_id: string
          min_qty: number
          resolved_at: string | null
        }
        Insert: {
          created_at?: string
          current_qty: number
          id?: string
          material_id: string
          min_qty: number
          resolved_at?: string | null
        }
        Update: {
          created_at?: string
          current_qty?: number
          id?: string
          material_id?: string
          min_qty?: number
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      material_price_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          material_id: string
          new_cost: number
          notes: string | null
          old_cost: number
          price: number | null
          recorded_at: string | null
          supplier_id: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          material_id: string
          new_cost: number
          notes?: string | null
          old_cost: number
          price?: number | null
          recorded_at?: string | null
          supplier_id?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          material_id?: string
          new_cost?: number
          notes?: string | null
          old_cost?: number
          price?: number | null
          recorded_at?: string | null
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_history_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_price_history_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          cost_per_unit: number
          created_at: string
          id: string
          min_stock_level: number
          name: string
          stock_gudang: number
          stock_toko: number
          supplier_id: string | null
          unit: string
        }
        Insert: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock_level?: number
          name: string
          stock_gudang?: number
          stock_toko?: number
          supplier_id?: string | null
          unit?: string
        }
        Update: {
          cost_per_unit?: number
          created_at?: string
          id?: string
          min_stock_level?: number
          name?: string
          stock_gudang?: number
          stock_toko?: number
          supplier_id?: string | null
          unit?: string
        }
        Relationships: [
          {
            foreignKeyName: "materials_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string
          is_read: boolean | null
          link: string | null
          message: string
          title: string
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message: string
          title: string
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          link?: string | null
          message?: string
          title?: string
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          custom_specs: string | null
          dimension_l: number | null
          dimension_p: number | null
          dimension_t: number | null
          id: string
          item_type: string
          linked_laundry_id: string | null
          meter: number | null
          meter_gorden: number | null
          meter_kupu_kupu: number | null
          meter_roman: number | null
          meter_vitras: number | null
          order_id: string
          poni_gel: boolean | null
          poni_lurus: boolean | null
          price: number
          product_id: string | null
          qty: number
          ready: boolean
          return_reason: string | null
          returned_at: string | null
          size: string | null
          smokering_color: string | null
          smokring_color: string | null
          style_type: string | null
          variant_color: string | null
          variant_size: string | null
          weight: number | null
        }
        Insert: {
          created_at?: string
          custom_specs?: string | null
          dimension_l?: number | null
          dimension_p?: number | null
          dimension_t?: number | null
          id?: string
          item_type?: string
          linked_laundry_id?: string | null
          meter?: number | null
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_vitras?: number | null
          order_id: string
          poni_gel?: boolean | null
          poni_lurus?: boolean | null
          price?: number
          product_id?: string | null
          qty?: number
          ready?: boolean
          return_reason?: string | null
          returned_at?: string | null
          size?: string | null
          smokering_color?: string | null
          smokring_color?: string | null
          style_type?: string | null
          variant_color?: string | null
          variant_size?: string | null
          weight?: number | null
        }
        Update: {
          created_at?: string
          custom_specs?: string | null
          dimension_l?: number | null
          dimension_p?: number | null
          dimension_t?: number | null
          id?: string
          item_type?: string
          linked_laundry_id?: string | null
          meter?: number | null
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_vitras?: number | null
          order_id?: string
          poni_gel?: boolean | null
          poni_lurus?: boolean | null
          price?: number
          product_id?: string | null
          qty?: number
          ready?: boolean
          return_reason?: string | null
          returned_at?: string | null
          size?: string | null
          smokering_color?: string | null
          smokring_color?: string | null
          style_type?: string | null
          variant_color?: string | null
          variant_size?: string | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "order_items_linked_laundry_id_fkey"
            columns: ["linked_laundry_id"]
            isOneToOne: false
            referencedRelation: "laundry_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
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
      order_logs: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          notes: string | null
          order_id: string
          staff_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_id: string
          staff_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          staff_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_logs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_logs_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_material_consumption: {
        Row: {
          consumed_at: string
          consumed_by: string | null
          id: string
          material_id: string
          notes: string | null
          order_id: string
          production_job_id: string
          qty_consumed: number
        }
        Insert: {
          consumed_at?: string
          consumed_by?: string | null
          id?: string
          material_id: string
          notes?: string | null
          order_id: string
          production_job_id: string
          qty_consumed: number
        }
        Update: {
          consumed_at?: string
          consumed_by?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          order_id?: string
          production_job_id?: string
          qty_consumed?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_material_consumption_consumed_by_fkey"
            columns: ["consumed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_material_consumption_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_material_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_material_consumption_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_material_consumption_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      order_preparation_checklists: {
        Row: {
          created_at: string
          id: string
          items: Json
          order_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          items?: Json
          order_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          items?: Json
          order_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_preparation_checklists_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_preparation_checklists_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_progress_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          notes: string | null
          order_id: string
          photo_url: string
          stage: string | null
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id: string
          photo_url: string
          stage?: string | null
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string
          photo_url?: string
          stage?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_progress_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_progress_photos_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_progress_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          admin_notes: string | null
          classification: string
          courier: string | null
          created_at: string
          customer_id: string | null
          dp_amount: number
          estimated_completion: string | null
          id: string
          installed_at: string | null
          installed_by: string | null
          lunas_amount: number
          notes: string | null
          order_date: string | null
          order_id_external: string | null
          order_number: string | null
          packed_at: string | null
          packed_by: string | null
          packing_note: string | null
          payment_status: string
          return_reason: string | null
          returned_at: string | null
          scheduled_installation_date: string | null
          scheduled_installation_time: string | null
          shipped_at: string | null
          shipped_by: string | null
          shipping_address: string | null
          shipping_awb: string | null
          shipping_cost: number | null
          shipping_cost_estimated: number | null
          shipping_courier: string | null
          source: string
          source_tag: string | null
          status: string
          survey_id: string | null
          total_amount: number
          tracking_number: string | null
          updated_at: string | null
        }
        Insert: {
          admin_notes?: string | null
          classification?: string
          courier?: string | null
          created_at?: string
          customer_id?: string | null
          dp_amount?: number
          estimated_completion?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          lunas_amount?: number
          notes?: string | null
          order_date?: string | null
          order_id_external?: string | null
          order_number?: string | null
          packed_at?: string | null
          packed_by?: string | null
          packing_note?: string | null
          payment_status?: string
          return_reason?: string | null
          returned_at?: string | null
          scheduled_installation_date?: string | null
          scheduled_installation_time?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address?: string | null
          shipping_awb?: string | null
          shipping_cost?: number | null
          shipping_cost_estimated?: number | null
          shipping_courier?: string | null
          source?: string
          source_tag?: string | null
          status?: string
          survey_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Update: {
          admin_notes?: string | null
          classification?: string
          courier?: string | null
          created_at?: string
          customer_id?: string | null
          dp_amount?: number
          estimated_completion?: string | null
          id?: string
          installed_at?: string | null
          installed_by?: string | null
          lunas_amount?: number
          notes?: string | null
          order_date?: string | null
          order_id_external?: string | null
          order_number?: string | null
          packed_at?: string | null
          packed_by?: string | null
          packing_note?: string | null
          payment_status?: string
          return_reason?: string | null
          returned_at?: string | null
          scheduled_installation_date?: string | null
          scheduled_installation_time?: string | null
          shipped_at?: string | null
          shipped_by?: string | null
          shipping_address?: string | null
          shipping_awb?: string | null
          shipping_cost?: number | null
          shipping_cost_estimated?: number | null
          shipping_courier?: string | null
          source?: string
          source_tag?: string | null
          status?: string
          survey_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_installed_by_fkey"
            columns: ["installed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_packed_by_fkey"
            columns: ["packed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_shipped_by_fkey"
            columns: ["shipped_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          date: string
          id: string
          idempotency_key: string | null
          notes: string | null
          order_id: string
          type: string
          verified_at: string | null
          verified_by: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          date?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_id: string
          type: string
          verified_at?: string | null
          verified_by?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          date?: string
          id?: string
          idempotency_key?: string | null
          notes?: string | null
          order_id?: string
          type?: string
          verified_at?: string | null
          verified_by?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      piutang: {
        Row: {
          amount: number
          channel: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_date: string | null
          fee_amount: number | null
          id: string
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          order_id: string | null
          paid_amount: number | null
          paid_at: string | null
          remaining: number
          return_amount: number | null
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          channel?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          fee_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          remaining?: number
          return_amount?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          channel?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_date?: string | null
          fee_amount?: number | null
          id?: string
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          order_id?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          remaining?: number
          return_amount?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "piutang_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piutang_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piutang_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "piutang_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      portfolio_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          images: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          images?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          images?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      production_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          meter_gorden: number | null
          meter_kupu_kupu: number | null
          meter_roman: number | null
          meter_vitras: number | null
          order_id: string
          penjahit_id: string | null
          poni_gel: boolean | null
          poni_lurus: boolean | null
          revision_of: string | null
          revision_reason: string | null
          revision_round: number
          started_at: string | null
          status: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_vitras?: number | null
          order_id: string
          penjahit_id?: string | null
          poni_gel?: boolean | null
          poni_lurus?: boolean | null
          revision_of?: string | null
          revision_reason?: string | null
          revision_round?: number
          started_at?: string | null
          status?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_vitras?: number | null
          order_id?: string
          penjahit_id?: string | null
          poni_gel?: boolean | null
          poni_lurus?: boolean | null
          revision_of?: string | null
          revision_reason?: string | null
          revision_round?: number
          started_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_penjahit_id_fkey"
            columns: ["penjahit_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_jobs_revision_of_fkey"
            columns: ["revision_of"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      production_reports: {
        Row: {
          created_at: string
          gorden_rate: number | null
          id: string
          jobs_done: number
          kupu_kupu_rate: number | null
          meter_gorden: number | null
          meter_kupu_kupu: number | null
          meter_roman: number | null
          meter_total_gorden: number
          meter_total_kupu_kupu: number
          meter_total_roman: number
          meter_total_vitras: number
          meter_vitras: number | null
          month: number | null
          notes: string | null
          penjahit_id: string | null
          poni_gel: number | null
          poni_lurus: number | null
          production_job_id: string | null
          rate_per_meter: Json
          roman_rate: number | null
          total_upah: number
          vitras_rate: number | null
          year: number | null
        }
        Insert: {
          created_at?: string
          gorden_rate?: number | null
          id?: string
          jobs_done?: number
          kupu_kupu_rate?: number | null
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_total_gorden?: number
          meter_total_kupu_kupu?: number
          meter_total_roman?: number
          meter_total_vitras?: number
          meter_vitras?: number | null
          month?: number | null
          notes?: string | null
          penjahit_id?: string | null
          poni_gel?: number | null
          poni_lurus?: number | null
          production_job_id?: string | null
          rate_per_meter?: Json
          roman_rate?: number | null
          total_upah?: number
          vitras_rate?: number | null
          year?: number | null
        }
        Update: {
          created_at?: string
          gorden_rate?: number | null
          id?: string
          jobs_done?: number
          kupu_kupu_rate?: number | null
          meter_gorden?: number | null
          meter_kupu_kupu?: number | null
          meter_roman?: number | null
          meter_total_gorden?: number
          meter_total_kupu_kupu?: number
          meter_total_roman?: number
          meter_total_vitras?: number
          meter_vitras?: number | null
          month?: number | null
          notes?: string | null
          penjahit_id?: string | null
          poni_gel?: number | null
          poni_lurus?: number | null
          production_job_id?: string | null
          rate_per_meter?: Json
          roman_rate?: number | null
          total_upah?: number
          vitras_rate?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_production_reports_job"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_reports_penjahit_id_fkey"
            columns: ["penjahit_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          color_variants: string[] | null
          cost: number | null
          created_at: string
          description: string | null
          dimension_l: number | null
          dimension_p: number | null
          dimension_t: number | null
          harga_jual: number | null
          hpp_calculated: number | null
          hpp_manual: number | null
          id: string
          images: Json | null
          is_catalog_visible: boolean | null
          is_custom: boolean
          is_featured: boolean
          is_visible: boolean
          kode_kain: string | null
          name: string
          price: number
          product_type: string
          shipping_options: Json | null
          sku: string | null
          smokring_colors: string[] | null
          stock_toko: number
          style_variants: string[] | null
          variants: Json | null
          weight: number | null
        }
        Insert: {
          category_id?: string | null
          color_variants?: string[] | null
          cost?: number | null
          created_at?: string
          description?: string | null
          dimension_l?: number | null
          dimension_p?: number | null
          dimension_t?: number | null
          harga_jual?: number | null
          hpp_calculated?: number | null
          hpp_manual?: number | null
          id?: string
          images?: Json | null
          is_catalog_visible?: boolean | null
          is_custom?: boolean
          is_featured?: boolean
          is_visible?: boolean
          kode_kain?: string | null
          name: string
          price?: number
          product_type?: string
          shipping_options?: Json | null
          sku?: string | null
          smokring_colors?: string[] | null
          stock_toko?: number
          style_variants?: string[] | null
          variants?: Json | null
          weight?: number | null
        }
        Update: {
          category_id?: string | null
          color_variants?: string[] | null
          cost?: number | null
          created_at?: string
          description?: string | null
          dimension_l?: number | null
          dimension_p?: number | null
          dimension_t?: number | null
          harga_jual?: number | null
          hpp_calculated?: number | null
          hpp_manual?: number | null
          id?: string
          images?: Json | null
          is_catalog_visible?: boolean | null
          is_custom?: boolean
          is_featured?: boolean
          is_visible?: boolean
          kode_kain?: string | null
          name?: string
          price?: number
          product_type?: string
          shipping_options?: Json | null
          sku?: string | null
          smokring_colors?: string[] | null
          stock_toko?: number
          style_variants?: string[] | null
          variants?: Json | null
          weight?: number | null
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
      purchase_orders: {
        Row: {
          actual_cost: number
          created_at: string
          id: string
          invoice_document: string | null
          paid_at: string | null
          paid_by: string | null
          pr_id: string | null
          proof_of_payment: string | null
          received_at: string | null
          status: string
          supplier_id: string | null
        }
        Insert: {
          actual_cost?: number
          created_at?: string
          id?: string
          invoice_document?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pr_id?: string | null
          proof_of_payment?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
        }
        Update: {
          actual_cost?: number
          created_at?: string
          id?: string
          invoice_document?: string | null
          paid_at?: string | null
          paid_by?: string | null
          pr_id?: string | null
          proof_of_payment?: string | null
          received_at?: string | null
          status?: string
          supplier_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_pr_id_fkey"
            columns: ["pr_id"]
            isOneToOne: false
            referencedRelation: "purchase_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_requests: {
        Row: {
          approved_by: string | null
          created_at: string
          created_by: string | null
          estimated_cost: number
          id: string
          material_id: string
          qty: number
          status: string
        }
        Insert: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          estimated_cost?: number
          id?: string
          material_id: string
          qty: number
          status?: string
        }
        Update: {
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          estimated_cost?: number
          id?: string
          material_id?: string
          qty?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_requests_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      qc_records: {
        Row: {
          checked_at: string
          checked_by: string | null
          fail_reason: string | null
          id: string
          order_id: string
          order_item_id: string | null
          photo_evidence: Json | null
          result: string
          revision_notes: string | null
        }
        Insert: {
          checked_at?: string
          checked_by?: string | null
          fail_reason?: string | null
          id?: string
          order_id: string
          order_item_id?: string | null
          photo_evidence?: Json | null
          result: string
          revision_notes?: string | null
        }
        Update: {
          checked_at?: string
          checked_by?: string | null
          fail_reason?: string | null
          id?: string
          order_id?: string
          order_item_id?: string | null
          photo_evidence?: Json | null
          result?: string
          revision_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "qc_records_checked_by_fkey"
            columns: ["checked_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_records_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qc_records_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      returns: {
        Row: {
          approved_by: string | null
          condition: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          order_id: string
          order_item_id: string | null
          photo_evidence: string[] | null
          qty: number | null
          reason: string
          refund_amount: number | null
          refund_status: string | null
          resolved_at: string | null
        }
        Insert: {
          approved_by?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id: string
          order_item_id?: string | null
          photo_evidence?: string[] | null
          qty?: number | null
          reason: string
          refund_amount?: number | null
          refund_status?: string | null
          resolved_at?: string | null
        }
        Update: {
          approved_by?: string | null
          condition?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          order_id?: string
          order_item_id?: string | null
          photo_evidence?: string[] | null
          qty?: number | null
          reason?: string
          refund_amount?: number | null
          refund_status?: string | null
          resolved_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "returns_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "returns_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      steam_jobs: {
        Row: {
          checked_by: string | null
          completed_at: string | null
          created_at: string
          customer_name: string | null
          fail_reason: string | null
          id: string
          item: string | null
          laundry_id: string | null
          notes: string | null
          order_id: string | null
          production_job_id: string | null
          qty: number
          result: string | null
          status: string
        }
        Insert: {
          checked_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          fail_reason?: string | null
          id?: string
          item?: string | null
          laundry_id?: string | null
          notes?: string | null
          order_id?: string | null
          production_job_id?: string | null
          qty?: number
          result?: string | null
          status?: string
        }
        Update: {
          checked_by?: string | null
          completed_at?: string | null
          created_at?: string
          customer_name?: string | null
          fail_reason?: string | null
          id?: string
          item?: string | null
          laundry_id?: string | null
          notes?: string | null
          order_id?: string | null
          production_job_id?: string | null
          qty?: number
          result?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "steam_jobs_laundry_id_fkey"
            columns: ["laundry_id"]
            isOneToOne: false
            referencedRelation: "laundry_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steam_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "order_totals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steam_jobs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "steam_jobs_production_job_id_fkey"
            columns: ["production_job_id"]
            isOneToOne: false
            referencedRelation: "production_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname_items: {
        Row: {
          adjustment_reason: string | null
          counted_qty: number
          created_at: string
          difference: number
          id: string
          material_id: string
          session_id: string
          system_qty: number
        }
        Insert: {
          adjustment_reason?: string | null
          counted_qty?: number
          created_at?: string
          difference?: number
          id?: string
          material_id: string
          session_id: string
          system_qty?: number
        }
        Update: {
          adjustment_reason?: string | null
          counted_qty?: number
          created_at?: string
          difference?: number
          id?: string
          material_id?: string
          session_id?: string
          system_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_items_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "stock_opname_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_opname_sessions: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          status: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_opname_sessions_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_opname_sessions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      style_rates: {
        Row: {
          id: string
          is_active: boolean | null
          rate_per_meter: number
          style: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean | null
          rate_per_meter: number
          style: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean | null
          rate_per_meter?: number
          style?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      suppliers: {
        Row: {
          address: string | null
          contact: string | null
          contact_person: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
        }
        Insert: {
          address?: string | null
          contact?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
        }
        Update: {
          address?: string | null
          contact?: string | null
          contact_person?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
        }
        Relationships: []
      }
      survey_logs: {
        Row: {
          action: string
          created_at: string
          detail: string | null
          id: string
          survey_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          detail?: string | null
          id?: string
          survey_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          detail?: string | null
          id?: string
          survey_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_logs_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_room_photos: {
        Row: {
          created_at: string
          id: string
          room_id: string
          sort_order: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          room_id: string
          sort_order?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          room_id?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_room_photos_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "survey_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_rooms: {
        Row: {
          created_at: string
          fabric_name: string | null
          fabric_photo: string | null
          height_cm: number | null
          hook: string | null
          id: string
          model_gorden: string | null
          notes: string | null
          rel_gorden: string | null
          rel_vitras: string | null
          room_name: string
          sort_order: number
          survey_id: string
          vitras_name: string | null
          vitras_photo: string | null
          width_cm: number | null
        }
        Insert: {
          created_at?: string
          fabric_name?: string | null
          fabric_photo?: string | null
          height_cm?: number | null
          hook?: string | null
          id?: string
          model_gorden?: string | null
          notes?: string | null
          rel_gorden?: string | null
          rel_vitras?: string | null
          room_name: string
          sort_order?: number
          survey_id: string
          vitras_name?: string | null
          vitras_photo?: string | null
          width_cm?: number | null
        }
        Update: {
          created_at?: string
          fabric_name?: string | null
          fabric_photo?: string | null
          height_cm?: number | null
          hook?: string | null
          id?: string
          model_gorden?: string | null
          notes?: string | null
          rel_gorden?: string | null
          rel_vitras?: string | null
          room_name?: string
          sort_order?: number
          survey_id?: string
          vitras_name?: string | null
          vitras_photo?: string | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_rooms_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          client_address: string | null
          client_name: string
          created_at: string
          gps_lat: number | null
          gps_lng: number | null
          id: string
          notes: string | null
          signature: string | null
          signature_name: string | null
          status: string
          survey_date: string
          survey_number: string | null
          surveyor_id: string | null
          updated_at: string
        }
        Insert: {
          client_address?: string | null
          client_name: string
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          signature?: string | null
          signature_name?: string | null
          status?: string
          survey_date?: string
          survey_number?: string | null
          surveyor_id?: string | null
          updated_at?: string
        }
        Update: {
          client_address?: string | null
          client_name?: string
          created_at?: string
          gps_lat?: number | null
          gps_lng?: number | null
          id?: string
          notes?: string | null
          signature?: string | null
          signature_name?: string | null
          status?: string
          survey_date?: string
          survey_number?: string | null
          surveyor_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "surveys_surveyor_id_fkey"
            columns: ["surveyor_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tiktok_shop_orders: {
        Row: {
          buyer_name: string | null
          buyer_phone: string | null
          commission_fee: number | null
          created_at: string | null
          currency: string | null
          id: string
          net_amount: number | null
          order_data: Json | null
          order_date: string | null
          order_status: string | null
          payment_status: string | null
          platform_fee: number | null
          shipping_address: string | null
          shipping_amount: number | null
          synced_at: string | null
          tiktok_order_id: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_fee?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          net_amount?: number | null
          order_data?: Json | null
          order_date?: string | null
          order_status?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          shipping_address?: string | null
          shipping_amount?: number | null
          synced_at?: string | null
          tiktok_order_id: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          buyer_name?: string | null
          buyer_phone?: string | null
          commission_fee?: number | null
          created_at?: string | null
          currency?: string | null
          id?: string
          net_amount?: number | null
          order_data?: Json | null
          order_date?: string | null
          order_status?: string | null
          payment_status?: string | null
          platform_fee?: number | null
          shipping_address?: string | null
          shipping_amount?: number | null
          synced_at?: string | null
          tiktok_order_id?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tiktok_shop_settings: {
        Row: {
          access_token: string | null
          app_key: string
          app_secret: string
          created_at: string | null
          id: string
          is_active: boolean | null
          oauth_state: string | null
          open_id: string | null
          refresh_token: string | null
          seller_name: string | null
          shop_cipher: string | null
          shop_name: string | null
          shop_region: string | null
          token_expires_at: string | null
          updated_at: string | null
        }
        Insert: {
          access_token?: string | null
          app_key: string
          app_secret: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          oauth_state?: string | null
          open_id?: string | null
          refresh_token?: string | null
          seller_name?: string | null
          shop_cipher?: string | null
          shop_name?: string | null
          shop_region?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Update: {
          access_token?: string | null
          app_key?: string
          app_secret?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          oauth_state?: string | null
          open_id?: string | null
          refresh_token?: string | null
          seller_name?: string | null
          shop_cipher?: string | null
          shop_name?: string | null
          shop_region?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      tiktok_shop_statements: {
        Row: {
          adjustment_amount: number | null
          created_at: string | null
          currency: string | null
          end_date: string | null
          fee_amount: number | null
          id: string
          is_synced: boolean | null
          net_sales_amount: number | null
          paid_at: string | null
          piutang_id: string | null
          revenue_amount: number | null
          shipping_cost_amount: number | null
          start_date: string | null
          statement_data: Json | null
          statement_id: string
          statement_type: string | null
          status: string | null
          synced_at: string | null
          total_amount: number | null
          transaction_count: number | null
        }
        Insert: {
          adjustment_amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fee_amount?: number | null
          id?: string
          is_synced?: boolean | null
          net_sales_amount?: number | null
          paid_at?: string | null
          piutang_id?: string | null
          revenue_amount?: number | null
          shipping_cost_amount?: number | null
          start_date?: string | null
          statement_data?: Json | null
          statement_id: string
          statement_type?: string | null
          status?: string | null
          synced_at?: string | null
          total_amount?: number | null
          transaction_count?: number | null
        }
        Update: {
          adjustment_amount?: number | null
          created_at?: string | null
          currency?: string | null
          end_date?: string | null
          fee_amount?: number | null
          id?: string
          is_synced?: boolean | null
          net_sales_amount?: number | null
          paid_at?: string | null
          piutang_id?: string | null
          revenue_amount?: number | null
          shipping_cost_amount?: number | null
          start_date?: string | null
          statement_data?: Json | null
          statement_id?: string
          statement_type?: string | null
          status?: string | null
          synced_at?: string | null
          total_amount?: number | null
          transaction_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_shop_statements_piutang_id_fkey"
            columns: ["piutang_id"]
            isOneToOne: false
            referencedRelation: "piutang"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          role: string
          status: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
          role: string
          status?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          role?: string
          status?: string
        }
        Relationships: []
      }
    }
    Views: {
      order_totals: {
        Row: {
          id: string | null
          status: string | null
          total_amount: number | null
          total_dp: number | null
          total_lunas: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      actor_is_active_with_role: {
        Args: { p_actor: string; p_roles: string[] }
        Returns: boolean
      }
      add_order_item_atomic: {
        Args: { p_actor: string; p_item: Json; p_order_id: string }
        Returns: Json
      }
      add_order_payment_atomic:
        | {
            Args: {
              p_actor: string
              p_amount: number
              p_order_id: string
              p_type: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_actor: string
              p_amount: number
              p_debit_account_id?: string
              p_idempotency_key?: string
              p_order_id: string
              p_type: string
            }
            Returns: Json
          }
        | {
            Args: {
              p_actor: string
              p_amount: number
              p_date?: string
              p_debit_account_id?: string
              p_idempotency_key?: string
              p_order_id: string
              p_type: string
            }
            Returns: Json
          }
      adjust_stock_atomic: {
        Args: {
          p_actor: string
          p_direction: string
          p_item_id: string
          p_location: string
          p_notes: string
          p_qty: number
          p_reason: string
          p_target_type: string
        }
        Returns: Json
      }
      advance_install_booking_status: {
        Args: { p_booking_id: string; p_new_status: string; p_staff_id: string }
        Returns: Json
      }
      approve_stock_opname: { Args: { p_session_id: string }; Returns: Json }
      can_view_customer_data_sd: {
        Args: { p_customer_id: string }
        Returns: boolean
      }
      cancel_order_atomic: {
        Args: { p_actor: string; p_order_id: string; p_reason: string }
        Returns: Json
      }
      cancel_tiktok_order_atomic: {
        Args: { p_actor: string; p_order_id: string; p_reason: string }
        Returns: Json
      }
      consume_materials_for_production: {
        Args: {
          p_consumed_by: string
          p_order_id: string
          p_production_job_id: string
        }
        Returns: Json
      }
      create_journal_atomic: {
        Args: {
          p_created_by?: string
          p_description: string
          p_entry_date: string
          p_idempotency_key: string
          p_is_auto: boolean
          p_lines: Json
          p_reference_id: string
          p_reference_type: string
        }
        Returns: Json
      }
      create_public_booking: {
        Args: {
          p_address: string
          p_customer_name: string
          p_customer_phone: string
          p_notes?: string
          p_scheduled_date: string
          p_scheduled_time: string
          p_type?: string
        }
        Returns: Json
      }
      generate_order_number: { Args: never; Returns: string }
      generate_survey_number: { Args: never; Returns: string }
      get_public_booking_slots: {
        Args: { p_from?: string; p_to?: string }
        Returns: {
          scheduled_date: string
          scheduled_time: string
        }[]
      }
      increment_stock_gudang: {
        Args: { amount: number; material_id: string }
        Returns: undefined
      }
      increment_stock_toko: {
        Args: { amount: number; product_id: string }
        Returns: undefined
      }
      is_admin_or_owner_sd: { Args: never; Returns: boolean }
      is_finance_role: { Args: never; Returns: boolean }
      is_gudang_role_sd: { Args: never; Returns: boolean }
      is_installer_sd: { Args: never; Returns: boolean }
      is_staff_active_sd: { Args: never; Returns: boolean }
      link_survey_atomic: {
        Args: { p_actor: string; p_order_id: string; p_survey_id: string }
        Returns: Json
      }
      pay_hutang_atomic: {
        Args: {
          p_actor: string
          p_amount: number
          p_hutang_id: string
          p_idempotency_key?: string
          p_notes?: string
        }
        Returns: Json
      }
      pay_piutang_atomic: {
        Args: {
          p_actor: string
          p_amount: number
          p_faktur_id: string
          p_idempotency_key?: string
          p_notes?: string
        }
        Returns: Json
      }
      process_order_return_atomic: {
        Args: {
          p_actor: string
          p_condition: string
          p_order_id: string
          p_order_item_id: string
          p_qty: number
          p_reason: string
          p_refund_amount: number
        }
        Returns: Json
      }
      process_refund_atomic: {
        Args: { p_actor: string; p_return_id: string }
        Returns: Json
      }
      process_tiktok_order_atomic: {
        Args: { p_actor: string; p_tiktok_order_id: string }
        Returns: Json
      }
      process_tiktok_settlement_atomic: {
        Args: { p_actor: string; p_statement_id: string }
        Returns: Json
      }
      receive_purchase_order_atomic: {
        Args: { p_po_id: string; p_received_by: string }
        Returns: Json
      }
      remove_order_item_atomic: {
        Args: { p_actor: string; p_item_id: string; p_order_id: string }
        Returns: Json
      }
      reset_transactional_data: { Args: never; Returns: Json }
      resolve_return_atomic: {
        Args: {
          p_actor: string
          p_condition: string
          p_notes: string
          p_photos: Json
          p_return_id: string
        }
        Returns: Json
      }
      retur_piutang_atomic: {
        Args: {
          p_actor: string
          p_amount: number
          p_faktur_id: string
          p_reason: string
        }
        Returns: Json
      }
      save_hpp_bom_atomic: {
        Args: {
          p_actor: string
          p_hpp_calculated: number
          p_hpp_manual: number
          p_lines: Json
          p_price: number
          p_product_id: string
        }
        Returns: Json
      }
      save_hutang_atomic: {
        Args: {
          p_actor?: string
          p_amount?: number
          p_description?: string
          p_due_date?: string
          p_id?: string
          p_invoice_date?: string
          p_invoice_number?: string
          p_mode: string
          p_supplier_id?: string
        }
        Returns: Json
      }
      save_piutang_atomic: {
        Args: {
          p_actor?: string
          p_amount?: number
          p_channel?: string
          p_customer_id?: string
          p_fee_amount?: number
          p_id?: string
          p_invoice_date?: string
          p_invoice_number?: string
          p_mode: string
          p_notes?: string
          p_order_id?: string
        }
        Returns: Json
      }
      schedule_installation_atomic: {
        Args: {
          p_actor: string
          p_date: string
          p_installer_id: string
          p_order_id: string
          p_time: string
        }
        Returns: Json
      }
      search_orders: {
        Args: {
          p_category?: string
          p_limit?: number
          p_offset?: number
          p_status?: string
          p_term?: string
        }
        Returns: Json
      }
      update_survey_atomic: {
        Args: {
          p_actor_id: string
          p_patch: Json
          p_rooms?: Json
          p_survey_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
