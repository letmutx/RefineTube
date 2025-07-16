export declare interface VideoRequest {
    title: string | null
    description: string | null
    age: string | null
    views: string | null
    isShort: boolean
    videoId: string
}

export async function videoToThumbBase64(videoId: string): Promise<string> {
    const response = await fetch("http://img.youtube.com/vi/" + videoId + "/sddefault.jpg")
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