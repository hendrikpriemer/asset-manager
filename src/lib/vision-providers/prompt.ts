/** Shared across all vision providers, so their responses can be parsed identically. */
export const NAMEPLATE_EXTRACTION_PROMPT =
  "This is a photo of an industrial equipment nameplate. Extract exactly two fields as printed on the nameplate: the manufacturer's name, and the manufacturer's own article/order/item number (not a serial number). " +
  'Respond with ONLY a JSON object, no other text, no markdown formatting: {"manufacturerName": string or null, "articleNumber": string or null}';
