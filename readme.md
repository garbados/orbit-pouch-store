# CubeSat

[![stability](https://img.shields.io/badge/stability-experimental-orange.svg?style=flat-square)](https://nodejs.org/api/documentation.html#documentation_stability_index)
[![npm version](https://img.shields.io/npm/v/@garbados/cubesat.svg?style=flat-square)](https://www.npmjs.com/package/cubesat)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](https://github.com/feross/standard)
<!-- [![build status](https://img.shields.io/travis/garbados/cubesat/master.svg?style=flat-square)](https://travis-ci.org/garbados/cubesat) -->
<!-- [![test coverage](https://img.shields.io/coveralls/github/garbados/cubesat/master.svg?style=flat-square)](https://coveralls.io/github/garbados/cubesat) -->
<!-- [![greenkeeper](https://badges.greenkeeper.io/garbados/cubesat.svg)](https://greenkeeper.io/) -->

An [OrbitDB](https://github.com/orbitdb/orbit-db) store that uses [PouchDB](https://pouchdb.com/) for indexing, allowing you to perform flexible [mango](https://pouchdb.com/guides/mango-queries.html) queries. It is based on [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore).

## Install

Install using [npm](https://www.npmjs.com):

```
npm i -S @garbados/cubesat
```

## Usage

Because CubeSat is not a core part of OrbitDB, you have to invoke it a little differently than other stores:

```
let name = 'test'
let ipfs = new IPFS({ EXPERIMENTAL: { pubsub: true } })
ipfs.on('ready', async (t) => {
  let orbit = new OrbitDB(ipfs, name)
  let cube = await CubeSat.create(orbit, name)
  assert(cube, 'Something went wrong?')
  await orbit.stop()
  await ipfs.stop()
  process.exit(0)
})
```

Once you have your cube ready to go, you can access these methods:

### `cube.all() -> Promise`

Returns all documents in the database:

```
await cube.all()
> [{ _id: '...', _rev: '...' }, ...]
```

### `cube.find(query) -> Promise<Array[Object]>`

Returns all documents that match the given [mango](https://pouchdb.com/api.html#query_index) query.

```
await cube.find({
  selector: {
    name: 'Mario'
  }
})
> [{ _id: '...', name: 'Mario'}, ...]
```

### `cube.query(query, options) -> Promise<Array[Object]>`

Returns all documents that match the given [map/reduce query](https://pouchdb.com/api.html#query_database).

```
await cube.query(function (doc) {
  if (doc.name === 'Luigi') {
    emit(doc._id)
  }
}.toString())
> [{ _id: '...', name: 'Luigi'}, ...]
```

### `cube.get(id) -> Promise<Object>`

Returns the document with the given ID:

```
await cube.get('secret-recipe')
> { ingredients: [...] }
```

### `cube.del(doc) -> Promise`

Deletes the given document from the database.

```
await cube.del({ _id: '...', _rev: '...', name: 'Mario' })
```

### `cube.put(doc) -> Promise`

Same as in [orbit-db-docstore](https://github.com/orbitdb/orbit-db-docstore):

```
db.put({ _id: 'QmAwesomeIpfsHash', name: 'shamb0t', followers: 500 }).then((hash) => ...)
```

## Contributing

This library is experimental. All contributions are welcome: bug reports, feature requests, "why doesn't this work" questions, pull requests for fixes and features, etc. For all of the above, [file an issue](https://github.com/garbados/cubesat/issues) or [submit a pull request](https://github.com/garbados/cubesat/pulls).

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)
