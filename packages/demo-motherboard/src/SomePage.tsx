import { ComponentProvidedByPlugin1, Abc } from '@plugin1';
import * as vue from 'vue';

const React = { createElement: vue.h }

export const SomePage = vue.defineComponent({
    render() {
        return <div>
            ===
            <ComponentProvidedByPlugin1 msg="hello" />
        </div>
    }
})