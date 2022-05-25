const webpack = require('webpack');
const path = require('path');
const fs = require('fs');

const nodeModules = {};
fs.readdirSync('node_modules')
    .filter(function(x) {
        return ['.bin'].indexOf(x) === -1;
    })
    .forEach(function(mod) {
        nodeModules[mod] = 'commonjs ' + mod;
    });

module.exports = {
    // entry: './src/main.ts',
    entry: {
        main: './src/main.ts',
        genesis: './src/genesis.js',
    },
    target: 'node',
    output: {
        path: path.join(__dirname, 'build'),
        filename: '[name].js'
    },
    externals: nodeModules,
    plugins: [
        new webpack.IgnorePlugin({resourceRegExp: /\.(css|less)$/}),
    ],
    // devtool: 'source-map'
}