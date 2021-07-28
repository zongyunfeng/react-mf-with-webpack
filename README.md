

## 前言
最近这段时间`微前端`这个概念越来越被提及，它采用了`微服务`的相关理念，我们可以把一个应用拆分成多个可以互不依赖可以独立开发并单独部署的模块，然后在运行时把它们组合成一个完整的App。

通过这样的手段，我们可以使用不同的技术去开发应用的各个部分，比如这个模块已经用`React`开发好了我们可以继续用`React`，那个新模块团队更偏向于用Vue来实现我们就可以用`Vue`去实现。我们可以有专门的团队去维护各个独立的模块，维护起来也会更加方便。这样我们团队协作的方式也就跟着改变了。

从`Webpack5`开始，已经内置了对微前端开发的支持，它们提供了一个新的功能叫`Module Federation`（我也不知道该怎么翻译这个术语会比较恰当），提供了足够的能力来让我们实现微前端开发。

话不多说，我们还是通过一个简单的例子来感受下整体的一个概念跟流程。我们会实现一个简单的App，然后把它通过webpack改造成微前端的形式。

## 我们开始吧！

这次所有配置都由我们来手动完成。首先我们新建一个空白目录，然后在项目里面执行：

```
npm init -y
```

然后为了使用webpack，
```
npm add webpack webpack-nano -D
```

接下来我们就可以通过在根目录新建一个`webpack.config.js`文件来配置整个打包过程啦！

我们在开发时跟运行时配置是有差别的，一般大家可能会编写`webpack.production.js`跟`webpack.development.js`两个文件，来配置不同的环境。但这样可能会让我们的配置对象变得很大很臃肿不容易维护，我们需要在一大堆配置中找到我们想要的配置去修改，而且各个环境的配置也不是完全不同，那我们得封装啊，我们得抽象啊，我们要想办法复用啊！

## 那我们该怎么办呢？

我们能不能把这个大的配置对象拆解成一个个具有特定功能的配置对象来单独维护呢？

比如我们这个项目会通过`mini-html-webpack-plugin`来生成最终的`index.html`文件，那我们就可以写一个单独的函数来导出配置这个页面的相关配置

```
exports.page = ({title}) => ({
    plugins: [new MiniHtmlWebpackPlugin({
        context: {title}
    })]
})
```

这样后续我们要改变页面相关的配置时就我们就会知道来修改这个`page`函数，我们甚至可以替换成新的插件，而需要这个配置的地方只需要调用这个函数就能拿到配置，不需要关心细节，它们对我们的变动是无感知的，自然也不会受到影响。我们的配置也就能以函数的形式在各个环境中复用。

那么问题来了，毕竟webpack最终还是只认它认识的那个配置形式，所以我们还需要把这些函数返回的小配置对象合并成一个大的完整的配置对象。注意像`Object.assign`这种处理方式对数组不太友好，会丢失数据，大家可以自己实现相关逻辑，或者使用`webpack-merge`这个包来处理。

为了更好地管理webpack配置，不让复杂的配置花了眼，我们可以再新建一个`webpack.parts.js`文件，在这里定义一个个小函数来返回配置特定功能的配置对象。

然后在`webpack.config.js`里面，我们可以导入这些函数，并且我们可以通过运行时传过来的`mode`来判断需要给什么环境打包，动态生成最后的配置：

```
const {mode} = require('webpack-nano/argv')
const parts = require('./webpack.parts')
const {merge} = require('webpack-merge')

const commonConfig = merge([
    {mode},
    {entry: ["./App"]},
    parts.page({title: 'React Micro-Frontend'}),
    parts.loadJavaScript()
])

const productionConfig = merge([parts.eliminateUnusedCss()])

const developmentConfig = merge([{entry: ['webpack-plugin-serve/client']}, parts.devServer()])

const getConfig = (mode) => {
    process.env.NODE_ENV = mode
    switch (mode) {
        case 'production':
            return merge([commonConfig, productionConfig])
        case 'development':
            return merge([commonConfig, developmentConfig])
        default:
            throw new Error(`Trying to use an unknown mode, ${mode}`);
    }
}

module.exports = getConfig(mode)
```

这最大限度地避免了我们配置文件的臃肿。

## 冲冲冲~

然后我们还需要配置我们的开发环境，我们当然不想在开发时每次都手动去刷新页面，这边用到了一个插件`webpack-plugin-serve`来做实时更新：
```
exports.devServer = () => ({
    watch: true,
    plugins: [
        new WebpackPluginServe(
            {
                port: Process.env.PORT || 8000,
                host: '127.0.0.1',
                static: './dist',
                liveReload: true,
                waitForBuild: true
  })
    ]
})
```

然后我们这边使用了`React`作为前端框架：

```
npm add react react-dom
```

为了让编译器能够正确理解我们的`React`组件，我们要使用`babel`：

```
npm add babel-loader @babel/core @babel/preset-env @babel/preset-react -D
```

配置一下`babel-loader`：
```
exports.loadJavaScript = () => ({
    module: {
        rules: [
            { test: /\.js$/, include: APP_SOURCE, use: "babel-loader" },
        ],
    },
});
```

别忘了还要增加一个`.babelrc`文件
```
{
  "presets": [
    [
      "@babel/preset-env",
      {
        "modules": false
  }
    ],
    [
      "@babel/preset-react"
  ]
  ]
}
```

现在我们的`React`组件能被正确处理了，我们可以开始写我们的组件了。

