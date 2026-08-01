
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const tables = ['account_categories','account_mappings','accounts','assets','banners','bom','cash_accounts','categories','customers','hutang','install_bookings','install_checklists','inventory_movements','journal_entries','journal_lines','landing_settings','laundry_orders','laundry_payroll','laundry_rates','laundry_records','lembur_records','low_stock_alerts','material_price_history','materials','order_items','order_logs','order_material_consumption','order_preparation_checklists','order_progress_photos','orders','payments','piutang','portfolio_posts','production_jobs','production_reports','products','purchase_orders','purchase_requests','qc_records','returns','steam_jobs','stock_opname_items','stock_opname_sessions','style_rates','suppliers','tiktok_shop_orders','tiktok_shop_settings','tiktok_shop_statements','users'];
(async () => {
  const missing = [];
  for (const t of tables) {
    const { error } = await sb.from(t).select('*').limit(1);
    const msg = error?.message || '';
    if (/Could not find the table|does not exist|relation/.test(msg)) missing.push(t);
  }
  console.log('MISSING TABLES:', missing.join(', ') || '(none)');
  // RPC functions
  const rpcs = ['increment_stock_toko','increment_stock_toko_numeric','get_stock_toko','get_stock','update_steam_job','get_material_stock','create_stock_opname','process_return'];
  for (const fn of rpcs) {
    const { error } = await sb.rpc(fn, {});
    const msg = error?.message || '';
    if (/does not exist|Could not find the function/.test(msg)) console.log('MISSING RPC:', fn);
  }
  console.log('--- done ---');
})();
