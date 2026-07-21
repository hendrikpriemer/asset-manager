import { afterEach, describe, expect, it, vi } from "vitest";
import { extractNameplateData } from "./aas-nameplate";
import type { AasElementGroup, AasSubmodelData } from "./aas";

afterEach(() => {
  vi.unstubAllGlobals();
});

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

function makeNameplateSubmodel(
  overrides: Partial<AasSubmodelData> = {}
): AasSubmodelData {
  return {
    id: "https://example.com/sm/nameplate",
    idShort: "Nameplate",
    displayName: null,
    description: null,
    templateName: "Digital Nameplate for industrial equipment",
    version: "2.0",
    properties: [],
    files: [],
    groups: [],
    ...overrides,
  };
}

describe("extractNameplateData", () => {
  it("returns null for a submodel that isn't a recognized Nameplate template", () => {
    const submodel = makeNameplateSubmodel({ templateName: "Some Other Template" });

    expect(extractNameplateData(submodel)).toBeNull();
  });

  it("returns null when the submodel has no recognized template at all", () => {
    const submodel = makeNameplateSubmodel({ templateName: null });

    expect(extractNameplateData(submodel)).toBeNull();
  });

  describe("product properties", () => {
    it("includes only known product properties that have a value, in display order", () => {
      const submodel = makeNameplateSubmodel({
        properties: [
          { idShort: "ProductArticleNumberOfManufacturer", value: "ART-1" },
          { idShort: "URIOfTheProduct", value: "https://example.com/product" },
          { idShort: "SerialNumber", value: null },
          { idShort: "SomeUnrelatedProperty", value: "ignored" },
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.productProperties).toEqual([
        { idShort: "URIOfTheProduct", value: "https://example.com/product" },
        { idShort: "ProductArticleNumberOfManufacturer", value: "ART-1" },
      ]);
    });

    it("resolves a recognized CountryOfOrigin code to its full country name", () => {
      const submodel = makeNameplateSubmodel({
        properties: [{ idShort: "CountryOfOrigin", value: "DE" }],
      });

      const result = extractNameplateData(submodel);

      expect(result?.productProperties).toEqual([
        { idShort: "CountryOfOrigin", value: "Germany (DE)" },
      ]);
    });

    it("falls back to the raw CountryOfOrigin code when resolving it throws", () => {
      const submodel = makeNameplateSubmodel({
        properties: [{ idShort: "CountryOfOrigin", value: "1" }],
      });

      const result = extractNameplateData(submodel);

      expect(result?.productProperties).toEqual([
        { idShort: "CountryOfOrigin", value: "1" },
      ]);
    });

    it("falls back to the raw CountryOfOrigin code when resolving it yields nothing", () => {
      class EmptyDisplayNames {
        of(): string | undefined {
          return undefined;
        }
      }
      vi.stubGlobal("Intl", { ...Intl, DisplayNames: EmptyDisplayNames });

      const submodel = makeNameplateSubmodel({
        properties: [{ idShort: "CountryOfOrigin", value: "DE" }],
      });

      const result = extractNameplateData(submodel);

      expect(result?.productProperties).toEqual([
        { idShort: "CountryOfOrigin", value: "DE" },
      ]);
    });

    it("groups only the populated Hardware/Firmware/Software versions", () => {
      const submodel = makeNameplateSubmodel({
        properties: [
          { idShort: "HardwareVersion", value: "1.0" },
          { idShort: "SoftwareVersion", value: null },
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.versions).toEqual([{ idShort: "HardwareVersion", value: "1.0" }]);
    });
  });

  describe("manufacturer", () => {
    it("reads the manufacturer name and company logo file when present", () => {
      const submodel = makeNameplateSubmodel({
        properties: [{ idShort: "ManufacturerName", value: "Acme Machine Works" }],
        files: [{ idShort: "CompanyLogo", value: "https://example.com/logo.png", contentType: "image/png" }],
      });

      const result = extractNameplateData(submodel);

      expect(result?.manufacturerName).toBe("Acme Machine Works");
      expect(result?.companyLogo).toEqual({
        idShort: "CompanyLogo",
        value: "https://example.com/logo.png",
        contentType: "image/png",
      });
    });

    it("leaves manufacturer name and logo null when absent", () => {
      const result = extractNameplateData(makeNameplateSubmodel());

      expect(result?.manufacturerName).toBeNull();
      expect(result?.companyLogo).toBeNull();
    });
  });

  describe("contact information", () => {
    it("leaves address, phone, fax, email and vCard null when there is no ContactInformation group", () => {
      const result = extractNameplateData(makeNameplateSubmodel());

      expect(result?.address).toBeNull();
      expect(result?.phone).toBeNull();
      expect(result?.fax).toBeNull();
      expect(result?.email).toBeNull();
      expect(result?.vCard).toBeNull();
    });

    it("assembles a full address from street, zipcode, city and a NationalCode-resolved country", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            properties: [
              { idShort: "Street", value: "Hansastr. 27" },
              { idShort: "Zipcode", value: "32423" },
              { idShort: "CityTown", value: "Minden" },
              { idShort: "StateCounty", value: "NRW" },
              { idShort: "NationalCode", value: "DE" },
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.address).toBe("Hansastr. 27, 32423 Minden, NRW, Germany");
    });

    it("falls back to a PO box, PO box zip code, and the raw Country property", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            properties: [
              { idShort: "POBox", value: "PO Box 12" },
              { idShort: "ZipCodeOfPOBox", value: "32423" },
              { idShort: "CityTown", value: "Minden" },
              { idShort: "Country", value: "Germany" },
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.address).toBe("PO Box 12, 32423 Minden, Germany");
    });

    it("falls back to just the zip code, or just the city, when nothing else is available", () => {
      const zipOnly = extractNameplateData(
        makeNameplateSubmodel({
          groups: [
            makeGroup({
              idShort: "ContactInformation",
              properties: [{ idShort: "Zipcode", value: "32423" }],
            }),
          ],
        })
      );
      expect(zipOnly?.address).toBe("32423");

      const cityOnly = extractNameplateData(
        makeNameplateSubmodel({
          groups: [
            makeGroup({
              idShort: "ContactInformation",
              properties: [{ idShort: "CityTown", value: "Minden" }],
            }),
          ],
        })
      );
      expect(cityOnly?.address).toBe("Minden");

      const poBoxZipOnly = extractNameplateData(
        makeNameplateSubmodel({
          groups: [
            makeGroup({
              idShort: "ContactInformation",
              properties: [{ idShort: "ZipCodeOfPOBox", value: "32423" }],
            }),
          ],
        })
      );
      expect(poBoxZipOnly?.address).toBe("32423");
    });

    it("returns a null address when the ContactInformation group has no address fields at all", () => {
      const submodel = makeNameplateSubmodel({
        groups: [makeGroup({ idShort: "ContactInformation", properties: [] })],
      });

      expect(extractNameplateData(submodel)?.address).toBeNull();
    });

    it("reads phone, fax and email with their resolved type labels", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            groups: [
              makeGroup({
                idShort: "Phone",
                properties: [
                  { idShort: "TelephoneNumber", value: "+49 123 456" },
                  { idShort: "TypeOfTelephone", value: "0173-1#07-AAS754#001" },
                ],
              }),
              makeGroup({
                idShort: "Fax",
                properties: [
                  { idShort: "FaxNumber", value: "+49 123 457" },
                  { idShort: "TypeOfFaxNumber", value: "unknown-code" },
                ],
              }),
              makeGroup({
                idShort: "Email",
                properties: [{ idShort: "EmailAddress", value: "info@example.com" }],
              }),
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.phone).toEqual({ value: "+49 123 456", type: "Office" });
      expect(result?.fax).toEqual({ value: "+49 123 457", type: "unknown-code" });
      expect(result?.email).toEqual({ value: "info@example.com", type: null });
    });

    it("leaves phone, fax and email null when their sub-groups are absent", () => {
      const submodel = makeNameplateSubmodel({
        groups: [makeGroup({ idShort: "ContactInformation", properties: [] })],
      });

      const result = extractNameplateData(submodel);

      expect(result?.phone).toBeNull();
      expect(result?.fax).toBeNull();
      expect(result?.email).toBeNull();
    });
  });

  describe("vCard generation", () => {
    it("generates a full vCard from a named contact person", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            properties: [
              { idShort: "ContactPerson", value: "Jane Doe" },
              { idShort: "NameOfContact", value: "Doe" },
              { idShort: "FirstName", value: "Jane" },
              { idShort: "Company", value: "Acme Machine Works" },
              { idShort: "Department", value: "Support" },
              { idShort: "RoleOfContactPerson", value: "0173-1#07-AAS931#001" },
              { idShort: "Language", value: "en" },
              { idShort: "AddressOfAdditionalLink", value: "https://example.com" },
              { idShort: "Street", value: "Hansastr. 27" },
              { idShort: "Zipcode", value: "32423" },
              { idShort: "CityTown", value: "Minden" },
              { idShort: "NationalCode", value: "DE" },
            ],
            groups: [
              makeGroup({
                idShort: "Phone",
                properties: [{ idShort: "TelephoneNumber", value: "+49 123 456" }],
              }),
              makeGroup({
                idShort: "Fax",
                properties: [{ idShort: "FaxNumber", value: "+49 123 457" }],
              }),
              makeGroup({
                idShort: "Email",
                properties: [{ idShort: "EmailAddress", value: "jane@example.com" }],
              }),
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.vCard).toBe(
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "N:Doe;Jane;;;",
          "FN:Jane Doe",
          "ORG:Acme Machine Works",
          "TITLE:Support",
          "ROLE:Technical contact",
          "LANG:en",
          "URL:https://example.com",
          "ADR;TYPE=WORK:;;Hansastr. 27;Minden;;32423;Germany",
          "TEL;TYPE=WORK,VOICE:+49 123 456",
          "TEL;TYPE=WORK,FAX:+49 123 457",
          "EMAIL;TYPE=WORK:jane@example.com",
          "END:VCARD",
        ].join("\n")
      );
    });

    it("uses only FN (no ORG) when there is a contact person but no company", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            properties: [{ idShort: "ContactPerson", value: "Jane Doe" }],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.vCard).toBe(
        ["BEGIN:VCARD", "VERSION:3.0", "FN:Jane Doe", "END:VCARD"].join("\n")
      );
    });

    it("falls back to the company name for FN when there is no contact person", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            properties: [{ idShort: "Company", value: "Acme Machine Works" }],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.vCard).toBe(
        ["BEGIN:VCARD", "VERSION:3.0", "FN:Acme Machine Works", "END:VCARD"].join("\n")
      );
    });

    it("falls back to the submodel's manufacturer name when ContactInformation has no Company", () => {
      const submodel = makeNameplateSubmodel({
        properties: [{ idShort: "ManufacturerName", value: "Acme Machine Works" }],
        groups: [
          makeGroup({
            idShort: "ContactInformation",
            groups: [
              makeGroup({
                idShort: "Phone",
                properties: [{ idShort: "TelephoneNumber", value: "+49 123 456" }],
              }),
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.vCard).toBe(
        [
          "BEGIN:VCARD",
          "VERSION:3.0",
          "FN:Acme Machine Works",
          "TEL;TYPE=WORK,VOICE:+49 123 456",
          "END:VCARD",
        ].join("\n")
      );
    });

    it("returns null when the ContactInformation group has no usable contact fields at all", () => {
      const submodel = makeNameplateSubmodel({
        groups: [makeGroup({ idShort: "ContactInformation", properties: [] })],
      });

      expect(extractNameplateData(submodel)?.vCard).toBeNull();
    });
  });

  describe("markings", () => {
    it("includes only markings that have both a name and a file", () => {
      const submodel = makeNameplateSubmodel({
        groups: [
          makeGroup({
            idShort: "Markings",
            groups: [
              makeGroup({
                idShort: "Marking00",
                properties: [{ idShort: "MarkingName", value: "CE" }],
                files: [{ idShort: "MarkingFile", value: "https://example.com/ce.png", contentType: "image/png" }],
              }),
              makeGroup({
                idShort: "Marking01",
                properties: [{ idShort: "MarkingName", value: "Incomplete" }],
              }),
              makeGroup({
                idShort: "Marking02",
                files: [{ idShort: "MarkingFile", value: "https://example.com/x.png", contentType: "image/png" }],
              }),
            ],
          }),
        ],
      });

      const result = extractNameplateData(submodel);

      expect(result?.markings).toEqual([
        {
          name: "CE",
          file: { idShort: "MarkingFile", value: "https://example.com/ce.png", contentType: "image/png" },
        },
      ]);
    });

    it("returns an empty array when there is no Markings group", () => {
      expect(extractNameplateData(makeNameplateSubmodel())?.markings).toEqual([]);
    });
  });

  describe("asset specific properties", () => {
    it("passes through the AssetSpecificProperties group when present", () => {
      const assetSpecific = makeGroup({
        idShort: "AssetSpecificProperties",
        properties: [{ idShort: "Custom", value: "value" }],
      });
      const submodel = makeNameplateSubmodel({ groups: [assetSpecific] });

      expect(extractNameplateData(submodel)?.assetSpecificProperties).toEqual(assetSpecific);
    });

    it("is null when there is no AssetSpecificProperties group", () => {
      expect(
        extractNameplateData(makeNameplateSubmodel())?.assetSpecificProperties
      ).toBeNull();
    });
  });
});
