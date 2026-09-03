// /workflows/new loads the same WorkflowFormPage used for editing,
// with params.id = 'new' which puts it into create-new mode.
// Next.js route matching: /workflows/new maps to /workflows/[id] with id='new'
// This file is just here to document the route — the [id] page handles it.
export { default } from '../[id]/page'
