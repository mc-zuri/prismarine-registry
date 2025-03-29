const bedrock = require('bedrock-protocol')
const { startServerAndWait2 } = require('minecraft-bedrock-server')
const debug = require('debug')('prismarine-registry')
const path = require('path')
const { getPort } = require('../util/getPort')

async function collectPackets (version, names = ['start_game'], cb) {
  const collected = []

  const [port, v6] = [await getPort(), await getPort()]
  console.log('Starting dump server', version, 'on port', port, v6)
  const server = await startServerAndWait2(version, 1000 * 120, {
    'online-mode': false,
    'server-port': port,
    'server-portv6': v6,
    path: path.join(__dirname, `server_bedrock_${version}`)
  })
  console.log('Started dump server', version)

  const client = bedrock.createClient({
    version,
    host: '127.0.0.1',
    port,
    username: 'test',
    offline: true
  })

  let clientConnected = false

  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => reject(new Error(`time out ${version}`)), 18000)

    client.on('join', () => {
      console.log('[client] Client connected')
      clientConnected = true
    })

    for (const name of names) {
      client.on(name, (packet) => {
        cb(name, packet)
        collected.push(packet)

        if (collected.length === names.length) {
          clearTimeout(timeoutId)
          resolve()
        }
      })
    }

    client.on('packet', ({ name }) => debug('[client] -> ', name))
  }).catch((error) => {
    console.error('error', error)
  }).finally(async () => {
    stopServer()
  })

  function stopServer () {
    console.log('Stopping server', version)
    server.kill()
    client.close()
    if (!clientConnected) {
      throw new Error('Client never connected')
    }
  }
}

module.exports = collectPackets
