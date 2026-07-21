/**
 * A less technical, purpose-built rendering for the "Digital Nameplate"
 * submodel template, mirroring the official BaSyx AAS Web UI's own
 * `Nameplate_v2_0.vue` plugin (ported field-for-field, including its address
 * assembly and vCard 3.0 generation) - see `NameplateVisualization` for the
 * display side. Every field is optional: real nameplates (WAGO's, confirmed
 * live) only populate a handful of them.
 *
 * Deliberately kept in its own module, separate from `lib/aas.ts`: this file
 * only depends on already-resolved `AasSubmodelData` (type-only import, so
 * nothing here pulls in `lib/aas.ts`'s Prisma/fetch-based runtime code),
 * which lets client components (like `AasViewer`) call `extractNameplateData`
 * directly without bundling server-only code into the browser.
 */

import type {
  AasElementGroup,
  AasSubmodelData,
  AasSubmodelFile,
  AasSubmodelProperty,
} from "@/lib/aas";

const NAMEPLATE_TEMPLATE_NAME = "Digital Nameplate for industrial equipment";

const PRODUCT_PROPERTY_ID_SHORTS = [
  "URIOfTheProduct",
  "ManufacturerProductDesignation",
  "ManufacturerProductRoot",
  "ManufacturerProductFamily",
  "ManufacturerProductType",
  "OrderCodeOfManufacturer",
  "ProductArticleNumberOfManufacturer",
  "SerialNumber",
  "YearOfConstruction",
  "DateOfManufacture",
  "CountryOfOrigin",
];

const VERSION_ID_SHORTS = ["HardwareVersion", "FirmwareVersion", "SoftwareVersion"];

// eCl@ss valueId -> human label, ported from BaSyx's
// ContactInformation_v1_0Utils.ts. Unrecognized valueIds are shown as-is.
const ROLES_OF_CONTACT_PERSON: Record<string, string> = {
  "0173-1#07-AAS927#001": "Administrative contact",
  "0173-1#07-AAS928#001": "Commercial contact",
  "0173-1#07-AAS929#001": "Other contact",
  "0173-1#07-AAS930#001": "Hazardous goods contact",
  "0173-1#07-AAS931#001": "Technical contact",
};

const TYPES_OF_TELEPHONE: Record<string, string> = {
  "0173-1#07-AAS754#001": "Office",
  "0173-1#07-AAS755#001": "Office mobile",
  "0173-1#07-AAS756#001": "Secretary",
  "0173-1#07-AAS757#001": "Substitute",
  "0173-1#07-AAS758#001": "Home",
  "0173-1#07-AAS759#001": "Private mobile",
};

const TYPES_OF_FAX: Record<string, string> = {
  "0173-1#07-AAS754#001": "Office",
  "0173-1#07-AAS756#001": "Secretary",
  "0173-1#07-AAS758#001": "Home",
};

const TYPES_OF_EMAIL: Record<string, string> = {
  "0173-1#07-AAS754#001": "Office",
  "0173-1#07-AAS756#001": "Secretary",
  "0173-1#07-AAS757#001": "Substitute",
  "0173-1#07-AAS758#001": "Home",
};

export type AasNameplateContact = {
  value: string;
  type: string | null;
};

export type AasNameplateMarking = {
  name: string;
  file: AasSubmodelFile;
};

export type AasNameplateProperty = { idShort: string; value: string };

export type AasNameplateData = {
  productProperties: AasNameplateProperty[];
  versions: AasNameplateProperty[];
  manufacturerName: string | null;
  companyLogo: AasSubmodelFile | null;
  address: string | null;
  phone: AasNameplateContact | null;
  fax: AasNameplateContact | null;
  email: AasNameplateContact | null;
  vCard: string | null;
  markings: AasNameplateMarking[];
  assetSpecificProperties: AasElementGroup | null;
};

function findPropertyValue(
  properties: AasSubmodelProperty[],
  idShort: string
): string | null {
  return properties.find((property) => property.idShort === idShort)?.value ?? null;
}

function findGroupByIdShort(
  groups: AasElementGroup[],
  idShort: string
): AasElementGroup | null {
  return groups.find((group) => group.idShort === idShort) ?? null;
}

function findFileByIdShort(
  files: AasSubmodelFile[],
  idShort: string
): AasSubmodelFile | null {
  return files.find((file) => file.idShort === idShort) ?? null;
}

