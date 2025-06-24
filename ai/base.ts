export declare interface VideoRequest {
    title: string
    description: string | null
    age: string
    length: string,
    views: string,
    thumbnailUrl: string
}


export async function imageToBase64(imageUrl: string): Promise<string> {
    const response = await fetch(imageUrl);
    const imageArrayBuffer = await response.arrayBuffer();
    return Buffer.from(imageArrayBuffer).toString('base64');
}