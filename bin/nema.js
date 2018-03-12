/* for developing
require("child_process").spawnSync("npm.cmd", ["run", "build"], {
  cwd: process.cwd(),
  env: process.env,
  shell: true,
  stdio: 'inherit'
});
/**/

require("../dist/src/nema.js");
