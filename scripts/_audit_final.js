
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const checks = {
  'landing_settings': ['whatsapp_number','whatsapp_message','seo_pixel_id','seo_ga4_id','seo_title','seo_description','seo_keywords','seo_og_image','instagram','facebook','tiktok','shopee','tokopedia','address','phone','trust_badges','hero_title','hero_subtitle','hero_cta_text','hero_cta_link','hero_image_url'],
  'install_bookings': ['scheduled_date','scheduled_time','source','revision_reason','revision_photos','status'],
  'orders': ['admin_notes','courier','tracking_number','packed_at','packed_by','shipped_at','shipped_by','installed_at','installed_by','return_reason','returned_at'],
  'products': ['is_catalog_visible','style_variants','smokring_colors','color_variants','dimension_p','dimension_l','dimension_t','weight'],
  'order_items': ['meter','style_type','smokring_color','variant_color','variant_size','dimension_p','dimension_l','dimension_t','weight','linked_laundry_id','return_reason','returned_at'],
  'payments': ['xendit_payment_id'],
  'production_reports': ['production_job_id'],
  'production_jobs': ['revision_of','revision_round','round'],
  'order_logs': ['action','notes','staff_id'],
  'stock_opname_sessions': ['status','created_by','approved_by'],
  'inventory_movements': ['order_id','production_job_id','new_stock'],
  'materials': ['stock_gudang'],
  'users': ['role'],
};
(async () => {
  for (const [t, cols] of Object.entries(checks)) {
    const missing = [];
    for (const c of cols) {
      const { error } = await sb.from(t).select(c).limit(1);
      const msg = error?.message || '';
      if (/does not exist|Could not find the column|schema cache/.test(msg)) missing.push(c);
    }
    console.log(t, '=> MISSING:', missing.join(', ') || '(semua ADA)');
  }
  console.log('--- done ---');
})();
