import { NextRequest, NextResponse } from 'next/server'
import { lookupDeliveryStatus } from '@/server/tools/order-lookup'

export { lookupDeliveryStatus }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('order_id') || searchParams.get('tracking_number')

  if (!orderId) {
    return NextResponse.json(
      { error: 'order_id or tracking_number parameter is required' },
      { status: 400 }
    )
  }

  const data = lookupDeliveryStatus(orderId)
  return NextResponse.json({
    success: true,
    found: data.found,
    data,
    message: data.message,
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const orderId = body.order_id || body.tracking_number || ''
  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 })
  }
  const data = lookupDeliveryStatus(orderId)
  return NextResponse.json({ success: true, data, message: data.message })
}
