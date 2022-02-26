declare module "@plugin2" {
    export const ComponentProvidedByPlugin2: {
        new(): {
            $props: {
                position: string
            },
            $data: {
                left: number
                right: number
            },
            move(): void
        }
    }
}