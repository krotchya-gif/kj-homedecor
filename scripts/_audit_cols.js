
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const checks = {"orders": ["order_number", "admin_notes", "courier", "installed_at", "installed_by", "packed_at", "packed_by", "shipped_at", "shipped_by", "tracking_number", "return_reason", "returned_at", "estimated_completion"], "order_items": ["item_type", "dimension_l", "dimension_p", "dimension_t", "linked_laundry_id", "meter", "smokring_color", "style_type", "variant_color", "variant_size", "weight", "return_reason", "returned_at"], "products": ["description", "product_type", "color_variants", "dimension_l", "dimension_p", "dimension_t", "is_catalog_visible", "smokring_colors", "style_variants", "weight"], "inventory_movements": ["product_id"], "landing_settings": ["hero_video_url", "categories_label", "categories_title", "categories_subtitle", "cta_badge", "cta_title", "cta_subtitle", "portfolio_label", "portfolio_title", "portfolio_subtitle", "whyus_label", "whyus_title", "whyus_subtitle"], "payments": ["xendit_id"], "production_reports": ["job_id"], "order_preparation_checklists": ["notes"]};
(async () => {
  for (const [table, cols] of Object.entries(checks)) {
    for (const col of cols) {
      const { error } = await sb.from(table).select(col).limit(1);
      const msg = error?.message || '';
      const missing = /Could not find|column .* does not exist|Failed to parse|No such column|column ".+" of relation/.test(msg);
      if (missing) console.log('MISSING:', table + '.' + col);
    }
  }
  console.log('--- done ---');
})();
