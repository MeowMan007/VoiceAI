/**
 * Inserts demo businesses + workflows for the given Supabase user.
 * Usage: SEED_USER_ID=<uuid> node scripts/seed-dev.mjs
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const service = process.env.SUPABASE_SERVICE_ROLE_KEY
const ownerId = process.env.SEED_USER_ID

if (!url || !service || !ownerId) {
  console.error('Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SEED_USER_ID')
  process.exit(1)
}

const supabase = createClient(url, service)

const businesses = [
  {
    name: 'Sweet Delights Bakery',
    type: 'cake_shop',
    phone: '+91 98765 43210',
    description: 'Custom cakes with same-day express orders.',
    language: 'en',
  },
  {
    name: 'Apex Family Clinic',
    type: 'clinic',
    phone: '+91 98111 22334',
    description: 'Primary care and appointment booking.',
    language: 'en',
  },
]

const { data: inserted, error } = await supabase
  .from('businesses')
  .insert(businesses.map(b => ({ ...b, owner_id: ownerId })))
  .select()

if (error) {
  console.error(error)
  process.exit(1)
}

const cake = inserted.find(b => b.type === 'cake_shop')
const clinic = inserted.find(b => b.type === 'clinic')

const { error: wfError } = await supabase.from('workflows').insert([
  {
    business_id: cake.id,
    name: 'Cake Order Intake',
    trigger: 'missed_call',
    greeting: "Hi! Thanks for calling [Business Name]. Sorry we missed your call. I'm the AI assistant here to help you. Are you calling to place a cake order or do you have a general enquiry?",
    closing_message: "Thank you! We've received your details and our team will get back to you shortly.",
    language: 'en',
    fields: [
      { id: '1', label: 'Order Type', key: 'order_type', type: 'select', required: true, options: ['Custom Cake', 'Wedding Cake', 'Birthday Cake', 'General Enquiry'], order: 1 },
      { id: '2', label: 'Cake Flavour', key: 'flavour', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Cake Weight (kg)', key: 'weight', type: 'number', required: false, order: 3 },
      { id: '4', label: 'Required Date', key: 'required_date', type: 'date', required: true, order: 4 },
      { id: '5', label: 'Delivery or Pickup', key: 'delivery_preference', type: 'select', required: true, options: ['Delivery', 'Pickup'], order: 6 },
    ],
    conditions: [
      { id: '1', field: 'required_date', operator: 'less_than', value: '24', action: 'mark_urgent', action_label: 'If required within 24 hours, mark as urgent' },
    ],
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
  },
  {
    business_id: clinic.id,
    name: 'Appointment Booking',
    trigger: 'missed_call',
    greeting: "Hello! You've reached [Business Name]. Sorry we missed your call. I'm the virtual assistant. Are you calling to book a new appointment?",
    closing_message: 'Thank you for calling [Business Name]. We will confirm your appointment shortly.',
    language: 'en',
    fields: [
      { id: '1', label: 'Patient Name', key: 'patient_name', type: 'text', required: true, order: 2 },
      { id: '2', label: 'Preferred Date', key: 'preferred_date', type: 'date', required: true, order: 4 },
      { id: '3', label: 'Preferred Time', key: 'preferred_time', type: 'time', required: false, order: 5 },
      { id: '4', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 7 },
    ],
    conditions: [],
    post_action: 'create_record',
    calendar_enabled: true,
    is_active: true,
  },
])

if (wfError) {
  console.error(wfError)
  process.exit(1)
}

console.log('Seeded businesses:', inserted.map(b => b.name).join(', '))
