/**
 * Custom Numeric Encoding for Color IDs
 * Provides compact binary encoding for comma-separated numeric color IDs
 * Uses variable-length integer encoding (VarInt) + Base85 for URL safety
 * Version: 1.0.8 - Fixed bright marker to use 0xFE 0x00 (avoids collision with max value)
 */

/**
 * Encode array of numeric IDs to compact binary format using VarInt
 * @param {string[]} ids - Array of numeric ID strings (e.g., ["1747", "2997", "bright-2527"])
 * @returns {Uint8Array} Compressed binary data
 */
export function encodeNumericIds(ids) {
  if (!ids || ids.length === 0) {
    return new Uint8Array(0);
  }

  // Estimate size (worst case: 4 bytes per number + 2 bytes for bright marker)
  const buffer = new Uint8Array(ids.length * 6);
  let offset = 0;

  for (const id of ids) {
    // Handle "bright-" prefix if present
    let num;
    let hasBrightPrefix = false;

    if (id.startsWith("bright-")) {
      hasBrightPrefix = true;
      num = Number.parseInt(id.substring(7), 10);
    } else {
      num = Number.parseInt(id, 10);
    }

    // Validate number
    if (Number.isNaN(num) || num < 0) {
      throw new Error(`Invalid numeric ID: ${id}`);
    }

    // Encode bright prefix marker if needed
    // Use 0xFE 0x00 which can't occur in valid VarInt:
    // - If first byte is 0xFE (high bit set), it's a multi-byte value
    // - Next byte must be either continuation (high bit set) or final (high bit clear with value)
    // - 0x00 as second byte would mean value ends with 0, giving tiny value inconsistent with 0xFE first byte
    if (hasBrightPrefix) {
      buffer[offset++] = 0xfe; // Marker byte 1
      buffer[offset++] = 0x00; // Marker byte 2
    }

    // VarInt encoding (continuation bit style)
    // Format:
    // 0xxxxxxx                              = 0-127 (1 byte)
    // 1xxxxxxx 0xxxxxxx                     = 128-16383 (2 bytes)
    // 1xxxxxxx 1xxxxxxx 0xxxxxxx            = 16384-2097151 (3 bytes)
    // 1xxxxxxx 1xxxxxxx 1xxxxxxx 0xxxxxxx   = 2097152-268435455 (4 bytes)

    if (num < 128) {
      // 1 byte: 0xxxxxxx
      buffer[offset++] = num;
    } else if (num < 16384) {
      // 2 bytes: 1xxxxxxx 0xxxxxxx
      buffer[offset++] = 0x80 | (num >> 7);
      buffer[offset++] = num & 0x7f;
    } else if (num < 2097152) {
      // 3 bytes: 1xxxxxxx 1xxxxxxx 0xxxxxxx
      buffer[offset++] = 0x80 | (num >> 14);
      buffer[offset++] = 0x80 | ((num >> 7) & 0x7f);
      buffer[offset++] = num & 0x7f;
    } else if (num < 268435456) {
      // 4 bytes: 1xxxxxxx 1xxxxxxx 1xxxxxxx 0xxxxxxx
      buffer[offset++] = 0x80 | (num >> 21);
      buffer[offset++] = 0x80 | ((num >> 14) & 0x7f);
      buffer[offset++] = 0x80 | ((num >> 7) & 0x7f);
      buffer[offset++] = num & 0x7f;
    } else {
      throw new Error(`Number too large to encode: ${num}`);
    }
  }

  // Return trimmed buffer
  return buffer.slice(0, offset);
}

/**
 * Decode binary format back to array of numeric IDs
 * @param {Uint8Array} buffer - Compressed binary data
 * @returns {string[]} Array of ID strings
 */
