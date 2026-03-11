import { Bookings, Contacts, SubRequests } from "@/lib/firestore";

export type { Booking, ContactMessage, SubRequest } from "@/lib/firestore";

export async function saveBooking(booking: { serviceId: string; name: string; email: string; requirement: string }) {
  return Bookings.save(booking);
}

export async function saveContactMessage(msg: { name: string; email: string; message: string }) {
  return Contacts.save(msg);
}

export async function saveSubRequest(req: { appId: string; appName: string; userName: string; userEmail: string }) {
  return SubRequests.save(req);
}
