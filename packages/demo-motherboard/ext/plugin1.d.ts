// spi declaration
// demo-plugin1 can not decide what is interface alone
// demo-motherboard tightly controls what is visible for other plugin
declare module "@plugin1" {
    // this is type declaration of vue component
    // if you are using react, the declaration is simpler
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
    // plugin can export anything, of couse it can export a simple function
    export function spiExportedByPlugin1ForOtherPlugins(): string;
}