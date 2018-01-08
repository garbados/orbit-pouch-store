const CubeSat = require('.')
const IPFS = require('ipfs')
const OrbitDB = require('orbit-db')
const tap = require('tap')

let ipfs = new IPFS({
  start: false,
  EXPERIMENTAL: { pubsub: true }
})
ipfs.on('ready', async () => {
  let orbit = new OrbitDB(ipfs, 'test')
  let cube = await CubeSat.create(orbit, 'test')
  await cube.load()
  tap.ok(cube, 'cubesat ok')
  let all = await cube.all()
  tap.equal(all.length, 0, 'cubesat empty')
  await ipfs.stop()
  await orbit.stop()
  await cube.close()
  await cube.drop()
  tap.end()
  process.exit(0) // FIXME: cannot report coverage this way
})
