import { describe, expect, it } from "vitest";
import { buildAasSearchText } from "./aas-search-text";
import type { AasData, AasElementGroup } from "./aas";

function makeGroup(overrides: Partial<AasElementGroup> = {}): AasElementGroup {
  return {
    idShort: "Group",
    displayName: null,
    properties: [],
    files: [],
    groups: [],
    ...overrides,
  };
}

function makeAasData(overrides: Partial<AasData> = {}): AasData {
  return {
    id: "https://example.com/aas/lathe-1",
    idShort: "Lathe1",
    submodels: [],
    ...overrides,
  };
}

describe("buildAasSearchText", () => {
  it("includes the shell idShort, lowercased", () => {
    const result = buildAasSearchText(makeAasData({ idShort: "Lathe1" }));

    expect(result).toBe("lathe1");
  });

  it("includes a submodel's idShort, description and templateName", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({ idShort: "Nameplate" }),
            id: "sm-1",
            description: "Contains the nameplate information",
            templateName: "Digital Nameplate for industrial equipment",
            version: "2.0",
          },
        ],
      })
    );

    expect(result).toContain("nameplate");
    expect(result).toContain("contains the nameplate information");
    expect(result).toContain("digital nameplate for industrial equipment");
  });

  it("omits description and templateName when absent", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({ idShort: "Nameplate" }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toBe("lathe1 nameplate");
  });

  it("includes property idShorts and values", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({
              idShort: "Nameplate",
              properties: [
                { idShort: "ManufacturerName", value: "Acme Machine Works" },
                { idShort: "YearOfConstruction", value: null },
              ],
            }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toContain("manufacturername");
    expect(result).toContain("acme machine works");
    expect(result).toContain("yearofconstruction");
  });

  it("includes file idShorts and contentTypes, but not values", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({
              idShort: "MCAD",
              files: [
                {
                  idShort: "DigitalFile",
                  value: "https://example.com/part.stp",
                  contentType: "application/step",
                },
              ],
            }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toContain("digitalfile");
    expect(result).toContain("application/step");
    expect(result).not.toContain("part.stp");
  });

  it("omits a file's contentType when absent", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({
              idShort: "MCAD",
              files: [{ idShort: "DigitalFile", value: null, contentType: null }],
            }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toBe("lathe1 mcad digitalfile");
  });

  it("recurses into nested groups, including a group's own displayName", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({
              idShort: "Nameplate",
              groups: [
                makeGroup({
                  idShort: "ContactInformation",
                  displayName: "Contact Information",
                  properties: [{ idShort: "Street", value: "Hansastr. 27" }],
                }),
              ],
            }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toContain("contactinformation");
    expect(result).toContain("contact information");
    expect(result).toContain("street");
    expect(result).toContain("hansastr. 27");
  });

  it("joins multiple submodels", () => {
    const result = buildAasSearchText(
      makeAasData({
        submodels: [
          {
            ...makeGroup({ idShort: "Nameplate" }),
            id: "sm-1",
            description: null,
            templateName: null,
            version: null,
          },
          {
            ...makeGroup({ idShort: "TechnicalData" }),
            id: "sm-2",
            description: null,
            templateName: null,
            version: null,
          },
        ],
      })
    );

    expect(result).toContain("nameplate");
    expect(result).toContain("technicaldata");
  });
});
