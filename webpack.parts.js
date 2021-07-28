const {WebpackPluginServe} = require('webpack-plugin-serve')
const {MiniHtmlWebpackPlugin} = require('mini-html-webpack-plugin')
const MiniCssExtractPlugin = require('mini-css-extract-plugin')
const Process = require("process");

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

exports.page = ({title}) => ({
    plugins: [new MiniHtmlWebpackPlugin({
        context: {title}
    })]
})

exports.loadCss = () => ({
    module: {
        rules: [{
            test: /\.css$/,
            use: ['style-loader', 'css-loader']
        }]
    }
})

exports.extractCss = ({options = {}, loaders = []} = {}) => {
    return {
        module: {
            rules: [{
                test: /\.css$/,
                sideEffects: true,
                use: [{loader: MiniCssExtractPlugin.loader, options}, 'css-loader'].concat(loaders)
            }]
        },
        plugins: [new MiniCssExtractPlugin({filename: "[name].css"})]
    }
}

const path = require('path')
const glob = require('glob')
const PurgeCSSPlugin = require('purgecss-webpack-plugin')
const ALL_FILES = glob.sync(path.join(__dirname, "src/*.js"))

exports.eliminateUnusedCss = () => ({
    plugins: [
        new PurgeCSSPlugin({
            paths: ALL_FILES,
            extractors: [{
                extractor: (content) => content.match(/[^<>"'`\s]*[^<>"'`\s:]/g) || [],
                extensions: ['html']
            }]
        })
    ]
})

exports.autoPrefix = () => ({
    loader: 'postcss-loader',
    options: {
        postcssOptions: {
            plugins: [require('autoprefixer')()]
        }
    }
})

exports.loadImages = ({limit} = {}) => ({
    module: {
        rules: [{
            test: /\.(jpg|png)$/,
            type: 'asset',
            parser: {dataUrlCondition: {maxSize: limit}}
        }]
    }
})

const APP_SOURCE = path.join(__dirname, "src");

exports.loadJavaScript = () => ({
    module: {
        rules: [
            { test: /\.js$/, include: APP_SOURCE, use: "babel-loader" },
        ],
    },
});

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
