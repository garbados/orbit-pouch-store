const assert = require('assert')
const CubeSat = require('.')
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')

let ipfs = new IPFS({ EXPERIMENTAL: { pubsub: true } })
ipfs.on('ready', async (t) => {
  let orbit = new OrbitDB(ipfs, 'test')
  let cube = await CubeSat.create(orbit, 'test')
  assert(cube, 'Something went wrong?')
  await orbit.stop()
  await ipfs.stop()
  process.exit(0)
})
