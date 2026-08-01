
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const exp = {"tables": ["account_categories", "account_mappings", "accounts", "assets", "banners", "bom", "cash_accounts", "categories", "customers", "hutang", "install_bookings", "install_checklists", "inventory_movements", "journal_entries", "journal_lines", "landing_settings", "laundry_orders", "laundry_payroll", "laundry_rates", "laundry_records", "lembur_records", "low_stock_alerts", "material_price_history", "materials", "order_items", "order_logs", "order_material_consumption", "order_preparation_checklists", "order_progress_photos", "orders", "orders_pipeline_reset_backup_20260602", "payments", "piutang", "portfolio_posts", "production_jobs", "production_reports", "products", "purchase_orders", "purchase_requests", "qc_records", "returns", "steam_jobs", "stock_opname_items", "stock_opname_sessions", "style_rates", "suppliers", "tiktok_shop_orders", "tiktok_shop_settings", "tiktok_shop_statements", "users"], "cols": {"orders": ["CONSTRAINT", "admin_notes", "courier", "estimated_completion", "installed_at", "installed_by", "order_number", "packed_at", "packed_by", "return_reason", "returned_at", "shipped_at", "shipped_by", "tracking_number"], "inventory_movements": ["CONSTRAINT", "order_id", "product_id", "production_job_id"], "payments": ["CONSTRAINT", "xendit_payment_id"], "order_items": ["dimension_l", "dimension_p", "dimension_t", "item_type", "linked_laundry_id", "meter", "return_reason", "returned_at", "smokring_color", "style_type", "variant_color", "variant_size", "weight"], "landing_settings": ["CONSTRAINT", "categories_label", "categories_subtitle", "categories_title", "cta_badge", "cta_subtitle", "cta_title", "hero_background_image", "hero_image_url", "hero_video_url", "instagram", "portfolio_label", "portfolio_subtitle", "portfolio_title", "seo_pixel_id", "theme_border_radius", "theme_preset", "theme_primary_color", "whatsapp_number", "whyus_card1_desc", "whyus_card1_title", "whyus_card2_desc", "whyus_card2_title", "whyus_card3_desc", "whyus_card3_title", "whyus_card4_desc", "whyus_card4_title", "whyus_label", "whyus_subtitle", "whyus_title"], "install_bookings": ["CONSTRAINT", "customer_name", "revision_reason", "scheduled_date"], "order_logs": ["CONSTRAINT"], "products": ["color_variants", "description", "dimension_l", "dimension_p", "dimension_t", "is_catalog_visible", "product_type", "smokring_colors", "style_variants", "weight"], "accounts": ["CONSTRAINT"], "production_jobs": ["revision_of", "revision_reason", "revision_round"], "production_reports": ["CONSTRAINT", "production_job_id"], "qc_records": ["CONSTRAINT"], "users": ["CONSTRAINT"], "account_mappings": ["CONSTRAINT"]}};
(async () => {
  const missingTables = [];
  const missingCols = [];
  for (const t of exp.tables) {
    const { error } = await sb.from(t).select('*').limit(1);
    const msg = error?.message || '';
    if (/Could not find the table|does not exist|relation/.test(msg)) missingTables.push(t);
  }
  for (const [t, cols] of Object.entries(exp.cols)) {
    for (const c of cols) {
      const { error } = await sb.from(t).select(c).limit(1);
      const msg = error?.message || '';
      if (/Could not find the (table|column)|does not exist|relation|schema cache/.test(msg)) {
        if (/table/.test(msg) && /Could not find the table|relation/.test(msg)) { }
        else missingCols.push(t + '.' + c);
      }
    }
  }
  console.log('MISSING_TABLES:' + JSON.stringify(missingTables));
  console.log('MISSING_COLS:' + JSON.stringify(missingCols));
  console.log('--- done ---');
})();