/** Same as `findPropertyValue`, but tolerates a group that wasn't found. */
function groupProperty(group: AasElementGroup | null, idShort: string): string | null {
  return group ? findPropertyValue(group.properties, idShort) : null;
}

function typeLabel(table: Record<string, string>, valueId: string | null): string | null {
  if (!valueId) return null;
  return table[valueId] ?? valueId;
}

function countryName(regionCode: string | null): string | null {
  if (!regionCode) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(
      regionCode.toUpperCase()
    ) ?? null;
  } catch {
    return null;
  }
}

/** Ported from BaSyx's `determineAddress` (ContactInformation_v1_0Utils.ts). */
function assembleAddress(contactInformation: AasElementGroup): string | null {
  const props = contactInformation.properties;
  const street = findPropertyValue(props, "Street");
  const poBox = findPropertyValue(props, "POBox");
  const zipcode = findPropertyValue(props, "Zipcode");
  const zipCodeOfPOBox = findPropertyValue(props, "ZipCodeOfPOBox");
  const cityTown = findPropertyValue(props, "CityTown");
  const stateCounty = findPropertyValue(props, "StateCounty");
  const country =
    countryName(findPropertyValue(props, "NationalCode")) ??
    findPropertyValue(props, "Country");

  const parts: string[] = [];
  if (street) {
    parts.push(street);
  } else if (poBox) {
    parts.push(poBox);
  }

  if (zipcode && cityTown) {
    parts.push(`${zipcode} ${cityTown}`);
  } else if (zipCodeOfPOBox && cityTown) {
    parts.push(`${zipCodeOfPOBox} ${cityTown}`);
  } else if (zipcode) {
    parts.push(zipcode);
  } else if (zipCodeOfPOBox) {
    parts.push(zipCodeOfPOBox);
  } else if (cityTown) {
    parts.push(cityTown);
  }

  if (stateCounty) parts.push(stateCounty);
  if (country) parts.push(country);

  return parts.length > 0 ? parts.join(", ") : null;
}

/** Ported from BaSyx's `generateVCard` (ContactInformation_v1_0Utils.ts). */
function generateVCard(
  contactInformation: AasElementGroup,
  manufacturerName: string | null
): string | null {
  const props = contactInformation.properties;
  const contactPerson = findPropertyValue(props, "ContactPerson");
  const surname = findPropertyValue(props, "NameOfContact");
  const firstName = findPropertyValue(props, "FirstName");
  const middleNames = findPropertyValue(props, "MiddleNames");
  const prefix = findPropertyValue(props, "Title");
  const suffix = findPropertyValue(props, "AcademicTitle");
  const company = findPropertyValue(props, "Company") ?? manufacturerName;
  const department = findPropertyValue(props, "Department");
  const role = typeLabel(
    ROLES_OF_CONTACT_PERSON,
    findPropertyValue(props, "RoleOfContactPerson")
  );
  const language = findPropertyValue(props, "Language");
  const additionalLink = findPropertyValue(props, "AddressOfAdditionalLink");
  const street = findPropertyValue(props, "Street");
  const poBox = findPropertyValue(props, "POBox");
  const zipcode = findPropertyValue(props, "Zipcode");
  const zipCodeOfPOBox = findPropertyValue(props, "ZipCodeOfPOBox");
  const cityTown = findPropertyValue(props, "CityTown");
  const stateCounty = findPropertyValue(props, "StateCounty");
  const country = countryName(findPropertyValue(props, "NationalCode"));

  const phoneGroup = findGroupByIdShort(contactInformation.groups, "Phone");
  const telephoneNumber = groupProperty(phoneGroup, "TelephoneNumber");
  const faxGroup = findGroupByIdShort(contactInformation.groups, "Fax");
  const faxNumber = groupProperty(faxGroup, "FaxNumber");
  const emailGroup = findGroupByIdShort(contactInformation.groups, "Email");
  const emailAddress = groupProperty(emailGroup, "EmailAddress");

  const lines: (string | null)[] = ["BEGIN:VCARD", "VERSION:3.0"];

  const name = [surname, firstName, middleNames, prefix, suffix]
    .map((part) => part ?? "")
    .join(";");
  if (name.replaceAll(";", "").length > 0) {
    lines.push(`N:${name}`);
  }

  if (contactPerson) {
    lines.push(`FN:${contactPerson}`);
    if (company) lines.push(`ORG:${company}`);
  } else if (company) {
    // "FN" is mandatory in vCard 3.0, so fall back to the company name.
    lines.push(`FN:${company}`);
  }

  if (department) lines.push(`TITLE:${department}`);
  if (role) lines.push(`ROLE:${role}`);
  if (language) lines.push(`LANG:${language}`);
  if (additionalLink) lines.push(`URL:${additionalLink}`);

  const address = [
    street ?? poBox,
    cityTown,
    stateCounty,
    zipcode ?? zipCodeOfPOBox,
    country,
  ]
    .map((part) => part ?? "")
    .join(";");
  if (address.replaceAll(";", "").length > 0) {
    lines.push(`ADR;TYPE=WORK:;;${address}`);
  }

  if (telephoneNumber) lines.push(`TEL;TYPE=WORK,VOICE:${telephoneNumber}`);
  if (faxNumber) lines.push(`TEL;TYPE=WORK,FAX:${faxNumber}`);
  if (emailAddress) lines.push(`EMAIL;TYPE=WORK:${emailAddress}`);

  lines.push("END:VCARD");

  // Nothing but the mandatory envelope means there's no contact information
  // worth generating a vCard for.
  return lines.length > 3 ? lines.join("\n") : null;
}

