declare module "@plugin2" {
    // this is type declaration of vue component
    // if you are using react, the declaration is simpler
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