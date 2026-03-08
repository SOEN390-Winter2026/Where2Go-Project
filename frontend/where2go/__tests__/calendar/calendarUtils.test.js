import {
  getValidCalendarIds,
  fetchCalendarsIfPermitted,
} from "../../src/utils/calendarUtils";
import * as Calendar from "expo-calendar";

jest.mock("expo-calendar");

describe("getValidCalendarIds", () => {
  it("returns ids that exist in allCalendars", () => {
    const savedIds = ["cal-1", "cal-2", "cal-3"];
    const allCalendars = [
      { id: "cal-1", title: "Work" },
      { id: "cal-2", title: "Personal" },
    ];
    expect(getValidCalendarIds(savedIds, allCalendars)).toEqual([
      "cal-1",
      "cal-2",
    ]);
  });

  it("returns empty array when no saved ids match", () => {
    const savedIds = ["cal-x", "cal-y"];
    const allCalendars = [
      { id: "cal-1", title: "Work" },
      { id: "cal-2", title: "Personal" },
    ];
    expect(getValidCalendarIds(savedIds, allCalendars)).toEqual([]);
  });

  it("returns all ids when all match", () => {
    const savedIds = ["cal-1", "cal-2"];
    const allCalendars = [
      { id: "cal-1", title: "Work" },
      { id: "cal-2", title: "Personal" },
    ];
    expect(getValidCalendarIds(savedIds, allCalendars)).toEqual([
      "cal-1",
      "cal-2",
    ]);
  });

  it("handles numeric calendar ids via String coercion", () => {
    const savedIds = ["123", 456];
    const allCalendars = [
      { id: 123, title: "A" },
      { id: "456", title: "B" },
    ];
    expect(getValidCalendarIds(savedIds, allCalendars)).toEqual(["123", 456]);
  });

  it("returns empty array for empty savedIds", () => {
    expect(
      getValidCalendarIds([], [{ id: "cal-1", title: "Work" }])
    ).toEqual([]);
  });

  it("returns empty array for empty allCalendars", () => {
    expect(getValidCalendarIds(["cal-1"], [])).toEqual([]);
  });
});

describe("fetchCalendarsIfPermitted", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns calendars on success", async () => {
    const mockCalendars = [
      { id: "cal-1", title: "Work", color: "#123" },
      { id: "cal-2", title: "Personal", color: "#456" },
    ];
    Calendar.getCalendarsAsync.mockResolvedValue(mockCalendars);

    const result = await fetchCalendarsIfPermitted();

    expect(result).toEqual(mockCalendars);
    expect(Calendar.getCalendarsAsync).toHaveBeenCalledWith(
      Calendar.EntityTypes.EVENT
    );
  });

  it("returns null when getCalendarsAsync throws", async () => {
    Calendar.getCalendarsAsync.mockRejectedValue(new Error("Permission denied"));

    const result = await fetchCalendarsIfPermitted();

    expect(result).toBeNull();
  });

  it("returns null when getCalendarsAsync rejects with any error", async () => {
    Calendar.getCalendarsAsync.mockRejectedValue(
      new Error("Network request failed")
    );

    const result = await fetchCalendarsIfPermitted();

    expect(result).toBeNull();
  });
});
