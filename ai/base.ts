export declare interface VideoRequest {
    title: string | null
    description: string | null
    age: string | null
    views: string | null
    thumbnailUrl: string
    isShort: boolean
    videoId: string
}

export async function imageToBase64(url: string): Promise<string> {
    const response = await fetch(url)
    if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    const blob = await response.blob()
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
    })
}