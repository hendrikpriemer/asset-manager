"use server";

import { lookupTimezoneForAddress } from "@/lib/timezone";

export async function lookupTimezone(address: string): Promise<string | null> {
  return lookupTimezoneForAddress(address);
}