export function extractNameplateData(
  submodel: AasSubmodelData
): AasNameplateData | null {
  if (submodel.templateName !== NAMEPLATE_TEMPLATE_NAME) {
    return null;
  }

  const productProperties: AasNameplateProperty[] = [];
  for (const idShort of PRODUCT_PROPERTY_ID_SHORTS) {
    const value = findPropertyValue(submodel.properties, idShort);
    if (!value) continue;
    if (idShort === "CountryOfOrigin") {
      const name = countryName(value);
      productProperties.push({ idShort, value: name ? `${name} (${value})` : value });
    } else {
      productProperties.push({ idShort, value });
    }
  }

  const versions = VERSION_ID_SHORTS.map((idShort) => ({
    idShort,
    value: findPropertyValue(submodel.properties, idShort),
  })).filter((property): property is AasNameplateProperty => property.value !== null);

  const manufacturerName = findPropertyValue(submodel.properties, "ManufacturerName");
  const companyLogo = findFileByIdShort(submodel.files, "CompanyLogo");
  const contactInformation = findGroupByIdShort(submodel.groups, "ContactInformation");

  let address: string | null = null;
  let phone: AasNameplateContact | null = null;
  let fax: AasNameplateContact | null = null;
  let email: AasNameplateContact | null = null;
  let vCard: string | null = null;

  if (contactInformation) {
    address = assembleAddress(contactInformation);

    const phoneGroup = findGroupByIdShort(contactInformation.groups, "Phone");
    const telephoneNumber = groupProperty(phoneGroup, "TelephoneNumber");
    if (telephoneNumber) {
      phone = {
        value: telephoneNumber,
        type: typeLabel(TYPES_OF_TELEPHONE, groupProperty(phoneGroup, "TypeOfTelephone")),
      };
    }

    const faxGroup = findGroupByIdShort(contactInformation.groups, "Fax");
    const faxNumber = groupProperty(faxGroup, "FaxNumber");
    if (faxNumber) {
      fax = {
        value: faxNumber,
        type: typeLabel(TYPES_OF_FAX, groupProperty(faxGroup, "TypeOfFaxNumber")),
      };
    }

    const emailGroup = findGroupByIdShort(contactInformation.groups, "Email");
    const emailAddress = groupProperty(emailGroup, "EmailAddress");
    if (emailAddress) {
      email = {
        value: emailAddress,
        type: typeLabel(TYPES_OF_EMAIL, groupProperty(emailGroup, "TypeOfEmailAddress")),
      };
    }

    vCard = generateVCard(contactInformation, manufacturerName);
  }

  const markingsGroup = findGroupByIdShort(submodel.groups, "Markings");
  const markings: AasNameplateMarking[] = [];
  if (markingsGroup) {
    for (const marking of markingsGroup.groups) {
      const name = findPropertyValue(marking.properties, "MarkingName");
      const file = findFileByIdShort(marking.files, "MarkingFile");
      if (name && file) {
        markings.push({ name, file });
      }
    }
  }

  const assetSpecificProperties = findGroupByIdShort(
    submodel.groups,
    "AssetSpecificProperties"
  );

  return {
    productProperties,
    versions,
    manufacturerName,
    companyLogo,
    address,
    phone,
    fax,
    email,
    vCard,
    markings,
    assetSpecificProperties,
  };
}
