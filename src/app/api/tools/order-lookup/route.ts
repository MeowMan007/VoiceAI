import { NextRequest, NextResponse } from 'next/server'

// Sample delivery/order database
const mockOrders: Record<string, {
  id: string
  customer: string
  status: string
  eta: string
  current_location: string
  item: string
  driver_contact: string
}> = {
  'ORD-101': {
    id: 'ORD-101',
    customer: 'Rahul Sharma',
    status: 'Out for Delivery',
    eta: 'Today by 4:30 PM',
    current_location: 'Indiranagar 100ft Road, Bangalore',
    item: 'Custom Chocolate Truffle Cake (1kg)',
    driver_contact: '+91 98765 12345'
  },
  'ORD-102': {
    id: 'ORD-102',
    customer: 'Priya Patel',
    status: 'Preparing Order',
    eta: 'Tomorrow by 11:00 AM',
    current_location: 'Kitchen / Central Bakery Hub',
    item: 'Eggless Red Velvet Cake',
    driver_contact: 'Not yet assigned'
  },
  'TRK-902': {
    id: 'TRK-902',
    customer: 'Amit Verma',
    status: 'In Transit',
    eta: 'Today within 2 hours',
    current_location: 'Distribution Center Hub #4',
    item: 'Express Parcel Delivery',
    driver_contact: '+91 91234 56789'
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const orderId = searchParams.get('order_id') || searchParams.get('tracking_number')

  if (!orderId) {
    return NextResponse.json(
      { error: 'order_id or tracking_number parameter is required' },
      { status: 400 }
    )
  }

  const cleanId = orderId.toUpperCase().trim()
  const order = mockOrders[cleanId]

  if (!order) {
    // Generate simulated status for any arbitrary ID
    return NextResponse.json({
      success: true,
      found: true,
      data: {
        id: cleanId,
        status: 'In Transit with Courier',
        eta: 'Expected delivery by 6:00 PM today',
        current_location: 'Local Delivery Facility',
        item: 'Customer Package',
        driver_contact: '+91 98000 11223'
      },
      message: `Tracking details found for ${cleanId}. Order is in transit and on schedule.`
    })
  }

  return NextResponse.json({
    success: true,
    found: true,
    data: order,
    message: `Order ${order.id} for ${order.customer} is currently "${order.status}". Current location: ${order.current_location}. ETA: ${order.eta}.`
  })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const orderId = (body.order_id || body.tracking_number || '').toUpperCase().trim()

  if (!orderId) {
    return NextResponse.json({ error: 'order_id required' }, { status: 400 })
  }

  const order = mockOrders[orderId] || {
    id: orderId,
    customer: body.customer_name || 'Customer',
    status: 'Confirmed & Scheduled',
    eta: 'Within 24 hours',
    current_location: 'Main Logistics Depot',
    item: 'Delivery Package',
    driver_contact: '+91 98000 11223'
  }

  return NextResponse.json({
    success: true,
    data: order,
    message: `Order ${order.id} status: ${order.status}. ETA: ${order.eta}. Current location: ${order.current_location}.`
  })
}
