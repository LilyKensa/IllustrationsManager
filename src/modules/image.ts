import sharp from "sharp";
import crypto from "crypto";

// TODO Calling sharp(input) frequently can be slow and unnecessary

export async function hash(input: string | Buffer): Promise<string> {
  const buffer = await sharp(input).toBuffer();
  const hash = crypto.createHash("sha256").update(buffer).digest("hex");
  return hash;
}

export async function dominantColor(input: string | Buffer): Promise<`#${string}`> {
  const stats = await sharp(input).stats();

  // Return the RGB values
  return (({ r, g, b }) => [ r, g, b ])(stats.dominant)
    .reduce((p, c) => p + c.toString(16).padStart(2, "0"), "#") as any;
}

export function convert(input: string | Buffer) {
  return sharp(input).png().toBuffer();
}

export async function info(input: string | Buffer) {
  const { size, width, height } = await sharp(input).metadata() as {
    width: number,
    height: number,
    size: number
  };
  return { size, width, height };
}

export const imageCompressQuality = Number.parseInt(process.env.IMAGE_COMPRESS_QUALITY!);

export async function compress(input: string | Buffer) {
  return sharp(input).resize({ height: imageCompressQuality, withoutEnlargement: true }).toBuffer();
}
