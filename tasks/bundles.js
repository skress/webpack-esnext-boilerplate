const md5 = require('md5');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');
const ManifestPlugin = require('webpack-manifest-plugin');
const config = require('./config.json');
const { addAsset, getManifest } = require('./utils/assets');
const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');
const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const configurePlugins = (options) => {
  const plugins = [
    new ForkTsCheckerWebpackPlugin(),

    // Identify each module by a hash, so caching is more predictable.
    new webpack.ids.DeterministicModuleIdsPlugin(),

    // Create manifest of the original filenames to their hashed filenames.
    new ManifestPlugin({
      seed: getManifest(),
      fileName: config.manifestFileName,
      generate: (seed, files) => {
        return files.reduce((manifest, opts) => {
          // Needed until this issue is resolved:
          // https://github.com/danethurber/webpack-manifest-plugin/issues/159
          const name = path.basename(opts.path);
          const unhashedName = name.replace(/[_.-][0-9a-f]{10}/, '');

          addAsset(unhashedName, name);
          return getManifest();
        }, seed);
      },
    }),
  ].concat(options.analyze ? [new BundleAnalyzerPlugin({ analyzerPort: options.legacy ? 8889 : 8888 })] : []);

  return plugins;
};

const babelPresetOptions = (browserlist) => ({
  loose: true,
  modules: false,
  // debug: true,
  corejs: 3,
  useBuiltIns: 'usage',
  targets: {
    browsers: browserlist,
  },
});

const configureBabelLoader = (browserlist, plugins) => {
  return {
    test: /\.jsx?$/,
    use: {
      loader: 'babel-loader',
      options: {
        babelrc: false,
        exclude: [
          /core-js/,
          /regenerator-runtime/,
        ],
        presets: [
          ['@babel/preset-env', babelPresetOptions(browserlist)],
          ['@babel/preset-react', babelPresetOptions(browserlist)],
        ],
        plugins: plugins,
      },
    },
  };
};

const createConfig = (options) => {
  const babelBrowserlist = options.legacy ?
    [
      '> 1%',
      'last 2 versions',
      'IE 10',
      'IE 11',
      'Firefox ESR',
    ] : [
      // The last two versions of each browser, excluding versions
      // that don't support <script type="module">.
      'last 2 Chrome versions', 'not Chrome < 60',
      'last 2 Safari versions', 'not Safari < 10.1',
      'last 2 iOS versions', 'not iOS < 10.3',
      'last 2 Firefox versions', 'not Firefox < 54',
      'last 2 Edge versions', 'not Edge < 15',
    ];

  const babelPlugins = options.legacy ? [
    '@babel/transform-async-to-generator',
    '@babel/transform-arrow-functions',
    '@babel/transform-modules-commonjs',
    '@babel/plugin-proposal-class-properties'
  ] : ['@babel/plugin-syntax-dynamic-import'];

  const mode = process.env.NODE_ENV || 'development';

  return ({
    mode: mode,
    //cache: {},
    devtool: 'source-map',
    optimization: {
      minimizer: (mode == 'development') ? [] : [new TerserPlugin({
        test: /\.m?js(\?.*)?$/i,
        sourceMap: true,
        terserOptions: {
          safari10: true,
        },
      })],
    },
    entry: options.legacy ? {
      'nomodule': './app/scripts/nomodule.ts',
    } : {
        'main': './app/scripts/main.ts',
      },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    },
    output: {
      path: path.resolve(__dirname, '..', config.publicDir),
      publicPath: '/',
      filename: options.legacy ? '[name]-[chunkhash:10].es5.js' : '[name]-[chunkhash:10].js',
      environment: options.legacy ? {
        "arrowFunction": false,
        "bigIntLiteral": false,
        "const": false,
        "destructuring": false,
        "forOf": false,
        "dynamicImport": false,
        "module": false
      } : {
        "arrowFunction": true,
          "bigIntLiteral": true,
          "const": true,
          "destructuring": true,
          "forOf": true,
          "dynamicImport": true,
          "module": true
        }
    },
    plugins: configurePlugins(options),
    module: {
      rules: [
        {
          test: /\.css$/,
          use: [
            'style-loader',
            'css-loader'
          ]
        },
        configureBabelLoader(babelBrowserlist, babelPlugins),
        {
          test: /\.tsx?$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
          options: {
            // disable type checker - we will use it in fork plugin
            transpileOnly: true,
            configFile: options.legacy ? 'tsconfig.es5.json' : 'tsconfig.json'
          }
        }
      ],
    },
  })
}

const createCompiler = (config) => {
  const compiler = webpack(config);
  return () => {
    return new Promise((resolve, reject) => {
      compiler.run((err, stats) => {
        if (err) return reject(err);
        console.log(stats.toString({ colors: true }) + '\n');
        resolve();
      });
    });
  };
};

const compileModernBundle = (runAnalyzer) => createCompiler(createConfig({ analyze: runAnalyzer, legacy: false }));
const compileLegacyBundle = (runAnalyzer) => createCompiler(createConfig({ analyze: runAnalyzer, legacy: true }));

module.exports = async (runAnalyzer) => {
  await compileModernBundle(runAnalyzer)();
  await compileLegacyBundle(runAnalyzer)();
};
