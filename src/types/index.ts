export type BusinessType = 'cake_shop' | 'clinic' | 'real_estate' | 'delivery' | 'repair' | 'other'
export type Language = 'en' | 'hi'
export type CallStatus = 'new' | 'in_progress' | 'completed' | 'contacted' | 'closed'
export type Urgency = 'normal' | 'urgent' | 'low'
export type FollowUpStatus = 'pending' | 'contacted' | 'resolved' | 'closed'

export interface Business {
  id: string
  owner_id: string
  name: string
  type: BusinessType
  phone?: string
  description?: string
  language: Language
  logo_url?: string
  created_at: string
  updated_at: string
}

export interface WorkflowField {
  id: string
  label: string
  key: string
  type: 'text' | 'number' | 'date' | 'time' | 'select' | 'boolean'
  required: boolean
  options?: string[]
  order: number
}

export interface WorkflowCondition {
  id: string
  field: string
  operator: 'equals' | 'contains' | 'greater_than' | 'less_than' | 'not_equals'
  value: string
  action: 'mark_urgent' | 'send_notification' | 'create_calendar_event' | 'create_callback'
  action_label: string
}

export interface Workflow {
  id: string
  business_id: string
  name: string
  trigger: string
  greeting: string
  closing_message: string
  language: Language
  fields: WorkflowField[]
  conditions: WorkflowCondition[]
  post_action: string
  calendar_enabled: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  business?: Business
}

export interface TranscriptMessage {
  role: 'assistant' | 'user'
  content: string
  timestamp: string
}

export interface Call {
  id: string
  business_id: string
  workflow_id: string
  caller_name?: string
  caller_phone?: string
  status: CallStatus
  intent?: string
  summary?: string
  urgency: Urgency
  follow_up_status: FollowUpStatus
  transcript: TranscriptMessage[]
  collected_data: Record<string, unknown>
  language_used: Language
  duration_seconds?: number
  calendar_event_id?: string
  calendar_event_url?: string
  created_at: string
  updated_at: string
  business?: Business
  workflow?: Workflow
}

export interface CalendarEvent {
  id: string
  title: string
  description?: string
  start: string
  end: string
  attendees?: string[]
  location?: string
  status?: 'confirmed' | 'tentative' | 'cancelled'
  htmlLink?: string
}

export interface DashboardStats {
  total_calls: number
  pending_calls: number
  urgent_calls: number
  completed_calls: number
  today_calls: number
}

export interface SimulatorMessage {
  id: string
  role: 'assistant' | 'user'
  content: string
  timestamp: Date
  isLoading?: boolean
}

export const BUSINESS_TYPES: Record<BusinessType, { label: string; icon: string; color: string; description: string }> = {
  cake_shop: {
    label: 'Bakery & Cake Shop',
    icon: 'Bakery',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Handle cake orders, custom requests, and delivery queries'
  },
  clinic: {
    label: 'Clinic & Healthcare',
    icon: 'Clinic',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Manage appointments, patient enquiries, and scheduling'
  },
  real_estate: {
    label: 'Real Estate & Properties',
    icon: 'Property',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Qualify leads, schedule viewings, and handle property enquiries'
  },
  delivery: {
    label: 'Logistics & Delivery',
    icon: 'Dispatch',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Manage delivery requests, tracking, and logistics queries'
  },
  repair: {
    label: 'Maintenance & Repairs',
    icon: 'Service',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Handle service requests, urgency, and scheduling visits'
  },
  other: {
    label: 'General Business',
    icon: 'General',
    color: 'from-zinc-800 to-zinc-900',
    description: 'Custom workflow for any business type'
  }
}

