const bundles = require('./bundles');

(async () => {
  console.log('Compiling and analyzing modern and legacy script bundles...\n');
  await bundles(true);

  console.log('Analysis done, should have opened two tabs in the browser!');
})();
