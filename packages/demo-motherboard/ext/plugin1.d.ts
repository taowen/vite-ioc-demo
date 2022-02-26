declare module "@plugin1" {
    export const ComponentProvidedByPlugin1: {
        new(): {
            $props: {
                msg: string
            },
            $data: {
                hello: string
            },
            onClick():void;
        }
    }
}