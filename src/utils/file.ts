import { readFileSync } from "fs";
import { resolve } from "path";

export function readTextFile(filePath: string): string {
  try {
    const absolutePath = resolve(filePath);

    return readFileSync(absolutePath, "utf-8");
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to read file at "${filePath}": ${error.message}`);
    }
    throw error;
  }
}
