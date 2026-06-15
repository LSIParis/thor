'use server'

// Tickets managed via Zammad — this action is a no-op stub
export async function createTicket(_formData: FormData) {
  const url = process.env.ZAMMAD_URL
  if (url) {
    // Redirect handled client-side; nothing to do server-side
  }
}
