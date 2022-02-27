# About

通过 vite 在代码构建阶段实现 Inversion of Control (IoC)。
是一种虽然简单，但是非常强大的代码模块拆分方案。

# 模块拆分

把一个前端项目中的代码拆分成多个模块来管理是很自然的想法。
比如说，我们把一个项目拆分为三个模块：

![old-arch](./images/old-arch.drawio.svg)

然后把 demo-app 中的代码不断往 demo-plugin1 和 demo-plugin2 中的抽离。比如把一些不包含业务逻辑的纯视觉组件。

# 会遇到什么问题？

有这么三个常见问题

1. 如果不允许 demo-plugin1 去依赖 demo-app 或者 demo-plugin2，很多业务逻辑是写不了的，因为引用不到代码。但是如果允许 demo-plugin1 引用 demo-plugin2，又很容易产生循环引用
2. 大量的代码留在 demo-app 中。因为也没有什么强制性的手段阻止往 demo-app 里写新的代码
3. 如果 demo-plugin1 发布了一个新版本，所有引用它的地方都要更新 dependency 中指定的版本号。本地开发的时候，肯定不能为了改 demo-plugin1 之后，能够在 demo-app 中看看效果，每次都走发新的版本的流程，当然希望有一个更简便的同时更新一堆模块的办法

![circular](./images/circular.drawio.svg)

# pnpm 提供的 monorepo

问题3是最好解决的。使用 yarn 或者 pnpm 都提供了开箱即用的解决方案。