export function decodeNumericIds(buffer) {
  if (!buffer || buffer.length === 0) {
    return [];
  }

  const ids = [];
  let i = 0;

  while (i < buffer.length) {
    let hasBrightPrefix = false;

    // Check for bright prefix marker (0xFE 0x00 sequence)
    if (buffer[i] === 0xfe && i + 1 < buffer.length && buffer[i + 1] === 0x00) {
      hasBrightPrefix = true;
      i += 2;

      // Validate we have more data for the actual number
      if (i >= buffer.length) {
        throw new Error("Unexpected end of buffer after bright marker");
      }
    }

    // Decode VarInt (continuation bit style)
    let num;
    const firstByte = buffer[i++];

    if ((firstByte & 0x80) === 0) {
      // 1 byte: 0xxxxxxx
      num = firstByte;
    } else {
      // Multi-byte: read continuation bytes
      num = firstByte & 0x7f;
      let byteCount = 1;

      while (true) {
        if (i >= buffer.length) {
          throw new Error("Unexpected end of buffer in multi-byte VarInt");
        }

        const byte = buffer[i++];
        byteCount++;

        // Shift existing bits left and add new bits
        num = (num << 7) | (byte & 0x7f);

        // If high bit is 0, this is the last byte
        if ((byte & 0x80) === 0) {
          break;
        }

        if (byteCount > 4) {
          throw new Error("VarInt too long (max 4 bytes)");
        }
      }
    }

    // Add ID to array
    if (hasBrightPrefix) {
      ids.push(`bright-${num}`);
    } else {
      ids.push(String(num));
    }
  }

  return ids;
}

/**
 * Base85 character set (ASCII85 variant)
 * Uses printable ASCII characters safe for URLs
 * Total: 85 characters
 */
const BASE85_CHARS =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!#$%&()*+-;<=>?@^_`{|}~";

// Validate character set length
if (BASE85_CHARS.length !== 85) {
  throw new Error(
    `BASE85_CHARS has ${BASE85_CHARS.length} characters, expected 85`
  );
}

/**
 * Encode binary data to URL-safe Base85 string
 * @param {Uint8Array} buffer - Binary data
 * @returns {string} Base85 encoded string
 */
export function toBase85(buffer) {
  if (!buffer || buffer.length === 0) {
    return "";
  }

  let result = "";

  // Process in chunks of 4 bytes
  for (let i = 0; i < buffer.length; i += 4) {
    let value = 0;
    const byteCount = Math.min(4, buffer.length - i);

    // Pack up to 4 bytes into a 32-bit number
    for (let j = 0; j < byteCount; j++) {
      value = value * 256 + buffer[i + j]; // Use multiplication instead of bit shifting
    }

    // Encode as base85
    const digits = [];
    const digitCount = byteCount + 1; // n bytes = n+1 digits

    for (let k = 0; k < digitCount; k++) {
      const digit = value % 85;
      if (digit < 0 || digit >= 85) {
        throw new Error(
          `Invalid digit ${digit} at position ${k}, value=${value}, byteCount=${byteCount}`
        );
      }
      digits.push(digit);
      value = Math.floor(value / 85);
    }

    // Add to result (reverse order - big-endian)
    for (let k = digits.length - 1; k >= 0; k--) {
      const char = BASE85_CHARS[digits[k]];
      if (char === undefined) {
        throw new Error(
          `Undefined character for digit ${digits[k]} at position ${k}`
        );
      }
      result += char;
    }
  }

  return result;
}

/**
 * Decode Base85 string back to binary data
 * @param {string} str - Base85 encoded string
 * @returns {Uint8Array} Binary data
 */
export function fromBase85(str) {
  if (!str || str.length === 0) {
    return new Uint8Array(0);
  }

  // Create reverse lookup map
  const charMap = {};
  for (let i = 0; i < BASE85_CHARS.length; i++) {
    charMap[BASE85_CHARS[i]] = i;
  }

  const buffer = [];

  // Process in chunks of 5 characters
  for (let i = 0; i < str.length; i += 5) {
    let value = 0;
    const chunkLen = Math.min(5, str.length - i);

    // Decode base85 digits to a number
    for (let j = 0; j < chunkLen; j++) {
      const char = str[i + j];
      if (!(char in charMap)) {
        throw new Error(`Invalid Base85 character: ${char}`);
      }
      value = value * 85 + charMap[char];
    }

    // Convert to bytes
    const byteCount = chunkLen - 1; // n+1 digits = n bytes
    const bytes = [];

    // Extract bytes in big-endian order
    for (let j = byteCount - 1; j >= 0; j--) {
      bytes.unshift(value % 256);
      value = Math.floor(value / 256);
    }

    buffer.push(...bytes);
  }

  return new Uint8Array(buffer);
}

