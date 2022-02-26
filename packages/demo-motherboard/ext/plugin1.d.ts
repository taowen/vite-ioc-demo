// spi declaration
// demo-plugin1 can not decide what is interface alone
// demo-motherboard tightly controls what is visible for other plugin
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
    export function spiExportedByPlugin1ForOtherPlugins(): string;
}