import { describe, expect, it } from "vitest";
import { pinkGala2027Synthetic } from "../src/data/synthetic/pink-gala-2027";
import { duplicateNameIds, searchGuests } from "../src/domain/guest-search";

describe("guest search", () => {
  it("does not show every guest for an empty query", () => {
    expect(searchGuests(pinkGala2027Synthetic.guests, "   ")).toEqual([]);
  });

  it("matches partial names without case sensitivity", () => {
    expect(searchGuests(pinkGala2027Synthetic.guests, "BEN").map((guest) => guest.id)).toEqual(["guest_01", "guest_02"]);
  });

  it("uses every search term", () => {
    expect(searchGuests(pinkGala2027Synthetic.guests, "jordan car").map((guest) => guest.id)).toEqual(["guest_03", "guest_05"]);
  });

  it("flags every guest sharing the same normalized name", () => {
    expect([...duplicateNameIds(pinkGala2027Synthetic.guests)].sort()).toEqual(["guest_03", "guest_05"]);
  });
});
