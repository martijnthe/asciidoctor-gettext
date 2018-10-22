import AbstractBlock = AsciiDoctorJs.AbstractBlock;

export function isArrayOfBlocks(value: any): value is AbstractBlock[] {
  return Array.isArray(value);
}
