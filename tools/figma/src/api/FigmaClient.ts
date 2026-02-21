import { FigmaAuth } from '../auth/FigmaAuth.js';

export interface FigmaFileResponse {
    document: FigmaNode;
    components: Record<string, any>;
    schemaVersion: number;
    name: string;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    children?: FigmaNode[];
    absoluteBoundingBox?: { x: number; y: number; width: number; height: number };
    relativeTransform?: number[][];
    fills?: any[];
    strokes?: any[];
    effects?: any[];
    style?: Record<string, any>;
    characters?: string;
    constraints?: { horizontal: string; vertical: string };
    layoutMode?: string;
    itemSpacing?: number;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    layoutSizingHorizontal?: string;
    layoutSizingVertical?: string;
    cornerRadius?: number;
    rectangleCornerRadii?: number[];
    strokeWeight?: number;
    opacity?: number;
    visible?: boolean;
    rotation?: number;
    componentId?: string;
    componentProperties?: Record<string, { value: string }>;
    gradientStops?: any[];
    [key: string]: any;
}

export class FigmaClient {
    private auth: FigmaAuth;

    constructor(auth: FigmaAuth) {
        this.auth = auth;
    }

    async getFile(fileKey: string): Promise<FigmaFileResponse> {
        const url = `https://api.figma.com/v1/files/${fileKey}`;
        const response = await this.auth.makeAuthenticatedRequest(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get file: ${response.status} ${response.statusText}\n${errorText}`);
        }

        return await response.json();
    }

    async getImages(fileKey: string, nodeIds: string[], format: string = 'png'): Promise<Record<string, string>> {
        const ids = nodeIds.join(',');
        const url = `https://api.figma.com/v1/images/${fileKey}?ids=${ids}&format=${format}`;
        const response = await this.auth.makeAuthenticatedRequest(url);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to get images: ${response.status} ${response.statusText}\n${errorText}`);
        }

        const data = await response.json();
        if (data.error) {
            throw new Error(`Figma API error: ${data.error}`);
        }

        return data.images;
    }

    async downloadImage(url: string, outputPath: string): Promise<void> {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to download image from ${url}: ${response.statusText}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const { writeFile } = await import('fs/promises');
        await writeFile(outputPath, Buffer.from(arrayBuffer));
    }
}