export const WORKFLOW_TEMPLATES: Record<BusinessType, Partial<Workflow>> = {
  cake_shop: {
    name: 'Cake Order Intake',
    greeting: "Hi! Thanks for calling [Business Name]. Sorry we missed your call. I'm the AI assistant here to help you. Are you calling to place a cake order or do you have a general enquiry?",
    closing_message: "Thank you! We've received your details and our team will get back to you shortly. Have a great day!",
    fields: [
      { id: '1', label: 'Order Type', key: 'order_type', type: 'select', required: true, options: ['Custom Cake', 'Wedding Cake', 'Birthday Cake', 'General Enquiry'], order: 1 },
      { id: '2', label: 'Cake Flavour', key: 'flavour', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Cake Weight (kg)', key: 'weight', type: 'number', required: false, order: 3 },
      { id: '4', label: 'Required Date', key: 'required_date', type: 'date', required: true, order: 4 },
      { id: '5', label: 'Custom Message', key: 'custom_message', type: 'text', required: false, order: 5 },
      { id: '6', label: 'Delivery or Pickup', key: 'delivery_preference', type: 'select', required: true, options: ['Delivery', 'Pickup'], order: 6 },
      { id: '7', label: 'Budget', key: 'budget', type: 'text', required: false, order: 7 }
    ],
    conditions: [
      { id: '1', field: 'required_date', operator: 'less_than', value: '24', action: 'mark_urgent', action_label: 'If required within 24 hours, mark as urgent' }
    ],
    calendar_enabled: true,
    post_action: 'create_record'
  },
  clinic: {
    name: 'Appointment Booking',
    greeting: "Hello! You've reached [Business Name]. Sorry we missed your call. I'm the virtual assistant. Are you calling to book a new appointment, reschedule, cancel, or do you have a general enquiry?",
    closing_message: "Thank you for calling [Business Name]. We'll confirm your appointment shortly. Please note that for medical emergencies, please call 112 immediately.",
    fields: [
      { id: '1', label: 'Request Type', key: 'request_type', type: 'select', required: true, options: ['New Appointment', 'Reschedule', 'Cancellation', 'General Enquiry'], order: 1 },
      { id: '2', label: 'Patient Name', key: 'patient_name', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Preferred Doctor / Specialty', key: 'doctor_preference', type: 'text', required: false, order: 3 },
      { id: '4', label: 'Preferred Date', key: 'preferred_date', type: 'date', required: true, order: 4 },
      { id: '5', label: 'Preferred Time', key: 'preferred_time', type: 'time', required: false, order: 5 },
      { id: '6', label: 'Reason for Visit', key: 'reason', type: 'text', required: false, order: 6 },
      { id: '7', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 7 }
    ],
    conditions: [
      { id: '1', field: 'request_type', operator: 'equals', value: 'New Appointment', action: 'create_calendar_event', action_label: 'Create calendar event for new appointments' }
    ],
    calendar_enabled: true,
    post_action: 'create_record'
  },
  real_estate: {
    name: 'Lead Qualification',
    greeting: "Hello! Thanks for calling [Business Name]. Sorry we missed you. I'm the AI assistant. Are you looking to buy, rent, sell a property, or schedule a site visit?",
    closing_message: "Excellent! We've captured your requirements. One of our property consultants will reach out to you soon. Thank you for your interest!",
    fields: [
      { id: '1', label: 'Interest Type', key: 'interest_type', type: 'select', required: true, options: ['Buy', 'Rent', 'Sell', 'Site Visit'], order: 1 },
      { id: '2', label: 'Property Type', key: 'property_type', type: 'select', required: true, options: ['Apartment', 'House', 'Villa', 'Commercial', 'Plot'], order: 2 },
      { id: '3', label: 'Preferred Location', key: 'location', type: 'text', required: true, order: 3 },
      { id: '4', label: 'Budget', key: 'budget', type: 'text', required: true, order: 4 },
      { id: '5', label: 'Timeline', key: 'timeline', type: 'text', required: false, order: 5 },
      { id: '6', label: 'Preferred Visit Date', key: 'visit_date', type: 'date', required: false, order: 6 },
      { id: '7', label: 'Contact Name', key: 'contact_name', type: 'text', required: true, order: 7 }
    ],
    conditions: [
      { id: '1', field: 'interest_type', operator: 'equals', value: 'Site Visit', action: 'create_calendar_event', action_label: 'Create calendar event for site visits' }
    ],
    calendar_enabled: true,
    post_action: 'create_record'
  },
  delivery: {
    name: 'Delivery Request Handler',
    greeting: "Hi! This is [Business Name]. Sorry we missed your call. I'm the virtual assistant. Are you calling for a new delivery, tracking an existing one, or need help with a delivery?",
    closing_message: "Thank you! Your request has been logged. Our team will contact you shortly to confirm the details.",
    fields: [
      { id: '1', label: 'Request Type', key: 'request_type', type: 'select', required: true, options: ['New Delivery', 'Track Existing', 'Support'], order: 1 },
      { id: '2', label: 'Pickup Location', key: 'pickup_location', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Delivery Location', key: 'delivery_location', type: 'text', required: true, order: 3 },
      { id: '4', label: 'Package Type', key: 'package_type', type: 'text', required: false, order: 4 },
      { id: '5', label: 'Preferred Time', key: 'preferred_time', type: 'text', required: false, order: 5 },
      { id: '6', label: 'Tracking Number (if existing)', key: 'tracking_number', type: 'text', required: false, order: 6 },
      { id: '7', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 7 }
    ],
    conditions: [
      { id: '1', field: 'request_type', operator: 'equals', value: 'New Delivery', action: 'create_calendar_event', action_label: 'Schedule delivery slot on calendar' }
    ],
    calendar_enabled: false,
    post_action: 'create_record'
  },
  repair: {
    name: 'Service Request',
    greeting: "Hello! You've reached [Business Name]. Sorry we missed your call. I'm the virtual assistant. What service do you need help with today?",
    closing_message: "We've logged your service request. Our team will contact you to confirm the visit. Thank you for choosing [Business Name]!",
    fields: [
      { id: '1', label: 'Service Type', key: 'service_type', type: 'text', required: true, order: 1 },
      { id: '2', label: 'Issue Description', key: 'issue_description', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Address', key: 'address', type: 'text', required: true, order: 3 },
      { id: '4', label: 'Urgency', key: 'urgency', type: 'select', required: true, options: ['Normal', 'Urgent', 'Emergency'], order: 4 },
      { id: '5', label: 'Preferred Visit Date', key: 'preferred_date', type: 'date', required: false, order: 5 },
      { id: '6', label: 'Preferred Time Slot', key: 'preferred_time', type: 'select', required: false, options: ['Morning (9AM-12PM)', 'Afternoon (12PM-4PM)', 'Evening (4PM-7PM)'], order: 6 },
      { id: '7', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 7 }
    ],
    conditions: [
      { id: '1', field: 'urgency', operator: 'equals', value: 'Emergency', action: 'mark_urgent', action_label: 'Mark as urgent for emergency requests' },
      { id: '2', field: 'urgency', operator: 'equals', value: 'Urgent', action: 'mark_urgent', action_label: 'Mark as urgent for urgent requests' }
    ],
    calendar_enabled: true,
    post_action: 'create_record'
  },
  other: {
    name: 'General Enquiry Handler',
    greeting: "Hello! Thanks for calling [Business Name]. Sorry we missed your call. I'm the virtual assistant. How can I help you today?",
    closing_message: "Thank you for calling! We've noted your enquiry and will get back to you soon.",
    fields: [
      { id: '1', label: 'Enquiry Type', key: 'enquiry_type', type: 'text', required: true, order: 1 },
      { id: '2', label: 'Details', key: 'details', type: 'text', required: true, order: 2 },
      { id: '3', label: 'Contact Name', key: 'contact_name', type: 'text', required: true, order: 3 },
      { id: '4', label: 'Contact Number', key: 'contact_number', type: 'text', required: true, order: 4 }
    ],
    conditions: [],
    calendar_enabled: false,
    post_action: 'create_record'
  }
}
