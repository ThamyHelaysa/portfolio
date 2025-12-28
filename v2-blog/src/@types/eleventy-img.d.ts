declare module "@11ty/eleventy-img" {
  // shape of generated image
  export interface ImageEntry {
    format: string;
    width: number;
    height: number;
    url: string;
    sourceType: string;
    srcset: string;
    filename: string;
    outputPath: string;
    size: number;
  }

  // return object (keys are formats like 'jpeg', 'webp')
  export interface ImageMetadata {
    [key: string]: ImageEntry[];
  }

  // main function
  export default function Image(
    src: string,
    options?: Record<string, any> 
  ): Promise<ImageMetadata>;
}