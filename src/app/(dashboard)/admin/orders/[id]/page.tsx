'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  ChevronRight,
  Loader2,
  ImageIcon,
  FileText,
  Package,
  AlertTriangle,
  Truck,
  Calendar as CalendarIcon
} from 'lucide-react'
import { STATUS_LABELS } from '@/types'
import { Modal } from '@/components/ui/Modal'
import { generateInvoicePDF, generatePackingListPDF, generateFakturPDF, generateSuratJalanPDF } from '@/lib/invoice'
import { canRoleAdvanceNext, getResponsibleRoles } from '@/lib/order-detail'
import { Lightbox } from '@/components/ui/Lightbox'
import OrderActivityLog from '@/components/orders/OrderActivityLog'
import ScheduleInstallModal from '@/components/orders/ScheduleInstallModal'
import PhotoUploadModal from '@/components/orders/PhotoUploadModal'
import CancelOrderModal from '@/components/orders/CancelOrderModal'
import ReturnModal from '@/components/orders/ReturnModal'
import PaymentModal from '@/components/orders/PaymentModal'
import OrderPipelineStepper from '@/components/orders/OrderPipelineStepper'
import OrderSurveySection from '@/components/orders/OrderSurveySection'
import OrderSummarySection from '@/components/orders/OrderSummarySection'
import OrderItemsTable from '@/components/orders/OrderItemsTable'
import PreparationChecklist from '@/components/orders/PreparationChecklist'
import AddItemModal from '@/components/orders/AddItemModal'
import { useOrderDetail, ORDER_FMT } from '@/lib/use-order-detail'

