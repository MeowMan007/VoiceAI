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
    driver_contact: '+91 98765 12345',
  },
  'ORD-102': {
    id: 'ORD-102',
    customer: 'Priya Patel',
    status: 'Preparing Order',
    eta: 'Tomorrow by 11:00 AM',
    current_location: 'Kitchen / Central Bakery Hub',
    item: 'Eggless Red Velvet Cake',
    driver_contact: 'Not yet assigned',
  },
  'TRK-902': {
    id: 'TRK-902',
    customer: 'Amit Verma',
    status: 'In Transit',
    eta: 'Today within 2 hours',
    current_location: 'Distribution Center Hub #4',
    item: 'Express Parcel Delivery',
    driver_contact: '+91 91234 56789',
  },
}

/** Mock courier dataset. Swap this function to call a real courier API later. */
export function lookupDeliveryStatus(orderId: string) {
  const cleanId = (orderId || '').toUpperCase().trim()
  const order = mockOrders[cleanId] || {
    id: cleanId || 'UNKNOWN',
    customer: 'Customer',
    status: 'In Transit with Courier',
    eta: 'Expected delivery by 6:00 PM today',
    current_location: 'Local Delivery Facility',
    item: 'Customer Package',
    driver_contact: '+91 98000 11223',
  }

  return {
    simulated: true,
    found: true,
    order_id: order.id,
    status: order.status,
    eta: order.eta,
    location: order.current_location,
    item: order.item,
    driver_contact: order.driver_contact,
    message: `Order ${order.id} is currently "${order.status}". Location: ${order.current_location}. ETA: ${order.eta}.`,
  }
}
