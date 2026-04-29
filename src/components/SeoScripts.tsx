'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'

export default function SeoScripts() {
  const [pixelId, setPixelId] = useState('')
  const [ga4Id, setGa4Id] = useState('')

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('landing_settings')
      .select('seo_pixel_id, seo_ga4_id')
      .eq('id', 'hero')
      .single()
      .then(({ data }) => {
        if (data) {
          setPixelId((data as any).seo_pixel_id ?? '')
          setGa4Id((data as any).seo_ga4_id ?? '')
        }
      })
  }, [])

  return (
    <>
      {pixelId && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              !function(f,b,e,v,n,t,s)
              {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
              n.callMethod.apply(n,arguments):n.queue.push(arguments)};
              if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
              n.queue=[];t=b.createElement(e);t.async=!0;
              t.src=v;s=b.getElementsByTagName(e)[0];
              s.parentNode.insertBefore(t,s)}(window, document,'script',
              'https://connect.facebook.net/en_US/fbevents.js');
              fbq('init', '${pixelId}');
              fbq('track', 'PageView');
            `,
          }}
        />
      )}
      {ga4Id && (
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${ga4Id}');
            `,
          }}
        />
      )}
    </>
  )
}