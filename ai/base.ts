export declare interface VideoRequest {
    title: string
    description: string | null
    age: string
    length: string,
    views: string,
    thumbnailUrl: string
}

function toDataURL(url: string) {
    fetch(url)
        .then(response => response.blob())
        .then(blob => new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onloadend = () => resolve(reader.result)
            reader.onerror = reject
            reader.readAsDataURL(blob)
        }))
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