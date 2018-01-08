'use strict'

const PouchDB = require('pouchdb')
const OrbitDocStore = require('orbit-db-docstore')

class PouchIndex {
  constructor (id) {
    this._index = new PouchDB(id)
  }

  updateIndex (oplog) {
    oplog.values.forEach(async (item) => {
      if (item.payload.op === 'PUT') {
        try {
          await this._index.put(item.payload.value)
        } catch (e) {
          // TODO handle update-already-happened
          throw e
        }
      } else if (item.payload.op === 'DEL') {
        try {
          await this._index.remove(item.payload.value)
        } catch (e) {
          // TODO handle update-already-happened
          throw e
        }
      }
    })
  }

  async addIndex (index) {
    await this._index.createIndex({ index })
  }

  async get (id) {
    if (id) {
      let result = await this._index.get(id)
      return result
    } else {
      let result = await this._index.allDocs({
        include_docs: true
      })
      return result.rows.map((row) => {
        return row.doc
      })
    }
  }

  async find (query) {
    let result = await this._index.find(query)
    return result.docs
  }
}

module.exports = class CubeSat extends OrbitDocStore {
  constructor (ipfs, id, address, options = {}) {
    options.Index = PouchIndex
    options.indexBy = '_id'
    super(ipfs, id, address, options)
    this._type = 'cubesat'
  }

  async all () {
    return this._index.get()
  }

  async query (query) {
    await this._index.find(query)
  }

  async get (id) {
    await this._index.get(id)
  }

  async del (doc) {
    super.del(doc._id)
  }

  static get Index () {
    return PouchIndex
  }

  static async create (orbit, address, options = {}) {
    options.type = 'docstore'
    let docstore = await orbit.docstore(address, options)
    await docstore.load()
    Object.assign(options, docstore.options)
    return new CubeSat(orbit._ipfs, docstore.address.path, docstore.address, options)
  }
}
