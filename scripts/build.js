// @ts-nocheck
// eslint-disable require-jsdoc

const { exec } = require('child_process');
const fs = require('fs');
const minifyHtml = require('html-minifier').minify;

const outputDirName = process.argv[2];

// console.log('Client Files', CLIENT_FILES);

const execAsync = async (command) => {
  return new Promise((resolve, reject) => {
    console.log(command);
    exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err, stderr);
        return;
      }
      resolve(stdout);
    });
  });
};

var Terser = require('terser');
var path = require('path');

// eslint-disable-next-line require-jsdoc, jsdoc/require-jsdoc
function getAllFiles(dirPath, arrayOfFiles) {
  let files = fs.readdirSync(dirPath);

  arrayOfFiles = arrayOfFiles || [];

  files.forEach(function (file) {
    if (fs.statSync(dirPath + '/' + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
    } else {
      arrayOfFiles.push(path.join(dirPath, '/', file));
    }
  });

  return arrayOfFiles.filter((path) => path.match(/\.js$/));
}

// eslint-disable-next-line require-jsdoc, jsdoc/require-jsdoc
async function minifyFiles(filePaths, options) {
  console.log('minifyfiles', filePaths);

  return filePaths.map(async (filePath) => {
    try {
      fs.writeFileSync(
        filePath,
        (
          await Terser.minify(fs.readFileSync(filePath, 'utf8').toString(), {
            module: true,
            compress: options,
          })
        ).code
      );
    } catch (e) {
      console.error('Error minifying', filePath, e);
      return e;
    }
  });
}

const build = async () => {
  console.log('Concat files...');

  let htmlFile = fs.readFileSync(`${__dirname}/../index.html`).toString();

  await execAsync(
    `mkdir -p ${__dirname}/../dist/res/ && cp -r ${__dirname}/../res/* ${__dirname}/../dist/res/ || :`
  );
  await execAsync(
    `mkdir -p ${__dirname}/../dist/src/ && cp -r ${__dirname}/../src/* ${__dirname}/../dist/src/ || :`
  );

  const terserArgs = [
    // 'passes=3',
    // 'pure_getters',
    // 'unsafe',
    // 'unsafe_math',
    // 'hoist_funs',
    // 'toplevel',
    // // 'drop_console',
    // 'pure_funcs=[console.error,console.info,console.log,console.debug,console.warn]',
    // 'ecma=9',
  ];

  const terserOptions = {
    passes: 3,
    pure_getters: true,
    unsafe: true,
    unsafe_math: true,
    hoist_funs: true,
    toplevel: true,
    ecma: 9,
    drop_console: true,
  };

  console.log('\nMinify code...');
  const files = getAllFiles(path.resolve(__dirname + '/../dist/src'));
  try {
    await minifyFiles(files, terserOptions);
  } catch (e) {
    console.error('Error during minify', e);
    return;
  }

  // await execAsync(
  //   `${__dirname}/../node_modules/.bin/terser --compress ${terserArgs.join(
  //     ','
  //   )} --mangle --module --ecma 2020 -- ${__dirname}/../dist/main.js`
  // );
  // await execAsync('uglifycss --output public/style.css .build/style.tmp.css');
  console.log('\nMinify html...');
  fs.writeFileSync(
    path.resolve(__dirname + '/../dist/index.html'),
    minifyHtml(htmlFile, {
      removeAttributeQuotes: true,
      collapseWhitespace: true,
      html5: true,
      minifyCSS: true,
      minifyJS: true,
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeTagWhitespace: true,
      removeComments: true,
      useShortDoctype: true,
    })
  );
  console.log('wrote', path.resolve(__dirname + '/../dist/index.html'));

  // console.log('\ncreateElement & error chicanery...');
  // let minifiedFile = String(
  //   fs.readFileSync(`${__dirname}/../.build/main.js`, {
  //     encoding: 'utf8',
  //     flag: 'r',
  //   })
  // );
  // minifiedFile = minifiedFile.replace(
  //   /document.createElement/g,
  //   '93848257287582858283'
  // );
  // minifiedFile = minifiedFile.replace(/createElement/g, 'ce');
  // minifiedFile = minifiedFile.replace(
  //   /93848257287582858283/g,
  //   'document.createElement'
  // );
  // minifiedFile = minifiedFile.replace(/Error\((.*?)\)/g, 'Error("")');
  // fs.writeFileSync(`${__dirname}/../.build/main.js`, minifiedFile);

  // await execAsync(
  //   `mkdir -p dist && cp .build/index.html dist && cp .build/main.js dist && cp .build/packed.png dist`
  // );

  console.log('\nZip (command line)...');
  try {
    await execAsync(
      `cd dist && zip -9 ${__dirname}/../cargo-field.zip index.html src/*.js res/*.png`
    );
    console.log(
      await execAsync(`stat -c '%n %s' ${__dirname}/../cargo-field.zip`)
    );
  } catch (e) {
    console.log('failed zip', e);
  }
  try {
    await execAsync(`advzip -z -4 ${__dirname}/../cargo-field.zip`);
    console.log(
      await execAsync(`stat -c '%n %s' ${__dirname}/../cargo-field.zip`)
    );
  } catch (e) {
    console.log('failed adv zip', e);
  }
  try {
    const result = await execAsync(
      `stat -c '%n %s' ${__dirname}/../cargo-field.zip`
    );
    const bytes = parseInt(result.split(' ')[1]);
    const kb13 = 13312;
    console.log(
      `${bytes}b of ${kb13}b (${((bytes * 100) / kb13).toFixed(2)}%)`
    );
  } catch (e) {
    console.log('Stat not supported on Mac D:');
  }
  // await execAsync(`mv shipmint.zip dist/shipmint.zip`);
};

build().catch((e) => {
  console.log('Build error', e);
});
