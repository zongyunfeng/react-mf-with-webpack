const {mode, component} = require('webpack-nano/argv')
const {MiniHtmlWebpackPlugin} = require('mini-html-webpack-plugin')
const parts = require('./webpack.parts')
const {merge} = require('webpack-merge')
const path = require("path");
const {ModuleFederationPlugin} = require("webpack").container;

const sharedDependencies = {
    react: {singleton: true},
    "react-dom": {singleton: true},
};

const commonConfig = merge([
    {
        mode,
        output: {
            publicPath: "/",
            // clean: true
        },
    },
    parts.loadJavaScript()
])

const productionConfig = merge([])

const developmentConfig = merge(component === 'App' ? [
    {entry: ["webpack-plugin-serve/client"]},
    parts.devServer()
] : [])

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

if (!component) throw new Error("Missing component name");

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

module.exports = getConfig(mode, component)