## 愉快的业务代码环节~

首先是我们的`Header`组件：
```
import React from "react";

const Header = () => {
    return <header>
        <h1>Micro-Frontend With React</h1>
    </header>
}

export default Header;
```

然后是我们的`Main`组件：
```
import React from "react";
import Header from "./Header";

const Main = () => {
    return (
        <main>
            <Header/>
            <span>a Demo for Micro-Frontend using Webpack5</span>
        </main>
    );
}

export default Main
```

最后是入口文件：

```
import ReactDOM from "react-dom";
import React from "react";
import Main from "./Main";

const container = document.createElement("div");
document.body.appendChild(container);
ReactDOM.render(<Main/>, container);
```

打开`package.json`文件配置如下脚本：
```
"scripts": {
  "build": "wp --mode production",
  "start": "wp --mode development"
  }
```

现在我们可以通过在终端执行`npm run start`来预览我们的App了。

![运行中的App](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/03abee1b7ed541ed803f1121d6f3f0ad~tplv-k3u1fbpfcp-watermark.image)

## MF它来了！

接下来我们来把它改造成微前端的形式，把`Header`做成单独的模块，然后其它的做成另外一个模块，这时候就要用到`ModuleFederationPlugin`了。

首先我们要配置这个插件：

```
const {ModuleFederationPlugin} = require("webpack").container;

exports.federateModule = ({
                              name,
                              filename,
                              exposes,
                              remotes,
                              shared,
                          }) => ({
    plugins: [
        new ModuleFederationPlugin({
            name,
            filename,
            exposes,
            remotes,
            shared,
        }),
    ],
});
```

其中`name`是唯一ID，用于标记当前服务，`filename`是提供给其他服务加载的文件，`exposes`则是需要暴露的模块，`remotes`指定要使用的其它服务，shared则是配置公共模块（比如`lodash`这种）

*   提供了 `exposes` 选项的表示当前应用是一个 `Remote`，`exposes` 内的模块可以被其他的 `Host` 引用，引用方式为`import(${name}/${expose})`。
*   提供了 `remotes` 选项的表示当前应用是一个 `Host`，可以引用 `remote` 中 `expose` 的模块。

我们要在`webpack.config.js`里面配置这两个模块：

```
const componentConfig = {
    App: merge(
        {
            entry: [path.join(__dirname, "src", "bootstrap.js")],
        },
        parts.page({title: 'React Micro-Frontend'}),
        parts.federateModule({
            name: "app",
            remotes: {mf: "mf@/mf.js"},
            shared: sharedDependencies,
        })
    ),
    Header: merge(
        {
            entry: [path.join(__dirname, "src", "Header.js")],
        },
        parts.federateModule({
            name: "mf",
            filename: "mf.js",
            exposes: {"./Header": "./src/Header"},
            shared: sharedDependencies,
        })
    ),
};
```

因为我们为了简化代码把所有代码都写在一个项目里了，更常见的情况是每个模块都可以有属于自己的代码仓库，而且可以使用不同的技术来实现。，这种情况我们处理的方式基本不变，引用远程依赖时记得按照类似[name]@[protocol]://[domain]:[port][filename]的形式去指定`remotes`就好。

那为了模拟多个项目独立编译，我们也是用了组件名来设置不同的配置，这边对于`Header`我们并不想直接在浏览器中运行，而对于`App`我们想要在浏览器中看到完整的页面，所以我们把对页面相关的配置移到对`App`的配置中，这`webpack.config.js`在动态生成配置对象时也需要接受一个组件名作为参数了。

```
const {mode, component} = require('webpack-nano/argv')
  ...
const getConfig = (mode, component) => {
    switch (mode) {
        case 'production':
            return merge([commonConfig, productionConfig, componentConfig[component]])
        case 'development':
            return merge([commonConfig, developmentConfig, componentConfig[component]])
        default:
            throw new Error(`Trying to use an unknown mode, ${mode}`);
    }
}
```

然后我们要在`Main`里修改引入`Header`的路径

```
import Header from "mf/Header";
```

最后是要通过一个引导文件`bootstrap.js`来加载这一切
```
import("./App");
```

这是因为`remote`暴露的js文件需要优先加载，如果`App.js`不是异步的，在`import Header`的时候，会依赖`mf.js`，直接运行可能导致`mf.js`尚未加载完毕，所以会有问题。

![js加载顺序](https://p1-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eb8f20e33eb44da68c97f248f2318586~tplv-k3u1fbpfcp-watermark.image)

通过network面板也可以看出，`mf.js` 是先于 `App.js` 加载的，所以我们的 `App.js` 必须是个异步逻辑。

通过`npm run build -- --component Header`我们先完成对`Header`的编译，然后再通过`npm run start -- --component App`完成项目的运行,打开浏览器，应该可以看到跟之前一样的界面。

## 写在最后

总的来说，这为团队协作代码共享提供了新的方式，同时有一些侵入性，而且我们的项目就得都依赖于`webpack`了。我个人觉得没啥问题，毕竟现在大部分项目都会用到`webpack`，比较介意这一点的同学可以关注下`vite`，`vite`利用浏览器原生的模块化能力来提供代码共享的解决方案。今天我们仅仅用`Module Federation`实现了一个小demo，关于`微前端`跟`webpack的管理`都不是一篇文章就能够说得清楚的，还有很多事情可以聊，咱们后面再分别单独展开讲讲，Happy coding~
