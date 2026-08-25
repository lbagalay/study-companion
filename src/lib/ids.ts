type RandomValuesProvider = {
  getRandomValues?: (array: Uint8Array<ArrayBuffer>) => Uint8Array<ArrayBuffer>;
};

function fillRandomBytes(bytes: Uint8Array<ArrayBuffer>, provider?: RandomValuesProvider) {
  if (typeof provider?.getRandomValues === 'function') {
    try {
      provider.getRandomValues(bytes);
      return;
    } catch {
      // Older PWAs can expose a partial Web Crypto implementation on HTTP.
    }
  }

  // These IDs identify user-owned records; they are not authentication secrets.
  for (let index = 0; index < bytes.length; index += 1)
    bytes[index] = Math.floor(Math.random() * 256);
}

export function createClientUuid(
  provider: RandomValuesProvider | undefined = globalThis.crypto,
): string {
  const bytes = new Uint8Array(16);
  fillRandomBytes(bytes, provider);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}