* 在根目录定义文件 [pnpm-workspace.yaml](./pnpm-workspace.yaml)，把 packages/* 都加入到同一个 workspace 里
* workspace 下的包的 package.json，互相之间用特殊的版本号 [`workspace:*`](./packages/demo-app/package.json) 进行版本的引用

这样就可以在本地开发的时候，改了 demo-plugin1 之后，立即就可以在 demo-app 中看效果了

# 通过 Inversion of Control (IoC) 解决循环依赖

问题1的解决办法是在 demo-plugin1 和 demo-plugin2 下面再引入一个 demo-motherboard 的包。这样它们之间就不用再互相依赖了。

![new-arch](./images/new-arch.drawio.svg)

比如说我们在 demo-motherboard 中定义了一个组件

```ts
export function SomePage(props: {
    Comp1: () => any,
    Comp2: () => any
}) {
    const { Comp1, Comp2 } = props;
    return <div><Comp1/><Comp2/></div>
}
```

这里的 Comp1 和 Comp2 是两个抽象的接口定义。demo-motherboard 里不需要知道 Comp1 和 Comp2 的具体实现。
在 demo-app 中引用 SomePage 的时候把具体的实现组装起来：

```ts
import { ComponentProvidedByPlugin1 } from 'demo-plugin1';
import { ComponentProvidedByPlugin2 } from 'demo-plugin2';

<SomePage Comp1={ComponentProvidedByPlugin1} Comp1={ComponentProvidedByPlugin2} />
```

这样在代码开始被执行的时候，通过运行时内存里的函数调用关系，把多个模块的代码组装到一起。
这个组装甚至可以更灵活，比如 demo-app 在运行时再去动态下载 demo-plugin1 的代码，也就是所谓的 micro-frontend 的解决方案。

# 手写装配代码的弊端

前面的解决方案可以工作，就是有点啰嗦。

* 随着拆分得越来越多，demo-app 里需要不断地手写这样的模块装配代码。有没有办法可以减少 demo-app 的代码量，实现自动装配？
* 回顾前面提出的三个问题，问题2就是 demo-app 的代码量不断膨胀，没有办法阻止往 demo-app 里写新的代码

这里就介绍一种基于 vite 实现的在构建解决实现 Inversion of Control 的办法。

# motherboard 声明抽象接口 @plugin1 和 @plugin2

我们分别来看 demo-motherboard, demo-plugin1, demo-plugin2 最后是 demo-app。

首先是要在 demo-motherboard 中定义接口 [`plugin1.abstract.ts`](./packages/demo-motherboard/src/plugin1.abstract.ts)。

```ts
import { defineComponent } from "vue";

// interface declaration
export const ComponentProvidedByPlugin1 = defineComponent({
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            hello: ''
        }
    },
    methods: {
        onClick() {
        }
    }
})

export function spiExportedByPlugin1ForOtherPlugins(): string {
    throw new Error('abstract');
}
```

类似的还有 [`plugin2.abstract.ts`](./packages/demo-motherboard/src/plugin2.abstract.ts)。
这些标记为 `*.abstract.ts` 的文件不是什么特殊的 `.d.ts`，它就是普通的 typescript 源文件。
加上 `*.abstract.ts` 是为了我们阅读代码的时候易于区分，知道这些代码只是一份声明，实际上并不包含实现。

然后我们在 [`SomePage.tsx`](./packages/demo-motherboard/src/SomePage.tsx) 中就可以引用这两个没有包含实现代码的组件了。

```ts
import { ComponentProvidedByPlugin1 } from '@plugin1';
import { ComponentProvidedByPlugin2 } from '@plugin2';
import * as vue from 'vue';

export const SomePage = vue.defineComponent({
    render() {
        return <div>
            ===
            <ComponentProvidedByPlugin1 msg="hello" />
            ===
            <ComponentProvidedByPlugin2 position="blah" />
        </div>
    }
})
```

值得注意的是，这里没有使用 `./plugin1.abstract.ts` 而是用了 `@plugin1`。那么这个 `@plugin1` 是从哪里来的呢？
打开 [`tsconfig.json`](./packages/demo-motherboard/tsconfig.json) 我们可以找到答案

```json
{
  "compilerOptions": {
    "paths": {
      "@plugin1": ["../demo-motherboard/src/plugin1.abstract.ts"],
      "@plugin2": ["../demo-motherboard/src/plugin2.abstract.ts"]
    }
  }
}
```

# 在 demo-plugin1 中实现 @plugin1 声明的接口

我们要现在 demo-plugin1 中把 `@plugin1` 引入进来。和 demo-motherboard 一样，修改 [`tsconfig.json`](./packages/demo-plugin1/tsconfig.json)。

然后定义 ComponentProvidedByPlugin1 的实现

```ts
import * as vue from 'vue';
import * as plugin1 from '@plugin1';

// demo-motherboard does not depend on demo-plugin1
// demo-plugin2 does not depend on demo-plugin1
// even if we export this function, they can not import it
export function secretHiddenByPlugin1() {
    return 'is secret'
}

// implement the abstract declaration of @plugin1
// if the implementation does not match declaration, typescript will complain type incompatible
export const ComponentProvidedByPlugin1: typeof plugin1.ComponentProvidedByPlugin1 = vue.defineComponent({
    props: {
        msg: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            hello: 'world'
        }
    },
    methods: {
        onClick(): void {
            secretHiddenByPlugin1();
        }
    },
    render() {
        return <div>ComponentProvidedByPlugin1</div>
    }
});
```

特别注意这个类型定义 `const ComponentProvidedByPlugin1: typeof plugin1.ComponentProvidedByPlugin1`。这确保了接口声明和实现是类型兼容的。如果不兼容，我们直接打开 demo-plugin1 的代码就可以立即发现。

类似的，实现 [spiExportedByPlugin1ForOtherPlugins](./packages/demo-plugin1/src/spiExportedByPlugin1ForOtherPlugins.ts)。最后在 [index.ts](./packages/demo-plugin1/src/index.ts) 中把所有的实现代码 export 出去。这样就完成了 @plugin1 的实现定义工作。

# 在 demo-plugin2 中实现 @plugin2 声明的接口

我们要现在 demo-plugin2 中把 `@plugin2` 引入进来。和 demo-motherboard 一样，修改 [`tsconfig.json`](./packages/demo-plugin2/tsconfig.json)。

然后定义 ComponentProvidedByPlugin2 的实现

```ts
import * as vue from 'vue';
import * as plugin2 from '@plugin2';
import * as plugin1 from '@plugin1';

// demo-motherboard does not depend on demo-plugin2
// demo-plugin1 does not depend on demo-plugin2
// even if we export this function, they can not import it
export function secretHiddenByPlugin2() {
    return 'is secret'
}

// implement the abstract declaration of @plugin1
// if the implementation does not match declaration, typescript will complain type incompatible
export const ComponentProvidedByPlugin2: typeof plugin2.ComponentProvidedByPlugin2 = vue.defineComponent({
    props: {
        position: {
            type: String,
            required: true
        }
    },
    data() {
        return {
            left: 100,
            right: 200
        }
    },
    methods: {
        move(): void {
            secretHiddenByPlugin2();
            // demo-plugin2 does not depend on demo-plugin1 in compile time
            // however, in runtime, demo-plugin2 can call demo-plugin1
            // as long as the interface has been declared by demo-motherboard
            plugin1.spiExportedByPlugin1ForOtherPlugins();
        }
    },
    render() {
        return <div>ComponentProvidedByPlugin2</div>
    }
});
```

值得注意的是，这里 `plugin1.spiExportedByPlugin1ForOtherPlugins()` 实现了在 plugin2 中调用 plugin1 的代码。但是不是所有 demo-plugin1 的实现代码都可以随意被引用到。比如 `plugin1.secretHiddenByPlugin1()` 就会报错。因为 `@plugin1` 是在 demo-motherboard 中声明的，虽然实现的代码里包含了 secretHiddenByPlugin1，但是声明里可没有。

# demo-app 装配

最后是如何装配起来。在 [App.vue](./packages/demo-app/src/App.vue) 中引用 demo-motherboard 定义的 SomePage:

```vue
<script setup lang="ts">
import { SomePage } from 'demo-motherboard';
</script>
<template>
    <SomePage />
</template>
```

如果 vite 不加任何配置，直接运行，我们可以看到如下的错误：

```
error when starting dev server:
Error: The following dependencies are imported but could not be resolved:

  @plugin1 (imported by /home/taowen/vite-ioc-demo/packages/demo-motherboard/src/SomePage.tsx)
  @plugin2 (imported by /home/taowen/vite-ioc-demo/packages/demo-motherboard/src/SomePage.tsx)
```

为了解决这个找不到的问题，我们修改 [vite.config.ts](./packages/demo-app/vite.config.ts)

```ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue(), {
    // we can inject different implementation, 
    // as long as @plugin1 interface has been implemented
    name: 'inject @plugin1',
    resolveId(id) {
      if (id === '@plugin1') {
        return 'demo-plugin1';
      }
    }
  }, {
    // we can inject different implementation, 
    // as long as @plugin2 interface has been implemented
    name: 'inject @plugin2',
    resolveId(id) {
      if (id === '@plugin2') {
        return 'demo-plugin2';
      }
    }
  }],
  base: '',
})
```

于是我们就把 @plugin1 和 demo-plugin1 对接上了，把 @plugin2 和 demo-plugin2 对接上了。

这样做的好处就是无论加了多少个组件要组装的，这里的 vite.config.ts 都不需要再修改了。demo-app 的代码行数理论上来说可以是固定不变的，新的需求如果比较局部可以写在 demo-plugin1 或者 demo-plugin2 中，如果需要全局范围有逻辑关联，则还要改改 demo-motherboard。这样我们通过关注 demo-app 的修改和 demo-motherboard 的修改，就可以比较容易去发现代码组织上的潜在问题。

如果只是为了强制代码的模块化，可以不需要上 micro-frontend 这样的重型方案，typescript+vite 就可以在代码构建期把这个事给办了。