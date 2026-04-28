-- Landing page settings table
-- Stores hero content, WhatsApp, trust badges, CTA settings

CREATE TABLE landing_settings (
  id TEXT PRIMARY KEY DEFAULT 'hero',
  hero_title TEXT DEFAULT 'Percantik Ruanganmu\ndengan Gorden Premium',
  hero_subtitle TEXT DEFAULT 'Spesialis gorden, curtain, dan roman blind custom berkualitas tinggi.\nPemasangan profesional ke seluruh Jabodetabek.',
  hero_cta_text TEXT DEFAULT 'Lihat Katalog',
  hero_cta_link TEXT DEFAULT '#products',
  whatsapp_number TEXT DEFAULT '6281234567890',
  whatsapp_message TEXT DEFAULT 'Halo KJ Homedecor, saya ingin konsultasi gorden',
  trust_badges JSONB DEFAULT '[{"icon":"Star","label":"500+ Pelanggan Puas"},{"icon":"Shield","label":"Garansi Kualitas"},{"icon":"Truck","label":"Pasang Se-Jabodetabek"}]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO landing_settings (id) VALUES ('hero');

-- RLS
ALTER TABLE landing_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read landing settings" ON landing_settings FOR SELECT USING (true);
CREATE POLICY "Only admin can update landing settings" ON landing_settings FOR UPDATE USING (true);
