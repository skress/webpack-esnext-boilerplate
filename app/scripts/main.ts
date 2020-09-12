import {dep1} from './dep-1';
import {dep2} from './dep-2';
import habitat from "preact-habitat";
import Widget from "./components/hello-world";

const main = async () => {
  console.log('Dependency 1 value:', dep1);
  console.log('Dependency 2 value:', dep2);

  const {import1} = await import(
      /* webpackChunkName: "import1" */
      './import-1');
  console.log('Dynamic Import 1 value:', import1);

  const {import2} = await import(
      /* webpackChunkName: "import2" */
      './import-2');
  console.log('Dynamic Import 2 value:', import2);

  console.log('Fetching data, awaiting response...');
  const response = await fetch('https://httpbin.org/user-agent');
  const responseText = await response.text();

  console.log('Response:', responseText);
};

main();

const _habitat = habitat(Widget);

_habitat.render({
  selector: '[data-widget-host="habitat"]',
  clean: true
});