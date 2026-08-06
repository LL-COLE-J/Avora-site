import type { Guest } from "./models";

export function guestFullName(guest: Pick<Guest, "firstName" | "lastName">) {
  return `${guest.firstName} ${guest.lastName}`.trim();
}

export function searchGuests(guests: Guest[], rawQuery: string) {
  const query = rawQuery.trim().toLocaleLowerCase();
  if (!query) return [];
  const terms = query.split(/\s+/);

  return guests.filter((guest) => {
    const searchable = guestFullName(guest).toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  }).sort((a, b) => {
    const aName = guestFullName(a).toLocaleLowerCase();
    const bName = guestFullName(b).toLocaleLowerCase();
    return Number(!aName.startsWith(query)) - Number(!bName.startsWith(query)) || aName.localeCompare(bName);
  });
}

export function duplicateNameIds(guests: Guest[]) {
  const groups = new Map<string, string[]>();
  for (const guest of guests) {
    const key = guestFullName(guest).toLocaleLowerCase();
    groups.set(key, [...(groups.get(key) ?? []), guest.id]);
  }
  return new Set([...groups.values()].filter((ids) => ids.length > 1).flat());
}
