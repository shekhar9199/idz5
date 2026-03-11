import {
  Users,
  Bookings,
  Contacts,
  SubRequests,
  OttApps,
  Settings,
} from "@/lib/firestore";

export type { OttApp } from "@/lib/firestore";

export async function getUsers() {
  return Users.getAll();
}

export async function deleteUser(userId: string) {
  return Users.remove(userId);
}

export async function getBookings() {
  return Bookings.getAll();
}

export async function deleteBooking(bookingId: string) {
  return Bookings.remove(bookingId);
}

export async function clearAllBookings() {
  return Bookings.clearAll();
}

export async function getContactMessages() {
  return Contacts.getAll();
}

export async function deleteContactMessage(msgId: string) {
  return Contacts.remove(msgId);
}

export async function clearAllMessages() {
  return Contacts.clearAll();
}

export async function getSubRequests() {
  return SubRequests.getAll();
}

export async function deleteSubRequest(reqId: string) {
  return SubRequests.remove(reqId);
}

export async function clearAllSubRequests() {
  return SubRequests.clearAll();
}

export async function getWhatsAppNumber() {
  return Settings.getWhatsAppNumber();
}

export async function setWhatsAppNumber(number: string) {
  return Settings.setWhatsAppNumber(number);
}

export async function getOttApps() {
  return OttApps.getAll();
}

export async function saveOttApp(app: Omit<import("@/lib/firestore").OttApp, "id" | "createdAt">) {
  return OttApps.save(app);
}

export async function updateOttApp(id: string, updates: Partial<import("@/lib/firestore").OttApp>) {
  return OttApps.update(id, updates);
}

export async function deleteOttApp(id: string) {
  return OttApps.remove(id);
}
