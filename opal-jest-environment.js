const NodeEnvironment = require('jest-environment-node');

class OpalNodeEnvironment extends NodeEnvironment {
  async setup() {
    require('opal-runtime');
    await super.setup();
  }
}

module.exports = OpalNodeEnvironment;
