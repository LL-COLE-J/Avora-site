import type { CheckInDataset } from "@/src/domain/models";

export const pinkGala2027Synthetic: CheckInDataset = {
  event: {
    id: "event_pg27_demo",
    name: "Pink Gala 2027",
    startsAt: "2027-04-17T18:00:00-05:00",
    venueName: "The Grand Hall",
    status: "ready",
  },
  tables: [
    { id: "table_01", label: "Rose 1", zone: "Main floor" },
    { id: "table_02", label: "Rose 2", zone: "Main floor" },
    { id: "table_03", label: "Magnolia 3", zone: "East wing" },
  ],
  parties: [
    { id: "party_bennett", displayName: "Bennett party", guestIds: ["guest_01", "guest_02"] },
    { id: "party_carter_a", displayName: "Carter / Lewis party", guestIds: ["guest_03", "guest_04"] },
    { id: "party_carter_b", displayName: "Carter party", guestIds: ["guest_05"] },
    { id: "party_morgan", displayName: "Morgan party", guestIds: ["guest_06", "guest_07"] },
    { id: "party_reed", displayName: "Reed party", guestIds: ["guest_08"] },
  ],
  guests: [
    { id: "guest_01", eventId: "event_pg27_demo", partyId: "party_bennett", firstName: "Amelia", lastName: "Bennett", tableId: "table_01", status: "expected" },
    { id: "guest_02", eventId: "event_pg27_demo", partyId: "party_bennett", firstName: "Marcus", lastName: "Bennett", tableId: "table_01", status: "expected" },
    { id: "guest_03", eventId: "event_pg27_demo", partyId: "party_carter_a", firstName: "Jordan", lastName: "Carter", tableId: "table_02", status: "expected", note: "Confirm whether Taylor arrived separately." },
    { id: "guest_04", eventId: "event_pg27_demo", partyId: "party_carter_a", firstName: "Taylor", lastName: "Lewis", tableId: "table_02", status: "expected" },
    { id: "guest_05", eventId: "event_pg27_demo", partyId: "party_carter_b", firstName: "Jordan", lastName: "Carter", tableId: "table_03", status: "expected", note: "Dietary note on file." },
    { id: "guest_06", eventId: "event_pg27_demo", partyId: "party_morgan", firstName: "Priya", lastName: "Morgan", tableId: "table_03", status: "checked_in", checkedInAt: "2027-04-17T17:52:00-05:00" },
    { id: "guest_07", eventId: "event_pg27_demo", partyId: "party_morgan", firstName: "David", lastName: "Morgan", tableId: "table_03", status: "expected" },
    { id: "guest_08", eventId: "event_pg27_demo", partyId: "party_reed", firstName: "Sam", lastName: "Reed", status: "needs_attention", note: "Table assignment missing—send to event lead." },
  ],
  staff: [{ id: "staff_demo", displayName: "Demo volunteer", role: "volunteer" }],
};