/**
 * Compress array of color IDs (both numeric and group identifiers)
 * Preserves original order by encoding positions
 * @param {string[]} ids - Array of color IDs
 * @returns {string} Compressed base85 string with format: "numeric.groups.positions"
 */
export function compressIds(ids) {
  if (!ids || ids.length === 0) {
    return "";
  }

  // Separate numeric IDs from group identifiers, tracking positions
  const numericIds = [];
  const groupIds = [];
  const positions = []; // 'n' for numeric, 'g' for group

  for (const id of ids) {
    if (id.includes(":")) {
      // Group identifier (family: or category:)
      groupIds.push(id);
      positions.push("g");
    } else {
      // Numeric ID (with or without bright- prefix)
      numericIds.push(id);
      positions.push("n");
    }
  }

  let result = "";

  // Encode numeric IDs
  if (numericIds.length > 0) {
    const binary = encodeNumericIds(numericIds);
    result += toBase85(binary);
  }

  // Append group identifiers (if any)
  // Always prepend a dot before groups to separate from Base85 numeric data
  if (groupIds.length > 0) {
    result += ".";
    result += groupIds.join(",");
  }

  // Append position information
  if (numericIds.length > 0 && groupIds.length > 0) {
    result += "." + positions.join("");
  }

  return result;
}

/**
 * Decompress base85 string back to array of color IDs
 * Restores original order using position information
 * @param {string} compressed - Compressed string with format: "numeric.groups.positions"
 * @returns {string[]} Array of color IDs
 */
export function decompressIds(compressed) {
  if (!compressed || compressed.length === 0) {
    return [];
  }

  const ids = [];

  // Split on dot separator (numeric.groups.positions)
  const parts = compressed.split(".");

  if (parts.length === 1) {
    // Only numeric IDs
    if (parts[0].length > 0) {
      try {
        const binary = fromBase85(parts[0]);
        const numericIds = decodeNumericIds(binary);
        ids.push(...numericIds);
      } catch (error) {
        throw new Error(`Failed to decompress numeric IDs: ${error.message}`);
      }
    }
  } else if (parts.length === 2) {
    // Either numeric+groups without positions (old format, all numeric then all groups)
    // OR only groups (no numeric)
    const numericPart = parts[0];
    const groupPart = parts[1];

    // Decode numeric part
    if (numericPart.length > 0) {
      try {
        const binary = fromBase85(numericPart);
        const numericIds = decodeNumericIds(binary);
        ids.push(...numericIds);
      } catch (error) {
        throw new Error(`Failed to decompress numeric IDs: ${error.message}`);
      }
    }

    // Parse group identifiers
    if (groupPart.length > 0) {
      ids.push(...groupPart.split(","));
    }
  } else {
    // numeric.groups.positions (new format with order preservation)
    const numericPart = parts[0];
    const groupPart = parts[1];
    const positions = parts[2];

    let numericIds = [];
    if (numericPart.length > 0) {
      try {
        const binary = fromBase85(numericPart);
        numericIds = decodeNumericIds(binary);
      } catch (error) {
        throw new Error(`Failed to decompress numeric IDs: ${error.message}`);
      }
    }

    let groupIds = [];
    if (groupPart.length > 0) {
      groupIds = groupPart.split(",");
    }

    // Reconstruct in original order using positions
    let numIdx = 0;
    let grpIdx = 0;

    for (const pos of positions) {
      if (pos === "n") {
        ids.push(numericIds[numIdx++]);
      } else {
        ids.push(groupIds[grpIdx++]);
      }
    }
  }

  return ids;
}
