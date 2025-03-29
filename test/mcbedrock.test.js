/* eslint-env mocha */

const SUPPORTED_VERSIONS = ['1.21.70', '1.17.10', '1.18.0', '1.18.11', '1.18.30']
const test = require('./mcbedrock')

describe('mcbedrock', function () {
  this.timeout(18000 * 10)

  for (const version of SUPPORTED_VERSIONS) {
    it('works on ' + version, async () => {
      await test(version)
      await new Promise(resolve => setTimeout(resolve, 100))
    })
  }
})