// Phase 6B-4: page jadi KOMPOSISI murni — semua state & handlers di
// useOrderDetail (src/lib/use-order-detail.ts). Behavior-preserving.

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const d = useOrderDetail(id)

  if (d.loading) return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Memuat...</div>
  if (!d.order)
    return <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--neutral-400)' }}>Order tidak ditemukan.</div>

  const order = d.order
  const items = d.items
  const fmt = ORDER_FMT

  return (
    <div>
      {/* Back */}
      <Link
        href="/admin/orders"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.375rem',
          color: 'var(--neutral-600)',
          fontSize: '0.875rem',
          textDecoration: 'none',
          marginBottom: '1rem'
        }}
      >
        <ArrowLeft size={15} /> Kembali ke Pesanan
      </Link>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <h1 className="page-title" style={{ margin: 0 }}>
            Detail Pesanan
          </h1>
          <p
            style={{
              fontSize: '0.9rem',
              fontFamily: 'monospace',
              color: '#cc7030',
              fontWeight: '700',
              marginTop: '0.25rem'
            }}
          >
            {order.order_number || `#${id.slice(0, 8)}`}
          </p>
          <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--neutral-400)', marginTop: '0.1rem' }}>{id}</p>
        </div>
        {d.nextStatus &&
          !['done', 'returned', 'cancelled'].includes(order.status) &&
          canRoleAdvanceNext(d.currentUserRole, order.status) && (
            <button
              onClick={() => {
                if (d.nextStatus === 'scheduled') {
                  d.setScheduleForm({
                    date: d.orderBooking?.scheduled_date ?? '',
                    time: d.orderBooking?.scheduled_time ?? '',
                    installer_id: d.orderBooking?.installer_id ?? ''
                  })
                  d.setShowScheduleModal(true)
                } else {
                  d.openAdvanceModal(d.nextStatus!)
                }
              }}
              disabled={d.updating}
              title="Lanjut ke tahap berikutnya (status terkunci, tidak bisa dibatalkan)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.5rem',
                background: '#cc7030',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: d.updating ? 'not-allowed' : 'pointer'
              }}
            >
              {d.updating ? (
                <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <ChevronRight size={15} />
              )}
              Lanjut: {d.nextStageButtonLabel}
            </button>
          )}
        {d.nextStatus &&
          !['done', 'returned', 'cancelled'].includes(order.status) &&
          !canRoleAdvanceNext(d.currentUserRole, order.status) && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.25rem',
                background: 'var(--neutral-100)',
                color: 'var(--neutral-600)',
                border: '1px dashed #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                fontSize: '0.8rem',
                flexWrap: 'wrap'
              }}
            >
              🔒 Role <strong style={{ color: '#dc2626' }}>{d.currentUserRole}</strong> tidak boleh lanjut di stage ini.
              Stage <strong>{STATUS_LABELS[order.status as keyof typeof STATUS_LABELS]}</strong> adalah tanggung jawab:{' '}
              <strong style={{ color: '#cc7030' }}>{getResponsibleRoles(order.status)}</strong>
            </div>
          )}
        {['new', 'sorted'].includes(order.status) && (
          <button
            onClick={() => d.setShowCancelForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Batalkan pesanan (pembayaran di-void, jurnal dibalik)"
          >
            ❌ Batalkan
          </button>
        )}
        {['ready', 'done'].includes(order.status) && (
          <button
            onClick={() => d.setShowReturnForm(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              background: '#9333ea',
              color: '#fff',
              border: 'none',
              borderRadius: '0.5rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
            title="Catat barang kembali / retur dari pesanan ini"
          >
            📦 Return
          </button>
        )}
        {order.status !== 'cancelled' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() =>
                generateInvoicePDF({ order: { ...order, order_items: items }, orderNumber: order.order_number || id.slice(0, 8) })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <FileText size={14} /> Invoice
            </button>
            <button
              onClick={() =>
                generatePackingListPDF({ order: { ...order, order_items: items }, orderNumber: order.order_number || id.slice(0, 8) })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <Package size={14} /> Packing List
            </button>
            <button
              onClick={() =>
                generateFakturPDF({ order: { ...order, order_items: items }, orderNumber: order.order_number || id.slice(0, 8) })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <FileText size={14} /> Faktur
            </button>
            <button
              onClick={() =>
                generateSuratJalanPDF({
                  order: { ...order, order_items: items },
                  orderNumber: order.order_number || id.slice(0, 8),
                  courier: (order as { courier?: string }).courier,
                  waybill: (order as { tracking_number?: string }).tracking_number
                })
              }
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1rem',
                background: 'var(--surface)',
                color: 'var(--neutral-700)',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '0.8rem'
              }}
              title="Unduh dokumen PDF"
            >
              <Truck size={14} /> Surat Jalan
            </button>
          </div>
        )}
      </div>

      {/* Info booking pasang */}
      {d.orderBooking && ['scheduled', 'installing', 'done'].includes(order.status) && (
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid #e5e7eb',
            borderRadius: '0.75rem',
            padding: '0.9rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap'
          }}
        >
          <CalendarIcon size={16} style={{ color: '#cc7030' }} />
          <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>Jadwal Pasang:</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-700)' }}>
            {d.orderBooking.scheduled_date ? new Date(d.orderBooking.scheduled_date + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : 'Belum ada tanggal'}
            {d.orderBooking.scheduled_time ? ` • ${d.orderBooking.scheduled_time}` : ''}
          </span>
          <span style={{ fontSize: '0.85rem', color: 'var(--neutral-600)' }}>
            — Installer:{' '}
            <strong style={{ color: '#cc7030' }}>{d.orderBooking.installer?.name ?? 'belum di-assign'}</strong>
          </span>
        </div>
      )}

      <OrderPipelineStepper
        statuses={d.ORDER_STATUSES}
        statusIdx={d.statusIdx}
        currentStatus={order.status}
        photos={d.orderPhotos}
        onPhotoClick={(stage, urls) => d.setPhotoPopup({ stage, photos: urls })}
      />

      <OrderSummarySection
        order={order}
        statuses={d.ORDER_STATUSES}
        statusIdx={d.statusIdx}
        customer={d.customer}
        fmt={fmt}
        onAddPayment={() => d.setShowPaymentForm(true)}
      />

      <OrderSurveySection
        survey={order.survey}
        surveyLinkOpen={d.surveyLinkOpen}
        onCloseSurveyLink={() => d.setSurveyLinkOpen(false)}
        surveyCandidates={d.surveyCandidates}
        surveyLoading={d.surveyLoading}
        onUnlink={d.unlinkSurvey}
        onOpenSurveyLink={d.openSurveyLink}
        onLinkSurvey={d.linkSurvey}
      />

      <OrderItemsTable
        items={items}
        fmt={fmt}
        onAddItem={d.openItemForm}
        onToggleReady={d.toggleReady}
        onRemoveItem={d.removeItem}
      />

      <PreparationChecklist checklist={d.checklist} onUpdate={d.updateChecklistItem} />

      <AddItemModal
        open={d.showItemForm}
        onClose={() => {
          d.setShowItemForm(false)
          d.resetForm()
        }}
        onReset={() => {
          d.setShowItemForm(false)
          d.resetForm()
        }}
        itemType={d.itemType}
        setItemType={d.setItemType}
        itemForm={d.itemForm}
        setItemForm={d.setItemForm}
        searchProduct={d.searchProduct}
        setSearchProduct={d.setSearchProduct}
        products={d.products}
        boms={d.boms}
        laundryRate={d.laundryRate}
        savingItem={d.savingItem}
        fmt={fmt}
        onSubmit={d.addItem}
      />

      <OrderActivityLog logs={d.orderLogs} />

      <ScheduleInstallModal
        open={d.showScheduleModal}
        onClose={() => {
          d.setShowScheduleModal(false)
          d.setScheduleForm({ date: '', time: '', installer_id: '' })
        }}
        scheduling={d.scheduling}
        scheduleForm={d.scheduleForm}
        setScheduleForm={d.setScheduleForm}
        installers={d.installers}
        onSubmit={d.handleSchedule}
      />

      <PhotoUploadModal
        open={d.showPhotoModal}
        onClose={() => {
          d.setShowPhotoModal(false)
          d.setProgressPhotos([])
          d.setPendingStatus(null)
        }}
        pendingStatus={d.pendingStatus}
        progressPhotos={d.progressPhotos}
        setProgressPhotos={d.setProgressPhotos}
        uploadingPhoto={d.uploadingPhoto}
        updating={d.updating}
        onUpload={d.handlePhotoUpload}
        onConfirm={() => d.pendingStatus && d.updateStatus(d.pendingStatus, d.progressPhotos)}
      />

      <CancelOrderModal
        open={d.showCancelForm}
        onClose={() => d.setShowCancelForm(false)}
        cancelReason={d.cancelReason}
        setCancelReason={d.setCancelReason}
        onConfirm={d.handleCancel}
      />

      <ReturnModal
        open={d.showReturnForm}
        onClose={() => d.setShowReturnForm(false)}
        returnForm={d.returnForm}
        setReturnForm={d.setReturnForm}
        items={items}
        onSubmit={d.handleReturn}
      />

      <PaymentModal
        open={d.showPaymentForm}
        onClose={() => d.setShowPaymentForm(false)}
        paymentForm={d.paymentForm}
        setPaymentForm={d.setPaymentForm}
        saving={d.savingPayment}
        sisa={order.total_amount - order.dp_amount - order.lunas_amount}
        fmt={fmt}
        onSubmit={d.handleAddPayment}
      />

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <Modal open={!!d.photoPopup} onClose={() => d.setPhotoPopup(null)} maxWidth={480} padding="1.5rem" zIndex={300}>
        {d.photoPopup && (
          <>
            <div
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}
            >
              <div>
                <h3 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>📷 Foto Progress</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--neutral-600)', margin: '0.25rem 0 0' }}>
                  {STATUS_LABELS[d.photoPopup.stage as keyof typeof STATUS_LABELS]} — {d.photoPopup.photos.length} foto
                </p>
              </div>
              <button
                onClick={() => d.setPhotoPopup(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0.25rem' }}
              >
                ✕
              </button>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3,1fr)',
                gap: '0.5rem',
                maxHeight: 400,
                overflowY: 'auto'
              }}
            >
              {d.photoPopup.photos.map((url, i) => (
                <div
                  key={i}
                  style={{
                    aspectRatio: '1',
                    overflow: 'hidden',
                    borderRadius: '0.5rem',
                    border: '1px solid #e5e7eb',
                    cursor: 'pointer'
                  }}
                  onClick={() => {
                    d.setLightboxPhotos(d.photoPopup!.photos)
                    d.setLightboxIndex(i)
                    d.setLightboxOpen(true)
                  }}
                >
                  <img src={url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      {d.lightboxOpen && (
        <Lightbox
          photos={d.lightboxPhotos}
          currentIndex={d.lightboxIndex}
          onClose={() => d.setLightboxOpen(false)}
          onNext={() => d.setLightboxIndex((i) => (i < d.lightboxPhotos.length - 1 ? i + 1 : i))}
          onPrev={() => d.setLightboxIndex((i) => (i > 0 ? i - 1 : i))}
        />
      )}
    </div>
  )
}
