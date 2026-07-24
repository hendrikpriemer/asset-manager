import { describe, expect, it } from "vitest";
import { parseNameplateOcrText } from "./nameplate-ocr-parse";

describe("parseNameplateOcrText", () => {
  it("extracts an article number from a real 'ITEM-NO.' label (as seen on a real WAGO photo)", () => {
    const result = parseNameplateOcrText("W/AGO\nITEM-NO. 750-451\n8AI RTD/ adj.", []);

    expect(result.articleNumber).toBe("750-451");
    expect(result.rawText).toBe("W/AGO\nITEM-NO. 750-451\n8AI RTD/ adj.");
  });

  it.each([
    ["Art.-Nr.: 750-559", "750-559"],
    ["ArtNr 750-559", "750-559"],
    ["Artikelnummer: 750-559", "750-559"],
    ["Bestell-Nr. 750-559", "750-559"],
    ["Order No: 750-559", "750-559"],
    ["Type: 750-559", "750-559"],
  ])("recognizes the label pattern in %s", (text, expected) => {
    expect(parseNameplateOcrText(text, []).articleNumber).toBe(expected);
  });

  it("is case-insensitive when matching a label", () => {
    expect(parseNameplateOcrText("item-no. 750-451", []).articleNumber).toBe("750-451");
  });

  it("falls back to a bare dash-separated number when no label is recognized", () => {
    const result = parseNameplateOcrText("some noise 750-451 more noise", []);

    expect(result.articleNumber).toBe("750-451");
  });

  it("prefers a labeled match over the bare-number fallback when both are present", () => {
    const result = parseNameplateOcrText("noise 111-111 ITEM-NO. 750-451", []);

    expect(result.articleNumber).toBe("750-451");
  });

  it("recognizes R. STAHL's unlabeled 11-digit instance id printed under the barcode", () => {
    const result = parseNameplateOcrText(
      "8570/11-306-S-01-0-00-XXX\nOrder no.: 2084679\n10003806363\nDate: 04.2024",
      []
    );

    expect(result.articleNumber).toBe("10003806363");
  });

  it("prefers the STAHL instance id over the 'Order no.' label when both are present", () => {
    const result = parseNameplateOcrText("Order no.: 2084679\n10003806363", []);

    expect(result.articleNumber).toBe("10003806363");
  });

  it("prefers the STAHL instance id over the dash-separated fallback (e.g. from a type-code)", () => {
    const result = parseNameplateOcrText("8570/11-306-S-01-0-00-XXX\n10003806363", []);

    expect(result.articleNumber).toBe("10003806363");
  });

  it("does not treat an unrelated 11-digit number as a STAHL instance id unless it starts with 1000", () => {
    const result = parseNameplateOcrText("99998806363", []);

    expect(result.articleNumber).toBeNull();
  });

  it("returns null for an article number when nothing matches", () => {
    const result = parseNameplateOcrText("completely unrelated garbage text", []);

    expect(result.articleNumber).toBeNull();
  });

  it("finds a configured manufacturer name mentioned in the text, case-insensitively", () => {
    const result = parseNameplateOcrText("wago Hansastr. 27", ["WAGO", "Festo"]);

    expect(result.manufacturerName).toBe("WAGO");
  });

  it("returns null for the manufacturer name when none of the configured names are mentioned", () => {
    const result = parseNameplateOcrText("some other brand entirely", ["WAGO", "Festo"]);

    expect(result.manufacturerName).toBeNull();
  });

  it("returns null for the manufacturer name when no known names are configured", () => {
    const result = parseNameplateOcrText("WAGO Hansastr. 27", []);

    expect(result.manufacturerName).toBeNull();
  });
});
