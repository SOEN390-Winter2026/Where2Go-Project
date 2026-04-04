const { trailingAsciiDigitSuffix } = require("../../src/utils/trailingDigits");

describe("trailingAsciiDigitSuffix", () => {
  it("returns trailing digit run at end of compact floor keys", () => {
    expect(trailingAsciiDigitSuffix("h7")).toBe("7");
    expect(trailingAsciiDigitSuffix("floor12")).toBe("12");
  });

  it("returns empty string when no trailing digits", () => {
    expect(trailingAsciiDigitSuffix("")).toBe("");
    expect(trailingAsciiDigitSuffix("ab")).toBe("");
    expect(trailingAsciiDigitSuffix("12a")).toBe("");
  });
});
